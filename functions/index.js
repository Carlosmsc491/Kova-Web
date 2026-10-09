const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");

admin.initializeApp();

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

// Sonnet 5.5: half the price of Opus ($2/$10 per MTok) and plenty for this.
const MODEL = "claude-sonnet-5-5";
// On a policy decline the API re-runs the request on a fallback model it
// picks by refusal category, inside the same call.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

// ── Request limits ───────────────────────────────────────────────────────────
// Every call costs money, so callers must be signed in and payloads are capped.
const MAX_MESSAGE_CHARS  = 4000;
const MAX_HISTORY_TURNS  = 30;
const MAX_TURN_CHARS     = 8000;
const MAX_SNAPSHOT_BYTES = 200_000;

function requireUser(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");
  return uid;
}

// The AI costs money per call, and anyone can create a Firebase account, so
// only the owner (OWNER_UIDS in functions/.env) and members of the owner's
// household may use it. Members are added only by joinHousehold.
const allowedCache = new Map();
async function isAllowed(uid) {
  const owners = (process.env.OWNER_UIDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (owners.includes(uid)) return true;
  if (allowedCache.has(uid)) return allowedCache.get(uid);
  const q = await admin.firestore().collection("households")
    .where("member_uids", "array-contains", uid).limit(5).get();
  const ok = q.docs.some((d) => owners.includes(d.data().owner_uid));
  allowedCache.set(uid, ok);
  return ok;
}
const ownerUids = () => (process.env.OWNER_UIDS || "").split(",").map((x) => x.trim()).filter(Boolean);
function requireOwner(request) {
  const uid = requireUser(request);
  if (!ownerUids().includes(uid)) throw new HttpsError("permission-denied", "Only the owner can do this.");
  return uid;
}
async function requireAllowedUser(request) {
  const uid = requireUser(request);
  if (!(await isAllowed(uid))) throw new HttpsError("permission-denied", "This account can't use Kova AI.");
  return uid;
}

function checkSnapshot(snapshot) {
  if (snapshot == null) return;
  if (typeof snapshot !== "object" || JSON.stringify(snapshot).length > MAX_SNAPSHOT_BYTES) {
    throw new HttpsError("invalid-argument", "snapshot is too large.");
  }
}

function textOf(message) {
  return message.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

const PLAN_RULES = `**Card payoff plan (card_payment_plan) and cash flow (cash_flow_next_60_days):**
The user pays for everything with credit cards, so they want checking drained as low as the reserve allows and every spare dollar sent to cards. cash_flow_next_60_days is the day-by-day projection WITHOUT extra card payments (balance_after = end-of-day checking). card_payment_plan is a deterministic calculation: each payment keeps projected checking >= reserve_kept_in_checking on every day of the next 60 days, after bills, paychecks and card minimums. Its safe_to_pay_today total is a hard ceiling — never recommend paying more than that today.
- If balances_last_updated_days_ago >= 1, a paycheck is not confirmed, or items are overdue_not_marked_paid, say so: those make today's number unreliable.
- The order across cards is yours to judge: highest APR first is the default, but a card near its limit (high utilization hurts the credit score) or a due date can justify a different split.`;

// ═════════════════════════════════════════════════════════════════════════════
// Chat
// ═════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are Kova, a personal financial assistant embedded in the user's finance app. You have read AND write access to their data.

**Data you can read (in <financial_context>):**
- Bank account balances
- Income source: one biweekly job (the user has no second job), with last_paid_date and next_payment_date.
- Fixed expenses (personal AND household/shared)
- Credit cards (balance, limit, APR, minimum, due day, utilization)
- Savings goals and progress
- The 60-day cash flow and the card payoff plan

**Actions you can take (use tools):**
- Mark an expense as paid this cycle / unmark it
- Update an account balance
- Record a credit card payment (reduces the card, and the bank account it was paid from)
- Update a credit card's balance (new charges)
- Record that the paycheck arrived
- Add a contribution to a savings goal
- Create a new expense (recurring bill or installment/loan)

When the user asks you to do something ("mark X as paid", "update my Chase balance to $X", "I paid $X to BofA", "my paycheck came in", "add $X to my emergency fund", "add my gym $30 every month on the 5th"), USE THE APPROPRIATE TOOL immediately — don't ask for confirmation unless the action is ambiguous. When the user says they paid a card, ask which account it came from only if there is more than one account and it isn't obvious.

For add_expense: if the user doesn't give a date, ask for it before creating. Check the existing expenses first — don't create a duplicate. Call add_expense once per expense.

${PLAN_RULES}

**Notifications (Telegram):** Kova has a Telegram bot, @kova_carlos_bot, for the owner only. Once connected (app → Settings → Connect Telegram → tap Start), it sends a summary every morning at 9 a.m. (on paydays: the paycheck is added to the deposit account and it says what to pay with it) and a payment reminder at 6 p.m. with what's due today or overdue and unpaid, what's due tomorrow, and card minimums due in 3 days — each due item has a "Ya lo pagué" button that records the payment. The user can also chat with you there. You can't send messages on your own or change the reminder times; if they ask about reminders, explain this and, if needed, how to connect or turn the summary off (/stop in the bot).

**Key rules:**
1. Use my_share (not the full amount) for household expenses unless asked otherwise.
2. Exclude paid_this_cycle expenses from what-I-still-owe calculations.
3. Be specific with names, amounts and dates.

**FORMATTING — follow strictly:**
- NEVER use markdown tables. No pipes (|), no dashes as separators.
- NEVER use horizontal rules (--- or ***).
- Bullet points (-) or numbered lists only.
- Amounts inline: "Rent: $1,350" not in columns.
- Mobile chat: 3–6 bullets max unless the user asks for detail.
- Emojis sparingly (one per section max).

Always respond in the same language the user uses (English or Spanish). Be honest — if money is tight, say so.`;

const TOOLS = [
  {
    name: "mark_expense_paid",
    description: "Record a payment of a bill (its next unpaid due date). The money comes out of a bank account, goes onto a credit card (the user often pays bills with credit cards), or 'none' if their balances already reflect it. Ask what they paid with if it isn't clear.",
    input_schema: {
      type: "object",
      properties: {
        expense_id:   { type: "string", description: "The id field of the expense from the financial context" },
        expense_name: { type: "string", description: "Human-readable name of the expense" },
        amount:       { type: "number", description: "What the user paid: amount for personal expenses, my_share for household ones, the monthly payment for installments." },
        paid_with:    { type: "string", enum: ["account", "card", "none"], description: "account = bank account (balance goes down), card = charged to a credit card (card balance goes up), none = balances already reflect it" },
        source_id:    { type: "string", description: "id of the account or card it was paid with (omit for none)" },
      },
      required: ["expense_id", "expense_name", "amount", "paid_with"],
    },
  },
  {
    name: "unmark_expense_paid",
    description: "Undo the latest recorded payment of a bill: the money goes back to the account/card and the due date shows as unpaid again.",
    input_schema: {
      type: "object",
      properties: { expense_id: { type: "string" }, expense_name: { type: "string" } },
      required: ["expense_id", "expense_name"],
    },
  },
  {
    name: "update_account_balance",
    description: "Set the current balance of a bank/savings account. Use when the user tells you their balance.",
    input_schema: {
      type: "object",
      properties: {
        account_id:   { type: "string", description: "The id field of the account" },
        account_name: { type: "string" },
        new_balance:  { type: "number", description: "New balance in dollars" },
      },
      required: ["account_id", "account_name", "new_balance"],
    },
  },
  {
    name: "pay_credit_card",
    description: "Record a payment to a credit card: reduces the card balance and, if from_account_id is given, the bank account it was paid from.",
    input_schema: {
      type: "object",
      properties: {
        card_id:         { type: "string", description: "The id field of the credit card" },
        card_name:       { type: "string" },
        payment_amount:  { type: "number", description: "Amount paid in dollars" },
        from_account_id: { type: "string", description: "Bank account the money came from. Omit if the user's bank balance was already updated separately." },
      },
      required: ["card_id", "card_name", "payment_amount"],
    },
  },
  {
    name: "update_card_balance",
    description: "Set a credit card's current balance (e.g. after new charges). Not for payments — use pay_credit_card for those.",
    input_schema: {
      type: "object",
      properties: {
        card_id:     { type: "string" },
        card_name:   { type: "string" },
        new_balance: { type: "number", description: "New balance owed in dollars" },
      },
      required: ["card_id", "card_name", "new_balance"],
    },
  },
  {
    name: "record_paycheck",
    description: "Record that the biweekly paycheck arrived today. Adds it to to_account_id unless the user already updated that balance.",
    input_schema: {
      type: "object",
      properties: {
        income_source_id: { type: "string", description: "The id of the income source" },
        to_account_id:    { type: "string", description: "Account it was deposited to. Omit if the balance already includes it." },
      },
      required: ["income_source_id"],
    },
  },
  {
    name: "add_goal_contribution",
    description: "Add money to a savings goal. Use when the user says they saved or contributed to a goal.",
    input_schema: {
      type: "object",
      properties: {
        goal_id:   { type: "string", description: "The id field of the goal" },
        goal_name: { type: "string" },
        amount:    { type: "number", description: "Amount contributed in dollars" },
      },
      required: ["goal_id", "goal_name", "amount"],
    },
  },
  {
    name: "add_expense",
    description: "Create a new expense. Use expense_type 'recurring' for bills (rent, gas, food, subscriptions) and 'installment' for loans/financing paid monthly until a total balance is paid off.",
    input_schema: {
      type: "object",
      properties: {
        name:             { type: "string", description: "Expense name, e.g. 'Gym', 'Car loan'" },
        amount:           { type: "number", description: "Amount per occurrence in dollars (the monthly payment for installments)" },
        expense_type:     { type: "string", enum: ["recurring", "installment"] },
        due_type:         { type: "string", enum: ["monthly", "weekly", "biweekly", "one-time"], description: "How often it repeats. Installments are always monthly." },
        due_date:         { type: "string", description: "A date it's due, YYYY-MM-DD. For monthly the day-of-month is used, for weekly the weekday, for biweekly the first due date, for one-time the exact date." },
        category:         { type: "string", enum: ["rent", "car", "utilities", "insurance", "phone", "wifi", "other"] },
        is_household:     { type: "boolean", description: "True if it's a shared household expense split with others" },
        original_balance: { type: "number", description: "Installments only: total amount still owed on the loan" },
        notes:            { type: "string" },
      },
      required: ["name", "amount", "expense_type", "due_type", "due_date"],
    },
  },
];

const round2 = (n) => Math.round(n * 100) / 100;

async function executeTool(name, input, uid, today) {
  // Same due-date logic as the app (copied in by scripts/sync-shared.cjs).
  const { firstUnpaidOccurrence } = await import("./shared/dateUtils.js");
  const db     = admin.firestore();
  const userDb = (col) => db.collection("users").doc(uid).collection(col);
  const now    = admin.firestore.FieldValue.serverTimestamp();

  // Reads must precede writes inside a transaction.
  const readAccount = async (tx, accountId) => {
    if (!accountId) return null;
    const ref  = userDb("accounts").doc(accountId);
    const snap = await tx.get(ref);
    return snap.exists ? { ref, data: snap.data() } : null;
  };
  const addToAccount = (tx, acct, delta) => {
    if (!acct) return null;
    const bal = round2((acct.data.current_balance ?? 0) + delta);
    tx.update(acct.ref, { current_balance: bal, updated_at: now });
    return bal;
  };

  // Payments go through the same /payments ledger as the app
  // (src/services/firestoreService.js → paymentService), so the user can
  // undo them from Recent activity.
  const writeRecord = (tx, rec, historyText) => {
    const ref = userDb("payments").doc();
    tx.set(ref, { ...rec, date: today, auto: false, undone: false, via_ai: true, created_at: now });
    tx.set(userDb("history").doc(), {
      type: `payment_${rec.kind}`, description: historyText, amount: rec.amount,
      meta: { payment_id: ref.id }, date: today, created_at: now,
    });
  };
  const readCard = async (tx, cardId) => {
    if (!cardId) return null;
    const ref = userDb("credit_cards").doc(cardId);
    const snap = await tx.get(ref);
    return snap.exists ? { ref, data: snap.data() } : null;
  };
  const chargeCard = (tx, card, delta) => {
    if (!card) return;
    const bal = Math.max(0, round2((card.data.current_balance ?? 0) + delta));
    tx.update(card.ref, { current_balance: bal, available_credit: (card.data.credit_limit ?? 0) - bal, updated_at: now });
  };

  if (name === "mark_expense_paid") {
    if (!(input.amount > 0)) return { success: false, message: "amount must be greater than zero." };
    const ref = userDb("fixed_expenses").doc(input.expense_id);
    const r = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("expense not found");
      const exp  = snap.data();
      const acct = input.paid_with === "account" ? await readAccount(tx, input.source_id) : null;
      const card = input.paid_with === "card" ? await readCard(tx, input.source_id) : null;
      const due  = firstUnpaidOccurrence(exp, today);
      const isLoan = exp.expense_type === "installment";
      const remaining = isLoan ? Math.max(0, round2((exp.remaining_balance ?? exp.original_balance ?? 0) - input.amount)) : null;
      addToAccount(tx, acct, -input.amount);
      chargeCard(tx, card, input.amount);
      const sourceType = acct ? "account" : card ? "card" : "none";
      tx.update(ref, {
        paid_through: due, last_paid_date: today,
        default_pay_source: { type: sourceType, id: acct || card ? input.source_id : null },
        ...(isLoan ? { remaining_balance: remaining, ...(remaining <= 0 ? { completed_at: today } : {}) } : {}),
        updated_at: now,
      });
      const src = acct || card;
      writeRecord(tx, {
        kind: "expense", target_id: input.expense_id, target_name: exp.name, amount: input.amount,
        source_type: sourceType, source_id: src ? input.source_id : null, source_name: src?.data.name ?? null,
        due_date: due,
        prev: {
          paid_through: exp.paid_through ?? null, last_paid_date: exp.last_paid_date ?? null,
          ...(isLoan ? { remaining_balance: exp.remaining_balance ?? null, completed_at: exp.completed_at ?? null } : {}),
        },
      }, `Paid ${exp.name}${src ? ` with ${src.data.name}` : ""} (via Kova AI)`);
      return { due, src };
    });
    return { success: true, message: `${input.expense_name}: $${input.amount} recorded for the ${r.due} due date${r.src ? ` (${input.paid_with === "card" ? "charged to" : "from"} ${r.src.data.name})` : ""}.` };
  }

  if (name === "unmark_expense_paid") {
    // Single-field filter only (no composite index needed); newest first in memory.
    const forExpense = await userDb("payments").where("target_id", "==", input.expense_id).get();
    const latest = forExpense.docs
      .filter((d) => !d.data().undone)
      .sort((a, b) => (b.data().created_at?.toMillis?.() ?? 0) - (a.data().created_at?.toMillis?.() ?? 0));
    const ref = userDb("fixed_expenses").doc(input.expense_id);
    if (latest.length === 0) {
      // Paid mark from before the ledger existed: nothing to refund.
      await ref.update({ last_paid_date: null, paid_through: null, updated_at: now });
      return { success: true, message: `${input.expense_name} now shows as unpaid.` };
    }
    const pRef = latest[0].ref;
    await db.runTransaction(async (tx) => {
      const p = (await tx.get(pRef)).data();
      const exp = (await tx.get(ref)).data() || {};
      const acct = p.source_type === "account" ? await readAccount(tx, p.source_id) : null;
      const card = p.source_type === "card" ? await readCard(tx, p.source_id) : null;
      addToAccount(tx, acct, p.amount);
      chargeCard(tx, card, -p.amount);
      const patch = { updated_at: now };
      if (exp.paid_through === p.due_date) { patch.paid_through = p.prev.paid_through; patch.last_paid_date = p.prev.last_paid_date; }
      if ("remaining_balance" in p.prev) {
        patch.remaining_balance = round2((exp.remaining_balance ?? 0) + p.amount);
        patch.completed_at = p.prev.completed_at ?? admin.firestore.FieldValue.delete();
      }
      tx.update(ref, patch);
      tx.update(pRef, { undone: true, undone_at: now });
    });
    return { success: true, message: `Undid the last ${input.expense_name} payment; the money is back.` };
  }

  if (name === "update_account_balance") {
    await userDb("accounts").doc(input.account_id).update({ current_balance: input.new_balance, updated_at: now });
    return { success: true, message: `${input.account_name} balance updated to $${input.new_balance}.` };
  }

  // Transactions re-read inside the attempt instead of trusting values the
  // model saw in its (possibly stale) snapshot.
  if (name === "pay_credit_card") {
    if (!(input.payment_amount > 0)) return { success: false, message: "payment_amount must be greater than zero." };
    const ref = userDb("credit_cards").doc(input.card_id);
    const r = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("card not found");
      const card = snap.data();
      const acct = await readAccount(tx, input.from_account_id);
      const newBalance = Math.max(0, round2((card.current_balance ?? 0) - input.payment_amount));
      const coversMin = input.payment_amount >= (card.minimum_payment ?? 0) || newBalance === 0;
      const due = coversMin && card.payment_due_date
        ? firstUnpaidOccurrence({ ...card, due_type: "monthly", due_day: card.payment_due_date }, today)
        : card.paid_through ?? null;
      tx.update(ref, { current_balance: newBalance, available_credit: (card.credit_limit ?? 0) - newBalance, last_paid_date: today, paid_through: due, updated_at: now });
      const bal = addToAccount(tx, acct, -input.payment_amount);
      writeRecord(tx, {
        kind: "card", target_id: input.card_id, target_name: card.name, amount: input.payment_amount,
        source_type: acct ? "account" : "none", source_id: acct ? input.from_account_id : null, source_name: acct?.data.name ?? null,
        due_date: due,
        prev: { current_balance: card.current_balance ?? 0, paid_through: card.paid_through ?? null, last_paid_date: card.last_paid_date ?? null },
      }, `Paid ${card.name}${acct ? ` from ${acct.data.name}` : ""} (via Kova AI)`);
      return { newBalance, acct, bal };
    });
    return { success: true, message: `${input.card_name}: paid $${input.payment_amount}. New card balance: $${r.newBalance}.${r.acct ? ` ${r.acct.data.name} is now $${r.bal}.` : ""}` };
  }

  if (name === "update_card_balance") {
    const ref = userDb("credit_cards").doc(input.card_id);
    await db.runTransaction(async (tx) => {
      const card = (await tx.get(ref)).data() || {};
      tx.update(ref, { current_balance: input.new_balance, available_credit: (card.credit_limit ?? 0) - input.new_balance, updated_at: now });
    });
    return { success: true, message: `${input.card_name} balance set to $${input.new_balance}.` };
  }

  if (name === "record_paycheck") {
    const ref = userDb("income_sources").doc(input.income_source_id);
    const r = await db.runTransaction(async (tx) => {
      const src  = (await tx.get(ref)).data() || {};
      if (src.last_paycheck_date && src.last_paycheck_date >= today) return { already: true };
      const acct = await readAccount(tx, input.to_account_id);
      const amount = Number(src.amount_per_period) || 0;
      const bal  = addToAccount(tx, acct, amount);
      tx.update(ref, { last_paycheck_date: today, updated_at: now });
      writeRecord(tx, {
        kind: "paycheck", target_id: input.income_source_id, target_name: src.name || "Paycheck", amount,
        source_type: acct ? "account" : "none", source_id: acct ? input.to_account_id : null, source_name: acct?.data.name ?? null,
        due_date: today, prev: { last_paycheck_date: src.last_paycheck_date ?? null },
      }, `Paycheck ${today}${acct ? ` added to ${acct.data.name}` : ""} (via Kova AI)`);
      return { acct, bal, amount };
    });
    if (r.already) return { success: true, message: "Today's paycheck was already recorded." };
    return { success: true, message: `Paycheck recorded for ${today}.${r.acct ? ` $${r.amount} added to ${r.acct.data.name} (now $${r.bal}).` : ""}` };
  }

  if (name === "add_goal_contribution") {
    const ref = userDb("goals").doc(input.goal_id);
    const result = await db.runTransaction(async (tx) => {
      const goal = (await tx.get(ref)).data() || {};
      const newAmount = (goal.current_amount ?? 0) + input.amount;
      const completed = newAmount >= (goal.target_amount ?? Infinity);
      const p = { current_amount: newAmount, ...(completed ? { is_completed: true } : {}), updated_at: now };
      tx.update(ref, p);
      return p;
    });
    return { success: true, message: `Added $${input.amount} to ${input.goal_name}. Total: $${result.current_amount}${result.is_completed ? " — GOAL REACHED! 🎉" : ""}.` };
  }

  if (name === "add_expense") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due_date || "")) return { success: false, message: "due_date must be YYYY-MM-DD." };
    if (!(input.amount > 0)) return { success: false, message: "amount must be greater than zero." };
    const isInstallment = input.expense_type === "installment";
    const dueType = isInstallment ? "monthly" : input.due_type;
    // Same derivation as the Expenses form: due_day is day-of-month for
    // monthly, day-of-week (0=Sun) for weekly, unused (1) otherwise.
    const [y, m, d] = input.due_date.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dueDay = dueType === "monthly" ? d : dueType === "weekly" ? date.getUTCDay() : 1;

    const doc = {
      name:         String(input.name).slice(0, 100),
      amount:       input.amount,
      expense_type: isInstallment ? "installment" : "recurring",
      due_type:     dueType,
      due_day:      dueDay,
      // one-time needs the exact date; biweekly needs its first date as the anchor
      due_date:     dueType === "one-time" || dueType === "biweekly" ? input.due_date : null,
      category:     input.category || "other",
      is_household: input.is_household === true,
      is_active:    true,
      notes:        input.notes ? String(input.notes).slice(0, 500) : null,
      account_id:   null,
      my_share:     null,
      contributors: null,
      created_at:   now,
    };
    if (isInstallment) {
      const total = input.original_balance > 0 ? input.original_balance : null;
      doc.original_balance  = total;
      doc.remaining_balance = total;
    }
    const ref = await userDb("fixed_expenses").add(doc);
    const when = dueType === "monthly" ? `day ${dueDay} of each month`
      : dueType === "weekly" ? `every week (starting ${input.due_date})`
      : dueType === "biweekly" ? `every 2 weeks (first ${input.due_date})`
      : `once on ${input.due_date}`;
    return { success: true, id: ref.id, message: `Added ${doc.name}: $${input.amount}, ${when}${isInstallment && doc.original_balance ? `, $${doc.original_balance} total owed` : ""}.` };
  }

  return { success: false, message: `Unknown tool: ${name}` };
}

// One conversation turn with tools — shared by the app chat and Telegram.
async function runChat({ uid, message, snapshot, history }) {
  // Use the user's local "today" for any date the model writes — the
  // function runs in UTC, which can be a day off from the user's date.
  const today = /^d{4}-d{2}-d{2}$/.test(snapshot?.today || "") ? snapshot.today : new Date().toISOString().split("T")[0];

  const contextBlock = snapshot ? `<financial_context>
${JSON.stringify(snapshot)}
</financial_context>

` : "";
  const priorTurns = (Array.isArray(history) ? history : [])
    .slice(-MAX_HISTORY_TURNS)
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TURN_CHARS) }));
  // The API needs the conversation to open with a user turn.
  while (priorTurns.length && priorTurns[0].role !== "user") priorTurns.shift();

  const client = new Anthropic({ apiKey: anthropicKey.value() });
  const callModel = (msgs) => client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // Caches the stable prefix (tools + system + earlier turns).
    cache_control: { type: "ephemeral" },
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages: msgs,
    ...FALLBACK,
  });

  // The model may need several rounds (e.g. adding many expenses), so keep
  // executing tools until it answers with text, capped to avoid runaways.
  const MAX_ROUNDS = 5;
  const actionsExecuted = [];
  let convo = [...priorTurns, { role: "user", content: contextBlock + message }];
  let data = await callModel(convo);

  for (let round = 0; round < MAX_ROUNDS && data.stop_reason === "tool_use"; round++) {
    const toolUseBlocks = data.content.filter((b) => b.type === "tool_use");
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        const result = await executeTool(toolUse.name, toolUse.input, uid, today).catch((e) => ({
          success: false,
          message: `Error executing ${toolUse.name}: ${e.message}`,
        }));
        if (result.success) actionsExecuted.push(toolUse.name);
        return { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result), ...(result.success ? {} : { is_error: true }) };
      })
    );
    // Append the full assistant content (including thinking blocks) unchanged.
    convo = [...convo, { role: "assistant", content: data.content }, { role: "user", content: toolResults }];
    data = await callModel(convo);
  }

  if (data.stop_reason === "refusal") {
    return { text: "I can't help with that one. Try asking another way.", actionsExecuted };
  }
  return { text: textOf(data), actionsExecuted };
}

exports.chat = onCall(
  { secrets: [anthropicKey], cors: true, maxInstances: 10, timeoutSeconds: 120 },
  async (request) => {
    const uid = await requireAllowedUser(request);
    const { message, snapshot, history } = request.data || {};
    if (!message || typeof message !== "string" || message.length > MAX_MESSAGE_CHARS) {
      throw new HttpsError("invalid-argument", "message is required (max 4000 characters).");
    }
    checkSnapshot(snapshot);
    return runChat({ uid, message, snapshot, history });
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// Cash flow review — the AI reads the 60-day cash flow and gives the numbers
// ═════════════════════════════════════════════════════════════════════════════

const REVIEW_PROMPT = `You are Kova's cash-flow analyst. You review the user's next 60 days of cash flow and decide how much to pay to each credit card and when, then explain it briefly. The app shows your numbers directly on the Cash Flow screen.

${PLAN_RULES}

How to work:
1. Walk cash_flow_next_60_days yourself. Confirm the plan's numbers: the lowest future balance after each payment must stay >= the reserve.
2. Decide pay_today (card_id exactly as in credit_cards) and the schedule for later dates. Total pay_today must be <= the sum of card_payment_plan.safe_to_pay_today. Never pay more than a card's balance.
3. warnings: concrete risks (a tight day, a stale balance, an unconfirmed paycheck, an overdue bill, a card near its limit). Empty if none.
4. questions: only what you genuinely need the user to confirm. Empty if none.
5. headline: one or two plain sentences with the key action and amount.

Write headline, reasons, warnings and questions in Spanish. Amounts as "$1,234".`;

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    pay_today: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          card_id: { type: "string" },
          card:    { type: "string" },
          amount:  { type: "number" },
          reason:  { type: "string" },
        },
        required: ["card_id", "card", "amount", "reason"],
      },
    },
    schedule: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          date:   { type: "string", description: "YYYY-MM-DD" },
          card:   { type: "string" },
          amount: { type: "number" },
        },
        required: ["date", "card", "amount"],
      },
    },
    warnings:  { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "pay_today", "schedule", "warnings", "questions"],
};

exports.analyzeCashFlow = onCall(
  { secrets: [anthropicKey], cors: true, maxInstances: 10, timeoutSeconds: 120 },
  async (request) => {
    await requireAllowedUser(request);
    const { snapshot } = request.data || {};
    if (!snapshot) throw new HttpsError("invalid-argument", "snapshot is required.");
    checkSnapshot(snapshot);

    const client = new Anthropic({ apiKey: anthropicKey.value() });
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: { type: "json_schema", schema: REVIEW_SCHEMA } },
      system: REVIEW_PROMPT,
      messages: [{ role: "user", content: `<financial_context>\n${JSON.stringify(snapshot)}\n</financial_context>\n\nReview my cash flow and card payments.` }],
      ...FALLBACK,
    });

    if (res.stop_reason === "refusal") throw new HttpsError("failed-precondition", "The review was declined.");
    if (res.stop_reason === "max_tokens") throw new HttpsError("internal", "The review was cut off.");
    try {
      return JSON.parse(textOf(res));
    } catch {
      throw new HttpsError("internal", "The review came back malformed.");
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// Household join — validated server-side
// ═════════════════════════════════════════════════════════════════════════════
// Joining used to be a client write to households.member_uids, which the rules
// had to allow for ANY signed-in user who knew a household id. Here the invite
// token is checked (unused, unexpired, right email) before anyone is added, so
// the rules can make member_uids owner-only.

exports.joinHousehold = onCall({ cors: true, maxInstances: 10 }, async (request) => {
  const uid = requireUser(request);
  const { token, name } = request.data || {};
  if (typeof token !== "string" || !/^[a-z0-9]{16,64}$/.test(token)) throw new HttpsError("invalid-argument", "Invalid invite.");
  if (typeof name !== "string" || !name.trim() || name.length > 60) throw new HttpsError("invalid-argument", "Name is required.");

  const db = admin.firestore();
  const inviteRef = db.collection("invites").doc(token);

  return db.runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    const invite = inviteSnap.data();
    if (!invite) throw new HttpsError("not-found", "This invite link is invalid.");
    if (invite.used) throw new HttpsError("failed-precondition", "This invite link has already been used.");
    if (new Date(invite.expires_at) < new Date()) throw new HttpsError("failed-precondition", "This invite link has expired.");
    const email = (request.auth.token.email || "").toLowerCase();
    if (invite.invited_email && invite.invited_email !== email) {
      throw new HttpsError("permission-denied", `This invite is for ${invite.invited_email}.`);
    }

    const householdRef = db.collection("households").doc(invite.household_id);
    const household = (await tx.get(householdRef)).data();
    if (!household || household.owner_uid !== invite.owner_uid) throw new HttpsError("not-found", "Household not found.");

    tx.update(householdRef, { member_uids: admin.firestore.FieldValue.arrayUnion(uid) });
    tx.set(db.collection("user_profiles").doc(uid), {
      role:             "member",
      household_id:     invite.household_id,
      name:             name.trim(),
      contributor_id:   invite.contributor_id ?? null,
      contributor_name: invite.contributor_name ?? null,
    }, { merge: true });
    tx.update(inviteRef, { used: true, used_by: uid, used_at: admin.firestore.FieldValue.serverTimestamp() });
    return { household_id: invite.household_id };
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Telegram bot — morning digest + chat with Kova AI (see telegram.js)
// ═════════════════════════════════════════════════════════════════════════════

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const crypto = require("crypto");
const tgBot = require("./telegram");

const telegramToken = defineSecret("TELEGRAM_BOT_TOKEN");
const REGION_URL = "https://us-central1-kona-finances.cloudfunctions.net";
const DEFAULT_TZ = "America/New_York";

// Loads the user's data and runs the same engine as the app, in their timezone.
async function loadServerSnapshot(uid) {
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const all = (col) => userRef.collection(col).get().then((q) => q.docs.map((d) => ({ id: d.id, ...d.data() })));
  const [accounts, expenses, sources, cards, goals, contributors, cfSettings, tgSettings] = await Promise.all([
    all("accounts"), all("fixed_expenses"), all("income_sources"), all("credit_cards"), all("goals"),
    all("household_contributors"),
    userRef.collection("settings").doc("cashflow").get(),
    userRef.collection("settings").doc("telegram").get(),
  ]);
  // The engine reads "today" from the clock; run it in the user's timezone.
  process.env.TZ = tgSettings.data()?.tz || DEFAULT_TZ;

  const lim = cards.reduce((s, c) => s + (c.credit_limit || 0), 0);
  const bal = cards.reduce((s, c) => s + (c.current_balance || 0), 0);
  const utilization = {
    total_utilization_pct: lim > 0 ? (bal / lim) * 100 : 0,
    cards: cards.map((c) => ({ ...c, utilization_pct: c.credit_limit > 0 ? ((c.current_balance || 0) / c.credit_limit) * 100 : 0 })),
  };
  const reserve = Math.max(0, Number(cfSettings.data()?.reserve) || 0);
  const { buildSnapshot } = await import("./shared/snapshot.js");
  const { buildCashFlowContext } = await import("./shared/cashFlowEngine.js");
  const snapshot = buildSnapshot({ accounts, expenses, sources, utilization, goals, contributors, reserve });
  const ctx = buildCashFlowContext({ accounts, expenses, sources, cards: utilization.cards, contributors, reserve });
  return { snapshot, ctx, accounts };
}

// The app calls this to get a one-time link that connects a Telegram chat.
exports.telegramLink = onCall(
  { secrets: [telegramToken], cors: true, maxInstances: 5 },
  async (request) => {
    // The bot is the owner's alone: household members can't link a chat.
    const uid = requireOwner(request);
    const token = telegramToken.value();
    // (Re)register the webhook — idempotent, and keeps the secret header in sync.
    await tgBot.tg(token, "setWebhook", {
      url: `${REGION_URL}/telegramWebhook`,
      secret_token: tgBot.webhookSecret(token),
      allowed_updates: ["message", "callback_query"],
    });
    await tgBot.tg(token, "setMyCommands", {
      commands: [
        { command: "hoy", description: "Resumen de hoy: cuentas, pagos y saldo" },
        { command: "stop", description: "Dejar de recibir el resumen diario" },
        { command: "resume", description: "Reactivar el resumen diario" },
      ],
    }).catch(() => {});
    const me = await tgBot.tg(token, "getMe", {});
    const code = crypto.randomBytes(16).toString("hex");
    const tz = typeof request.data?.tz === "string" && request.data.tz.length < 60 ? request.data.tz : DEFAULT_TZ;
    await admin.firestore().collection("telegram_links").doc(code).set({ uid, tz, expires_at: Date.now() + tgBot.LINK_TTL_MS });
    return { url: `https://t.me/${me.username}?start=${code}`, bot: me.username };
  }
);

async function linkedUid(chatId) {
  const db = admin.firestore();
  const map = await db.collection("telegram_chats").doc(String(chatId)).get();
  const uid = map.data()?.uid;
  // Only the owner's chat is ever served, even if some other mapping existed.
  if (!uid || !ownerUids().includes(uid)) return null;
  // Disconnecting in the app deletes settings/telegram — honor that here.
  const s = await db.collection("users").doc(uid).collection("settings").doc("telegram").get();
  return s.data()?.chat_id === chatId ? uid : null;
}

exports.telegramWebhook = onRequest(
  { secrets: [anthropicKey, telegramToken], maxInstances: 5, timeoutSeconds: 120 },
  async (req, res) => {
    const token = telegramToken.value();
    if (req.method !== "POST" || req.get("x-telegram-bot-api-secret-token") !== tgBot.webhookSecret(token)) {
      res.status(403).send("forbidden");
      return;
    }
    // Button taps ("✅ Ya lo pagué") arrive as callback queries.
    if (req.body?.callback_query) {
      await handlePaidButton(token, req.body.callback_query).catch((e) => console.error("paid button", e));
      res.sendStatus(200);
      return;
    }
    const msg = req.body?.message;
    const chatId = msg?.chat?.id;
    const text = typeof msg?.text === "string" ? msg.text.trim() : "";
    const reply = (html) => tgBot.tg(token, "sendMessage", { chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true });
    // Always answer 200: a failed reply shouldn't make Telegram retry the update forever.
    try {
      if (!chatId || !text || msg.chat.type !== "private") { res.sendStatus(200); return; }
      const db = admin.firestore();

      if (text.startsWith("/start")) {
        const code = text.split(/\s+/)[1] || "";
        const linkRef = db.collection("telegram_links").doc(/^[a-f0-9]{32}$/.test(code) ? code : "invalid");
        const link = (await linkRef.get()).data();
        // Unknown or expired codes get no answer at all: a stranger who finds
        // the bot learns nothing and triggers nothing.
        if (link && link.expires_at >= Date.now()) {
          await Promise.all([
            db.collection("telegram_chats").doc(String(chatId)).set({ uid: link.uid, linked_at: admin.firestore.FieldValue.serverTimestamp() }),
            db.collection("users").doc(link.uid).collection("settings").doc("telegram").set({
              chat_id: chatId, username: msg.from?.username ?? null, tz: link.tz, notify: true,
              linked_at: admin.firestore.FieldValue.serverTimestamp(),
            }),
            linkRef.delete(),
          ]);
          await reply("✅ <b>Kova conectado.</b> Cada mañana a las 9 te mando tu resumen (y los días de cobro, con qué pagar), y a las 6 p.m. te recuerdo lo que tengas que pagar (con un botón para marcarlo pagado).\n\nPregúntame lo que quieras, por ejemplo: <i>¿cuánto puedo pagar hoy?</i> o <i>pagué T-Mobile con la Apple Card</i>.\n\n/hoy — resumen ahora\n/stop — dejar de recibir el resumen");
        }
        res.sendStatus(200);
        return;
      }

      const uid = await linkedUid(chatId);
      // Only the one chat linked from the app is served; everyone else is
      // ignored (no reply, no AI call, no data read).
      if (!uid) { res.sendStatus(200); return; }
      const settingsRef = db.collection("users").doc(uid).collection("settings").doc("telegram");

      if (text === "/stop") {
        await settingsRef.set({ notify: false }, { merge: true });
        await reply("Listo, no te mando más el resumen diario. Escribe /resume para reactivarlo.");
      } else if (text === "/resume") {
        await settingsRef.set({ notify: true }, { merge: true });
        await reply("Resumen diario reactivado ✅");
      } else if (text === "/hoy" || text === "/today") {
        const { ctx, accounts } = await loadServerSnapshot(uid);
        await reply(tgBot.buildDigest({ ctx, accounts }));
      } else {
        if (!(await isAllowed(uid))) { await reply("Esta cuenta no puede usar Kova AI."); res.sendStatus(200); return; }
        await tgBot.tg(token, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
        const { snapshot } = await loadServerSnapshot(uid);
        // Same history as the in-app chat, so both see one conversation.
        const hist = db.collection("users").doc(uid).collection("chat_history");
        const histQ = await hist.orderBy("created_at", "desc").limit(20).get();
        const history = histQ.docs.map((d) => d.data()).reverse().map((m) => ({ role: m.role, content: m.content }));
        const { text: answer } = await runChat({ uid, message: text.slice(0, MAX_MESSAGE_CHARS), snapshot, history });
        await hist.add({ role: "user", content: text, source: "telegram", created_at: admin.firestore.FieldValue.serverTimestamp() });
        await hist.add({ role: "assistant", content: answer, source: "telegram", created_at: admin.firestore.FieldValue.serverTimestamp() });
        await reply(tgBot.mdToHtml(answer).slice(0, 4000));
      }
    } catch (e) {
      console.error("telegramWebhook", e);
      await reply("Algo falló de mi lado. Intenta otra vez en un momento.").catch(() => {});
    }
    res.sendStatus(200);
  }
);

// 8:00 a.m. digest to everyone connected (the schedule runs in New York time;
// each user's numbers are computed in their own timezone).
exports.telegramDailyDigest = onSchedule(
  { schedule: "0 9 * * *", timeZone: DEFAULT_TZ, secrets: [telegramToken], timeoutSeconds: 300 },
  async () => {
    const token = telegramToken.value();
    const chats = await admin.firestore().collection("telegram_chats").get();
    for (const doc of chats.docs) {
      const chatId = Number(doc.id);
      try {
        const uid = await linkedUid(chatId);
        if (!uid) continue;
        const s = await admin.firestore().collection("users").doc(uid).collection("settings").doc("telegram").get();
        if (s.data()?.notify === false) continue;
        let { ctx, accounts, snapshot } = await loadServerSnapshot(uid);

        // Payday: the paycheck is due today (not recorded yet) or was already
        // recorded today (e.g. the app credited it when opened).
        const job = ctx.job1;
        const pending = ctx.pendingPaycheck && ctx.pendingPaycheck.payDate === snapshot.today ? ctx.pendingPaycheck : null;
        const recordedToday = job?.last_paycheck_date === snapshot.today;
        if (pending || recordedToday) {
          let credited = null;
          if (pending && job.destination_account_id) {
            // Same ledger entry as the app: shows in Recent activity and can be undone.
            const r = await executeTool("record_paycheck",
              { income_source_id: job.id, to_account_id: job.destination_account_id }, uid, snapshot.today);
            if (r.success) {
              ({ ctx, accounts, snapshot } = await loadServerSnapshot(uid));
              const dest = accounts.find((a) => a.id === job.destination_account_id);
              credited = { amount: Number(job.amount_per_period) || 0, accountName: dest?.name || "tu cuenta" };
            }
          } else if (recordedToday) {
            const dest = accounts.find((a) => a.id === job.destination_account_id);
            credited = { amount: Number(job.amount_per_period) || 0, accountName: dest?.name || "tu cuenta" };
          }
          await tgBot.tg(token, "sendMessage", {
            chat_id: chatId, parse_mode: "HTML",
            text: tgBot.buildPayday({ ctx, accounts, credited, paycheckAmount: Number(job?.amount_per_period) || 0 }),
          });
          continue;
        }

        await tgBot.tg(token, "sendMessage", { chat_id: chatId, text: tgBot.buildDigest({ ctx, accounts }), parse_mode: "HTML" });
      } catch (e) {
        console.error("morning message failed for chat", chatId, e);
      }
    }
  }
);

// Security alert from the app (e.g. 5 wrong device PINs) to the owner's Telegram.
exports.securityAlert = onCall(
  { secrets: [telegramToken], cors: true, maxInstances: 3 },
  async (request) => {
    const uid = await requireAllowedUser(request);
    if (request.data?.event !== "pin_lockout") throw new HttpsError("invalid-argument", "Unknown event.");
    const ref = admin.firestore().collection("users").doc(uid).collection("settings").doc("telegram");
    const tgs = (await ref.get()).data();
    if (!tgs?.chat_id) return { sent: false };
    // At most one alert every 5 minutes.
    if (tgs.last_alert_at && Date.now() - tgs.last_alert_at < 5 * 60 * 1000) return { sent: false };
    await ref.set({ last_alert_at: Date.now() }, { merge: true });
    const when = new Date().toLocaleString("es-US", { timeZone: tgs.tz || DEFAULT_TZ });
    await tgBot.tg(telegramToken.value(), "sendMessage", {
      chat_id: tgs.chat_id,
      parse_mode: "HTML",
      text: `🔒 <b>Alerta de seguridad</b>\n\nAlguien falló el PIN de Kova 5 veces (${when}). El PIN de ese dispositivo se borró y la sesión se cerró: para volver hay que entrar con Google.\n\nSi no fuiste tú, cambia la contraseña de tu cuenta de Google.`,
    });
    return { sent: true };
  }
);

// ── Payment reminders ────────────────────────────────────────────────────────

function registerWebhook(token) {
  return tgBot.tg(token, "setWebhook", {
    url: `${REGION_URL}/telegramWebhook`,
    secret_token: tgBot.webhookSecret(token),
    allowed_updates: ["message", "callback_query"],
  });
}

// 6:00 p.m.: what's due today and still unpaid (+ tomorrow, + cards in 3 days).
exports.telegramPaymentReminders = onSchedule(
  { schedule: "0 18 * * *", timeZone: DEFAULT_TZ, secrets: [telegramToken], timeoutSeconds: 300 },
  async () => {
    const token = telegramToken.value();
    // Keeps button taps flowing even if the webhook was registered before
    // reminders existed (it only listened for messages then).
    await registerWebhook(token).catch((e) => console.error("setWebhook", e));
    const chats = await admin.firestore().collection("telegram_chats").get();
    for (const doc of chats.docs) {
      const chatId = Number(doc.id);
      try {
        const uid = await linkedUid(chatId);
        if (!uid) continue;
        const s = await admin.firestore().collection("users").doc(uid).collection("settings").doc("telegram").get();
        if (s.data()?.notify === false) continue;
        const { ctx } = await loadServerSnapshot(uid);
        const r = tgBot.buildReminders({ ctx });
        if (!r) continue;
        await tgBot.tg(token, "sendMessage", {
          chat_id: chatId, text: r.text, parse_mode: "HTML",
          ...(r.buttons.length ? { reply_markup: { inline_keyboard: r.buttons } } : {}),
        });
      } catch (e) {
        console.error("reminder failed for chat", chatId, e);
      }
    }
  }
);

// "✅ Ya lo pagué" — records the payment through the same ledger as the app
// (undoable from Recent activity). A bill uses the account/card it was last
// paid with; otherwise it's recorded without changing any balance.
async function handlePaidButton(token, cq) {
  const answer = (text) => tgBot.tg(token, "answerCallbackQuery", { callback_query_id: cq.id, text, show_alert: false }).catch(() => {});
  const chatId = cq.message?.chat?.id;
  const uid = chatId ? await linkedUid(chatId) : null;
  if (!uid) return answer("");

  const m = /^p\|(e|c)\|([A-Za-z0-9_-]{1,40})$/.exec(cq.data || "");
  if (!m) return answer("");
  const [, kind, id] = m;

  // Re-check against live data: only something actually due now can be paid here.
  const { ctx, snapshot } = await loadServerSnapshot(uid);
  const due = (ctx.baseline[0]?.events ?? []).find((e) => e.type === "expense" && !e.isPlan &&
    (kind === "e" ? e.expenseId === id : e.cardId === id));

  let note;
  if (!due) {
    note = "Ya estaba registrado ✅";
  } else if (kind === "e") {
    const exp = (await admin.firestore().collection("users").doc(uid).collection("fixed_expenses").doc(id).get()).data() || {};
    const src = exp.default_pay_source;
    const withSource = src && (src.type === "account" || src.type === "card") && src.id;
    const r = await executeTool("mark_expense_paid", {
      expense_id: id, expense_name: due.name, amount: due.amount,
      paid_with: withSource ? src.type : "none", ...(withSource ? { source_id: src.id } : {}),
    }, uid, snapshot.today);
    note = r.success ? (withSource ? "Pagado y descontado ✅" : "Registrado ✅ (sin cambiar saldos)") : "No se pudo registrar";
  } else {
    const r = await executeTool("pay_credit_card", {
      card_id: id, card_name: due.name.replace(/ \(minimum\)$/, ""), payment_amount: due.amount,
    }, uid, snapshot.today);
    note = r.success ? "Pago registrado ✅ (sin cambiar tu cuenta)" : "No se pudo registrar";
  }
  await answer(note);

  // Drop the tapped button so it can't be pressed twice.
  const rows = (cq.message?.reply_markup?.inline_keyboard || []).filter((row) => row[0]?.callback_data !== cq.data);
  await tgBot.tg(token, "editMessageReplyMarkup", {
    chat_id: chatId, message_id: cq.message.message_id, reply_markup: { inline_keyboard: rows },
  }).catch(() => {});
  if (due) {
    await tgBot.tg(token, "sendMessage", {
      chat_id: chatId, parse_mode: "HTML",
      text: `✅ <b>${tgBot.mdToHtml(due.name)}</b> — ${note.replace(" ✅", "")}. Puedes deshacerlo en la app (Recent activity).`,
    }).catch(() => {});
  }
}

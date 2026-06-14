const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

const SYSTEM_PROMPT = `You are Kova, a personal financial assistant embedded in the user's finance app. You have read AND write access to their data.

**Data you can read:**
- Bank account balances
- Income sources (biweekly Job 1 and variable daily Job 2 at $110/day). Each biweekly source includes last_paid_date and next_payment_date.
- Fixed monthly expenses (personal AND household/shared)
- Credit cards (balance, limit, APR, utilization)
- Savings goals and progress
- Cash flow projections

**Actions you can take (use tools):**
- Mark an expense as paid this cycle
- Unmark a paid expense
- Update an account balance
- Record a credit card payment (reduces balance)
- Add a contribution to a savings goal

When the user asks you to do something ("mark X as paid", "update my Chase balance to $X", "I paid $X to BofA", "add $X to my emergency fund"), USE THE APPROPRIATE TOOL immediately — don't ask for confirmation unless the action is ambiguous.

**Truly Available Money**: balance minus minimum future balance over next 60 days.

**Key rules:**
1. Use my_share (not full amount) for household expenses unless asked otherwise.
2. Exclude paid_this_cycle expenses from what-I-still-owe calculations.
3. Be specific with names and amounts.

**FORMATTING — follow strictly:**
- NEVER use markdown tables. No pipes (|), no dashes as separators.
- NEVER use horizontal rules (--- or ***).
- Bullet points (-) or numbered lists only.
- Amounts inline: "Rent: $1,350" not in columns.
- Mobile chat: 3–6 bullets max unless user asks for detail.
- Emojis sparingly (one per section max).

Always respond in the same language the user uses (English or Spanish). Be honest — if money is tight, say so.`;

const TOOLS = [
  {
    name: "mark_expense_paid",
    description: "Mark a fixed expense as paid for the current billing cycle. Use when the user says they paid a bill or asks to mark it paid.",
    input_schema: {
      type: "object",
      properties: {
        expense_id:   { type: "string", description: "The id field of the expense from the financial context" },
        expense_name: { type: "string", description: "Human-readable name of the expense" },
      },
      required: ["expense_id", "expense_name"],
    },
  },
  {
    name: "unmark_expense_paid",
    description: "Remove the paid mark from a fixed expense (mark it as unpaid again).",
    input_schema: {
      type: "object",
      properties: {
        expense_id:   { type: "string" },
        expense_name: { type: "string" },
      },
      required: ["expense_id", "expense_name"],
    },
  },
  {
    name: "update_account_balance",
    description: "Update the current balance of a bank/savings account. Use when the user tells you their balance changed.",
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
    description: "Record a payment to a credit card — reduces the balance and updates available credit and last_paid_date.",
    input_schema: {
      type: "object",
      properties: {
        card_id:        { type: "string", description: "The id field of the credit card" },
        card_name:      { type: "string" },
        payment_amount: { type: "number", description: "Amount paid in dollars" },
        credit_limit:   { type: "number", description: "Credit limit of the card (from context)" },
        current_balance:{ type: "number", description: "Current balance before payment (from context)" },
      },
      required: ["card_id", "card_name", "payment_amount"],
    },
  },
  {
    name: "add_goal_contribution",
    description: "Add money to a savings goal. Use when the user says they saved or contributed to a goal.",
    input_schema: {
      type: "object",
      properties: {
        goal_id:        { type: "string", description: "The id field of the goal" },
        goal_name:      { type: "string" },
        amount:         { type: "number", description: "Amount contributed in dollars" },
        current_amount: { type: "number", description: "Current saved amount before contribution" },
        target_amount:  { type: "number", description: "Goal target amount" },
      },
      required: ["goal_id", "goal_name", "amount"],
    },
  },
];

async function executeTool(name, input, uid) {
  const today  = new Date().toISOString().split("T")[0];
  const userDb = (col) => admin.firestore().collection("users").doc(uid).collection(col);

  if (name === "mark_expense_paid") {
    await userDb("fixed_expenses").doc(input.expense_id).update({ last_paid_date: today });
    return { success: true, message: `${input.expense_name} marked as paid on ${today}.` };
  }

  if (name === "unmark_expense_paid") {
    await userDb("fixed_expenses").doc(input.expense_id).update({ last_paid_date: null });
    return { success: true, message: `${input.expense_name} unmarked — now showing as unpaid.` };
  }

  if (name === "update_account_balance") {
    await userDb("accounts").doc(input.account_id).update({
      current_balance: input.new_balance,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: `${input.account_name} balance updated to $${input.new_balance}.` };
  }

  if (name === "pay_credit_card") {
    const snap = await userDb("credit_cards").doc(input.card_id).get();
    const card  = snap.data() || {};
    const prevBalance = input.current_balance ?? card.current_balance ?? 0;
    const newBalance  = Math.max(0, prevBalance - input.payment_amount);
    const limit       = input.credit_limit ?? card.credit_limit ?? 0;
    await userDb("credit_cards").doc(input.card_id).update({
      current_balance:  newBalance,
      available_credit: limit - newBalance,
      last_paid_date:   today,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: `${input.card_name}: paid $${input.payment_amount}. New balance: $${newBalance}.` };
  }

  if (name === "add_goal_contribution") {
    const snap = await userDb("goals").doc(input.goal_id).get();
    const goal  = snap.data() || {};
    const newAmount = (input.current_amount ?? goal.current_amount ?? 0) + input.amount;
    const completed = newAmount >= (input.target_amount ?? goal.target_amount ?? Infinity);
    await userDb("goals").doc(input.goal_id).update({
      current_amount: newAmount,
      ...(completed ? { is_completed: true } : {}),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: `Added $${input.amount} to ${input.goal_name}. Total: $${newAmount}${completed ? " — GOAL REACHED! 🎉" : ""}.` };
  }

  return { success: false, message: `Unknown tool: ${name}` };
}

const ANTHROPIC_HEADERS = (key) => ({
  "Content-Type": "application/json",
  "x-api-key": key,
  "anthropic-version": "2023-06-01",
});

exports.chat = onCall(
  { secrets: [anthropicKey], cors: true, maxInstances: 10 },
  async (request) => {
    const { message, snapshot, history } = request.data;
    if (!message || typeof message !== "string") {
      throw new HttpsError("invalid-argument", "message is required.");
    }

    const uid = request.auth?.uid ?? null;

    const contextBlock = snapshot
      ? `\n<financial_context>\n${JSON.stringify(snapshot, null, 2)}\n</financial_context>\n`
      : "";

    const messages = [
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: contextBlock ? `${contextBlock}\n\n${message}` : message },
    ];

    const apiKey = anthropicKey.value();

    const firstRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: ANTHROPIC_HEADERS(apiKey),
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: uid ? TOOLS : [],
        messages,
      }),
    });

    if (!firstRes.ok) {
      const err = await firstRes.text();
      throw new HttpsError("internal", `Anthropic error: ${firstRes.status} — ${err}`);
    }

    const firstData = await firstRes.json();

    // ── Tool use loop ────────────────────────────────────────────────────────
    if (firstData.stop_reason === "tool_use" && uid) {
      const toolUseBlocks = firstData.content.filter((b) => b.type === "tool_use");

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          const result = await executeTool(toolUse.name, toolUse.input, uid).catch((e) => ({
            success: false,
            message: `Error executing ${toolUse.name}: ${e.message}`,
          }));
          return {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          };
        })
      );

      const followUpMessages = [
        ...messages,
        { role: "assistant", content: firstData.content },
        { role: "user",      content: toolResults },
      ];

      const finalRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: ANTHROPIC_HEADERS(apiKey),
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: followUpMessages,
        }),
      });

      if (!finalRes.ok) {
        const err = await finalRes.text();
        throw new HttpsError("internal", `Anthropic error (follow-up): ${finalRes.status}`);
      }

      const finalData = await finalRes.json();
      const finalText = finalData.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      return {
        text: finalText,
        actionsExecuted: toolUseBlocks.map((t) => t.name),
      };
    }

    // ── Normal text response ─────────────────────────────────────────────────
    const text = firstData.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return { text, actionsExecuted: [] };
  }
);

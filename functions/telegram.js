// Kova on Telegram: a morning digest, plus chatting with Kova AI from the
// Telegram app. Numbers come from the same engine as the web app
// (functions/shared, synced from src/lib), built from live Firestore data.
//
// Linking: the app calls telegramLink → gets a one-time t.me/<bot>?start=<code>
// link → the user taps Start → the webhook maps that chat to their uid.
const crypto = require("crypto");

const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;
const LINK_TTL_MS = 15 * 60 * 1000;

async function tg(token, method, body) {
  const res = await fetch(API(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description || res.status}`);
  return data.result;
}

// Telegram echoes this in a header on every webhook call, so forged requests
// to the public URL are rejected. Derived from the bot token: no extra secret.
const webhookSecret = (token) => crypto.createHash("sha256").update(`kova-telegram:${token}`).digest("hex");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// The model writes light markdown; Telegram gets the HTML equivalent.
const mdToHtml = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
  .replace(/^#{1,3}\s*(.+)$/gm, "<b>$1</b>")
  .replace(/`([^`]+)`/g, "<code>$1</code>");

const money = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-US", { weekday: "short", day: "numeric", month: "short" });
};

// Morning message — deterministic, no AI cost.
function buildDigest({ ctx, accounts }) {
  const lines = [];
  const today = ctx.baseline[0];
  const tomorrow = ctx.baseline[1];
  lines.push(`🌅 <b>Kova · ${esc(fmtDay(today.dateStr))}</b>`);
  lines.push(accounts.map((a) => `💵 ${esc(a.name)}: <b>${money(a.current_balance)}</b>`).join("\n"));
  if (ctx.balanceAgeDays >= 1) lines.push(`⚠️ Saldos actualizados hace ${ctx.balanceAgeDays} día(s) — revísalos en la app.`);

  const todayOut = ctx.timeline[0].events.filter((e) => e.type === "expense");
  const todayIn  = ctx.timeline[0].events.filter((e) => e.type === "income");
  if (todayIn.length) lines.push(`💰 <b>Hoy cobras:</b> ${todayIn.map((e) => `${esc(e.name)} ${money(e.amount)}`).join(", ")}${ctx.pendingPaycheck ? " (confírmalo en la app)" : ""}`);
  const bills = todayOut.filter((e) => !e.isPlan);
  if (bills.length) lines.push(`📌 <b>Hoy:</b>\n${bills.map((e) => ` • ${esc(e.name)} ${money(e.amount)}${e.overdue ? " (vencido)" : ""}`).join("\n")}`);

  const pay = ctx.plan.todayPayments;
  if (pay.length) lines.push(`💳 <b>Seguro pagar hoy:</b> ${money(pay.reduce((s, p) => s + p.amount, 0))}\n${pay.map((p) => ` • ${money(p.amount)} → ${esc(p.cardName)}`).join("\n")}`);
  else if (ctx.plan.nextPayment) lines.push(`💳 Hoy no hay pago extra seguro. Próximo: ${money(ctx.plan.nextPayment.amount)} a ${esc(ctx.plan.nextPayment.cardName)} el ${esc(fmtDay(ctx.plan.nextPayment.dateStr))}.`);

  const tom = tomorrow?.events.filter((e) => e.type === "expense" && !e.isPlan) ?? [];
  if (tom.length) lines.push(`📅 <b>Mañana:</b> ${tom.map((e) => `${esc(e.name)} ${money(e.amount)}`).join(", ")}`);

  const low = ctx.timeline.reduce((lo, d) => (d.balance < lo.balance ? d : lo), ctx.timeline[0]);
  lines.push(`📉 Punto más bajo: ${money(low.balance)} el ${esc(fmtDay(low.dateStr))}`);
  lines.push(`\nEscríbeme cualquier pregunta, o /hoy para ver esto otra vez.`);
  return lines.filter(Boolean).join("\n\n");
}

// Evening reminder: what's due today (or overdue) and not recorded as paid,
// what's due tomorrow, and card minimums due in 3 days. Each item due now
// gets a "✅ Ya lo pagué" button. Returns null when there's nothing to say.
const CARD_HEADS_UP_DAYS = 3;
const label = (e) => e.name.replace(/ \(minimum\)$/, " (mínimo)");
function buildReminders({ ctx }) {
  const bills = (day) => (day?.events ?? []).filter((e) => e.type === "expense" && !e.isPlan && (e.expenseId || e.cardId));
  const dueNow   = bills(ctx.baseline[0]);
  const tomorrow = bills(ctx.baseline[1]);
  const cardsSoon = bills(ctx.baseline[CARD_HEADS_UP_DAYS]).filter((e) => e.cardId);
  if (!dueNow.length && !tomorrow.length && !cardsSoon.length) return null;

  const lines = ["⏰ <b>Recordatorio de pagos</b>"];
  if (dueNow.length) {
    lines.push(`<b>Vence hoy${dueNow.some((e) => e.overdue) ? " o ya venció" : ""} y no está marcado como pagado:</b>\n` +
      dueNow.map((e) => ` • ${esc(label(e))} — ${money(e.amount)}${e.overdue ? " (vencido)" : ""}`).join("\n"));
  }
  if (tomorrow.length) {
    lines.push(`<b>Mañana (${esc(fmtDay(ctx.baseline[1].dateStr))}):</b>\n` +
      tomorrow.map((e) => ` • ${esc(label(e))} — ${money(e.amount)}`).join("\n"));
  }
  if (cardsSoon.length) {
    lines.push(`<b>Tarjetas en ${CARD_HEADS_UP_DAYS} días (${esc(fmtDay(ctx.baseline[CARD_HEADS_UP_DAYS].dateStr))}):</b>\n` +
      cardsSoon.map((e) => ` • ${esc(label(e))} — ${money(e.amount)}`).join("\n"));
  }
  if (dueNow.length) lines.push("Toca el botón cuando lo pagues y lo registro en la app.");

  // callback_data is limited to 64 bytes: "p|e|<id>" or "p|c|<id>".
  const buttons = dueNow.map((e) => [{
    text: `✅ Ya lo pagué: ${label(e)}`.slice(0, 60),
    callback_data: e.expenseId ? `p|e|${e.expenseId}` : `p|c|${e.cardId}`,
  }]);
  return { text: lines.join("\n\n"), buttons };
}

module.exports = { tg, webhookSecret, mdToHtml, buildDigest, buildReminders, LINK_TTL_MS };

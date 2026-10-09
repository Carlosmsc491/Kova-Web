// Copies the cash-flow engine from the web app into the Cloud Functions
// package, so the server (Telegram bot, daily digest, AI tools) computes
// exactly the same numbers as the app. Runs before every functions deploy
// (firebase.json predeploy); functions/shared/ is generated, not committed.
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const out  = path.join(root, 'functions', 'shared')
const FILES = ['dateUtils.js', 'cashFlowEngine.js', 'snapshot.js']

fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n')
for (const f of FILES) {
  const src = fs.readFileSync(path.join(root, 'src', 'lib', f), 'utf8')
  fs.writeFileSync(path.join(out, f), `// GENERATED from src/lib/${f} by scripts/sync-shared.cjs — do not edit.\n${src}`)
}
console.log(`synced ${FILES.length} files to functions/shared`)

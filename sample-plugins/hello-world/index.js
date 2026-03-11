const args = process.argv.slice(2)
const get = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : undefined
}
const has = (flag) => args.includes(flag)

const name = get('--name') || 'World'
const parsedCount = parseInt(get('--count') || '3', 10)
const count = Number.isFinite(parsedCount) ? Math.max(parsedCount, 1) : 3
const loud = has('--loud')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const color = (code, text) => `\u001b[${code}m${text}\u001b[0m`

async function runOraDemo() {
  if (!process.stdout.isTTY) {
    console.log(color('33', '[ora skipped] stdout is not a TTY, fallback to plain output.'))
    console.log(color('32', 'Phase 1 success ✅'))
    console.log(color('31', 'Phase 2 failed (expected demo) ❌'))
    return
  }

  const { default: ora } = await import('ora')
  let spinner = ora({
    text: `${color('36', 'Phase 1: preparing spinner')} 🔄`,
    spinner: 'dots',
    color: 'cyan',
  }).start()

  try {
    await sleep(900)
    spinner.text = `${color('36', 'Phase 1: checking xterm.js repaint')} 🧪`
    await sleep(900)
    spinner.succeed(`${color('32', 'Phase 1 success (ora.succeed)')} ✅`)
  } catch (err) {
    if (spinner.isSpinning) {
      spinner.stop()
    }
    throw err
  }

  spinner = ora({
    text: `${color('33', 'Phase 2: simulating failure path')} ⚠️`,
    spinner: 'line',
    color: 'yellow',
  }).start()

  try {
    await sleep(900)
    spinner.text = `${color('33', 'Phase 2: forcing ora.fail output')} 🧨`
    await sleep(900)
    spinner.fail(`${color('31', 'Phase 2 failed (ora.fail demo)')} ❌`)
  } catch (err) {
    if (spinner.isSpinning) {
      spinner.stop()
    }
    throw err
  }
}

async function main() {
  console.log(color('35', `Hello, ${name}! xterm.js + ora compatibility demo 🚀`))

  for (let i = 0; i < count; i++) {
    const msg = `Hello, ${name}! (${i + 1}/${count})`
    console.log(loud ? msg.toUpperCase() : msg)
    await sleep(120)
  }

  await runOraDemo()
  console.log(color('90', 'Demo finished. Cursor should be visible again. 👀'))
}

main().catch((err) => {
  console.error(color('31', `Unexpected error: ${err?.message || err}`))
  process.exitCode = 1
})

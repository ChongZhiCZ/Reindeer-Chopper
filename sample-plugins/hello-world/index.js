const path = require('node:path')
const args = process.argv.slice(2)
const get = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : undefined
}
const has = (flag) => args.includes(flag)

const name = get('--name') || 'World'
const parsedCount = parseInt(get('--count') || '3', 10)
const count = Number.isFinite(parsedCount) ? Math.max(parsedCount, 1) : 3
const mode = get('--mode') || '问候'
const loud = has('--loud')
const inputFile = get('--inputFile')
const outputDir = get('--outputDir')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const color = (code, text) => `\u001b[${code}m${text}\u001b[0m`

function printPathDemo() {
  if (inputFile) {
    console.log(color('36', `Picked file: ${inputFile}`))
    console.log(color('90', `File name: ${path.basename(inputFile)}`))
  } else {
    console.log(color('33', 'No file selected. You can set --inputFile to demo filepath(file).'))
  }

  if (outputDir) {
    console.log(color('36', `Picked directory: ${outputDir}`))
    console.log(color('90', `Directory name: ${path.basename(outputDir) || outputDir}`))
  } else {
    console.log(color('33', 'No directory selected. You can set --outputDir to demo filepath(directory).'))
  }
}

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
  console.log(color('90', `Selected mode: ${mode}`))

  if (mode === '自述') {
    const lines = [
      `I am the built-in Hello World plugin for Reindeer Chopper.`,
      `I demonstrate text/number/boolean/filepath/select parameter wiring.`,
      `Current input name: ${name}`,
    ]
    for (const line of lines) {
      console.log(loud ? line.toUpperCase() : line)
      await sleep(120)
    }
  } else {
    for (let i = 0; i < count; i++) {
      const msg = `Hello, ${name}! (${i + 1}/${count})`
      console.log(loud ? msg.toUpperCase() : msg)
      await sleep(120)
    }
  }

  printPathDemo()

  await runOraDemo()
  console.log(color('90', 'Demo finished. Cursor should be visible again. 👀'))
}

main().catch((err) => {
  console.error(color('31', `Unexpected error: ${err?.message || err}`))
  process.exitCode = 1
})

import path from 'node:path'

const args = process.argv.slice(2)

function readValue(flag, fallback) {
  const index = args.indexOf(flag)
  if (index === -1 || index === args.length - 1) {
    return fallback
  }
  return args[index + 1]
}

function hasFlag(flag) {
  return args.includes(flag)
}

const message = readValue('--message', 'Hello')
const rawCount = Number.parseInt(readValue('--count', '1'), 10)
const count = Number.isFinite(rawCount) ? Math.max(rawCount, 1) : 1
const mode = readValue('--mode', 'greet')
const note = readValue('--note', '')
const loud = hasFlag('--loud')
const inputFile = readValue('--inputFile', '')
const outputDir = readValue('--outputDir', '')

for (let i = 0; i < count; i += 1) {
  const base = mode === 'intro'
    ? `[__PLUGIN_NAME__] I am generated from the plugin template (${i + 1}/${count})`
    : `[__PLUGIN_NAME__] ${message} (${i + 1}/${count})`
  console.log(loud ? base.toUpperCase() : base)
}

if (note.trim()) {
  console.log(`[__PLUGIN_NAME__] note:`)
  for (const line of note.split(/\r?\n/)) {
    console.log(loud ? line.toUpperCase() : line)
  }
}

if (inputFile) {
  console.log(`[__PLUGIN_NAME__] input file: ${inputFile}`)
  console.log(`[__PLUGIN_NAME__] input file name: ${path.basename(inputFile)}`)
}

if (outputDir) {
  console.log(`[__PLUGIN_NAME__] output directory: ${outputDir}`)
  console.log(`[__PLUGIN_NAME__] output directory name: ${path.basename(outputDir) || outputDir}`)
}

const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const args = process.argv.slice(2)

function readValue(flag) {
  const index = args.indexOf(flag)
  if (index === -1 || index === args.length - 1) {
    return undefined
  }
  return args[index + 1]
}

function hasFlag(flag) {
  return args.includes(flag)
}

function fail(message) {
  console.error(`[playwright-screenshot] ${message}`)
  process.exit(1)
}

const url = readValue('--url')
const outputDirArg = readValue('--outputDir')
const headless = hasFlag('--headless')

if (!url) {
  fail('Missing required parameter: --url')
}

if (!outputDirArg) {
  fail('Missing required parameter: --outputDir')
}

try {
  // Validate URL early to keep terminal output deterministic.
  new URL(url)
} catch {
  fail(`Invalid URL: ${url}`)
}

const outputDir = path.resolve(outputDirArg)
const screenshotPath = path.join(outputDir, 'screenshot.png')

async function main() {
  console.log(`[playwright-screenshot] URL: ${url}`)
  console.log(`[playwright-screenshot] Output directory: ${outputDir}`)
  console.log(`[playwright-screenshot] Headless: ${headless}`)

  fs.mkdirSync(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.screenshot({ path: screenshotPath, fullPage: true })
  } finally {
    await browser.close()
  }

  console.log(`[playwright-screenshot] Screenshot saved: ${screenshotPath}`)
}

main().catch((error) => {
  fail(`Failed to capture screenshot: ${error?.message || error}`)
})

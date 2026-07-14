import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { PNG } from 'pngjs'

const SCENES = [
  ['saturn_ring', 'S-01 / ORBITAL FORGE'],
  ['dna_helix', 'S-02 / GENETIC LATTICE'],
  ['hypercube', 'S-03 / DIMENSIONAL LATTICE'],
  ['singularity', 'S-04 / GRAVITY WELL'],
  ['quantum_sphere', 'S-05 / QUANTUM CORE'],
  ['knot_torus', 'S-06 / ENTANGLED FLOW'],
  ['golden_spiral', 'S-07 / PHI GROWTH'],
  ['galaxy', 'S-08 / GALACTIC WAVE'],
] as const

const RUN_VISUAL_E2E = process.env.PLAYWRIGHT_VISUAL === '1'

type SceneId = typeof SCENES[number][0]

interface CanvasSample {
  pixels: number[]
  signature: number[]
  nonBlackPixels: number
  brightPixels: number
  centerBrightPixels: number
  maxLuminance: number
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let seed = 0x13579bdf
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0x100000000
    }
  })
})

async function activateApp(page: Page, shape: SceneId = 'saturn_ring') {
  await page.goto('/')
  await page.evaluate(async (nextShape) => {
    const moduleUrl = '/src/store/appStore.ts'
    const storeModule = await import(moduleUrl)
    storeModule.useAppStore.setState({
      phase: 'active',
      cameraEnabled: false,
      cameraReady: false,
      trackingStatus: 'idle',
      galleryMode: false,
      particleShape: nextShape,
    })
  }, shape)

  const veil = page.getByTestId('offline-veil')
  await expect(veil).toBeVisible()
  await veil.evaluate((element) => {
    element.style.display = 'none'
  })

  const expectedCode = SCENES.find(([id]) => id === shape)?.[1]
  await expect(page.getByTestId('scene-hud-left')).toContainText(expectedCode ?? '')
  await expect.poll(async () => (await sampleCanvas(page)).centerBrightPixels).toBeGreaterThan(4)
  await page.waitForTimeout(900)
}

async function openSceneLibrary(page: Page) {
  const toggle = page.getByTestId('scene-library-toggle')
  const library = page.getByTestId('scene-library')
  if (!(await library.isVisible().catch(() => false))) await toggle.click()
  await expect(library).toBeVisible()
  return library
}

async function switchScene(page: Page, shape: SceneId) {
  await openSceneLibrary(page)
  const button = page.locator(`[data-scene-id="${shape}"]`)
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  const expectedCode = SCENES.find(([id]) => id === shape)?.[1]
  await expect(page.getByTestId('scene-hud-left')).toContainText(expectedCode ?? '')
  await expect.poll(async () => (await sampleCanvas(page)).centerBrightPixels).toBeGreaterThan(4)
  await page.waitForTimeout(650)
}

async function sampleCanvas(page: Page): Promise<CanvasSample> {
  const png = PNG.sync.read(await page.screenshot({ animations: 'disabled' }))
  const sampleWidth = 64
  const sampleHeight = 40
  const pixels: number[] = []
  const signature = new Array(6 * 4 * 3).fill(0)
  const signatureCounts = new Array(6 * 4).fill(0)
  let nonBlackPixels = 0
  let brightPixels = 0
  let centerBrightPixels = 0
  let maxLuminance = 0

  for (let y = 0; y < sampleHeight; y++) {
    const sourceY = Math.min(png.height - 1, Math.floor((y + 0.5) * png.height / sampleHeight))
    for (let x = 0; x < sampleWidth; x++) {
      const sourceX = Math.min(png.width - 1, Math.floor((x + 0.5) * png.width / sampleWidth))
      const offset = (sourceY * png.width + sourceX) * 4
      const red = png.data[offset]
      const green = png.data[offset + 1]
      const blue = png.data[offset + 2]
      const alpha = png.data[offset + 3]
      pixels.push(red, green, blue, alpha)
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
      if (luminance > 8) nonBlackPixels += 1
      if (luminance > 42) brightPixels += 1
      if (x >= 14 && x < 50 && y >= 7 && y < 34 && luminance > 42) centerBrightPixels += 1
      maxLuminance = Math.max(maxLuminance, luminance)

      const cellX = Math.min(5, Math.floor(x / (sampleWidth / 6)))
      const cellY = Math.min(3, Math.floor(y / (sampleHeight / 4)))
      const cell = cellY * 6 + cellX
      signature[cell * 3] += red
      signature[cell * 3 + 1] += green
      signature[cell * 3 + 2] += blue
      signatureCounts[cell] += 1
    }
  }

  for (let cell = 0; cell < signatureCounts.length; cell++) {
    const count = Math.max(1, signatureCounts[cell])
    signature[cell * 3] /= count
    signature[cell * 3 + 1] /= count
    signature[cell * 3 + 2] /= count
  }

  return {
    pixels,
    signature,
    nonBlackPixels,
    brightPixels,
    centerBrightPixels,
    maxLuminance,
  }
}

function meanPixelDifference(first: number[], second: number[]) {
  let difference = 0
  for (let index = 0; index < first.length; index += 4) {
    difference += Math.abs(first[index] - second[index])
    difference += Math.abs(first[index + 1] - second[index + 1])
    difference += Math.abs(first[index + 2] - second[index + 2])
  }
  return difference / (first.length * 0.75)
}

function signatureDifference(first: number[], second: number[]) {
  return first.reduce((difference, value, index) => difference + Math.abs(value - second[index]), 0) /
    first.length
}

function overlaps(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
}

async function expectNoOverlap(page: Page, firstTestId: string, secondTestId: string) {
  const first = await page.getByTestId(firstTestId).boundingBox()
  const second = await page.getByTestId(secondTestId).boundingBox()
  expect(first).not.toBeNull()
  expect(second).not.toBeNull()
  expect(overlaps(first!, second!)).toBe(false)
}

test('scene library shows eight official scenes without a lab toggle and keeps touch targets stable', async ({ page }) => {
  await activateApp(page)
  const library = await openSceneLibrary(page)
  await expect(library.locator('[data-scene-id]')).toHaveCount(8)
  await expect(library).toContainText('8 场景')
  await expect(page.getByTestId('lab-toggle')).toHaveCount(0)

  const buttonSizes = await page.locator('button:visible').evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }),
  )
  expect(buttonSizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('mobile closes only after a successful official scene switch', async ({ page }) => {
  await activateApp(page)
  await openSceneLibrary(page)
  await page.locator('[data-scene-id="quantum_sphere"]').click()
  const isMobile = (page.viewportSize()?.width ?? 1000) <= 760

  if (isMobile) {
    await expect(page.getByTestId('scene-library')).toBeHidden()
    await openSceneLibrary(page)
  } else {
    await expect(page.getByTestId('scene-library')).toBeVisible()
  }
  await expect(page.locator('[data-scene-id="quantum_sphere"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('scene-hud-left')).toContainText('S-05 / QUANTUM CORE')
})

test('async renderer loading preserves the active scene on failure and supports retry', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await activateApp(page)
  await openSceneLibrary(page)
  const modulePattern = '**/src/particles/hypercube/HypercubeSystem.tsx*'
  await page.route(modulePattern, async (route) => route.abort())
  const hypercube = page.locator('[data-scene-id="hypercube"]')
  await hypercube.click()
  await expect(hypercube).toContainText('加载失败，点击重试')
  await expect(page.locator('[data-scene-id="saturn_ring"]')).toHaveAttribute('aria-pressed', 'true')

  await page.unroute(modulePattern)
  await hypercube.click()
  await expect(hypercube).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('scene-hud-left')).toContainText('S-03 / DIMENSIONAL LATTICE')
})

test('HUD and controls remain separated within the viewport', async ({ page }) => {
  await activateApp(page, 'galaxy')
  await expectNoOverlap(page, 'top-left-controls', 'scene-hud-top')
  await expectNoOverlap(page, 'top-right-controls', 'scene-hud-top')
  await expectNoOverlap(page, 'scene-hud-left', 'scene-hud-bottom')
  await expectNoOverlap(page, 'bottom-controls', 'scene-hud-bottom')

  const viewport = page.viewportSize()!
  for (const testId of ['scene-hud-top', 'scene-hud-left', 'scene-hud-bottom']) {
    const box = await page.getByTestId(testId).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
  }
})

test('all eight scenes expose stable S-01 through S-08 HUD identities', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await activateApp(page)
  for (const [shape, code] of SCENES) {
    if (shape !== 'saturn_ring') await switchScene(page, shape)
    await expect(page.getByTestId('scene-hud-left')).toContainText(code)
  }
})

test('official canvases are nonblank, animated, centered, and visually distinct', async ({ page }, testInfo) => {
  test.skip(!RUN_VISUAL_E2E, 'Set PLAYWRIGHT_VISUAL=1 to run visual pixel checks.')
  test.skip(testInfo.project.name !== 'desktop')
  await activateApp(page)
  const signatures: number[][] = []

  for (const [shape] of SCENES) {
    if (shape !== 'saturn_ring') await switchScene(page, shape)
    const first = await sampleCanvas(page)
    await page.waitForTimeout(320)
    const second = await sampleCanvas(page)
    expect(first.nonBlackPixels).toBeGreaterThan(120)
    expect(first.brightPixels).toBeGreaterThan(18)
    expect(first.centerBrightPixels).toBeGreaterThan(4)
    expect(first.maxLuminance).toBeGreaterThan(72)
    expect(meanPixelDifference(first.pixels, second.pixels)).toBeGreaterThan(0.08)
    signatures.push(first.signature)
  }

  for (let index = 1; index < signatures.length; index++) {
    expect(signatureDifference(signatures[index - 1], signatures[index])).toBeGreaterThan(0.3)
  }
})

for (const [shape] of SCENES) {
  test(`visual baseline: ${shape}`, async ({ page }, testInfo: TestInfo) => {
    test.skip(!RUN_VISUAL_E2E, 'Set PLAYWRIGHT_VISUAL=1 to update visual baselines.')
    await activateApp(page, shape)
    const first = await sampleCanvas(page)
    await page.waitForTimeout(260)
    const second = await sampleCanvas(page)
    expect(first.centerBrightPixels).toBeGreaterThan(4)
    expect(meanPixelDifference(first.pixels, second.pixels)).toBeGreaterThan(0.08)
    await expect(page).toHaveScreenshot(`${testInfo.project.name}-${shape}.png`, {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.14,
      threshold: 0.35,
    })
  })
}

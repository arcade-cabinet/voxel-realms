import { render } from "@testing-library/react";
import type { ComponentType } from "react";
import { expect } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

export type TextMatcher = string | RegExp;

export interface BrowserGameStartFlow {
  Component: ComponentType;
  title: TextMatcher;
  startFlow: TextMatcher[];
  ready: TextMatcher;
  expectsCanvas?: boolean;
}

export interface BrowserGameViewport {
  name: string;
  width: number;
  height: number;
}

export interface BrowserGameStartResult {
  container: HTMLElement;
  host: Element;
  rootElement: Element;
}

export interface BrowserGameScreenshotCapture {
  path: string;
  mode: "canvas" | "page";
  viewport: BrowserGameViewport;
  base64Length: number;
  sha256: string;
  visiblePixelRatio: number | null;
  colorBuckets: number | null;
  averageLuma: number | null;
  lumaStdDev: number | null;
  perceptualHash: string | null;
}

export async function verifyBrowserGameStartFlow({
  Component,
  title,
  startFlow,
  ready,
  expectsCanvas = false,
}: BrowserGameStartFlow): Promise<BrowserGameStartResult> {
  return startBrowserGame(
    { Component, title, startFlow, ready, expectsCanvas },
    {
      height: 720,
      name: "desktop",
      width: 1280,
    }
  );
}

export async function startBrowserGame(
  { Component, title, startFlow, ready, expectsCanvas = false }: BrowserGameStartFlow,
  viewport: BrowserGameViewport
): Promise<BrowserGameStartResult> {
  await page.viewport(viewport.width, viewport.height);

  const { container } = render(
    <div data-testid="game-host" style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Component />
    </div>
  );

  await expect.element(page.getByText(title)).toBeVisible();

  for (const label of startFlow) {
    await userEvent.click(page.getByText(label));
  }

  await expect.element(page.getByText(ready)).toBeVisible();

  if (expectsCanvas) {
    expect(container.querySelector("canvas")).not.toBeNull();
  }

  const host = container.querySelector('[data-testid="game-host"]');
  const rootElement = host?.firstElementChild;

  expect(host).not.toBeNull();
  expect(rootElement).not.toBeNull();

  assertViewportFill(host as Element, rootElement as Element, viewport);

  return {
    container,
    host: host as Element,
    rootElement: rootElement as Element,
  };
}

export async function captureBrowserGameScreenshot(
  host: Element,
  rootElement: Element,
  viewport: BrowserGameViewport,
  path: string
): Promise<BrowserGameScreenshotCapture> {
  await page.viewport(viewport.width, viewport.height);

  assertViewportFill(host, rootElement, viewport);

  const screenshotMode = rootElement.getAttribute("data-browser-screenshot-mode");

  if (screenshotMode !== "page") {
    const canvasScreenshot = await waitForVisibleCanvasScreenshot();
    if (canvasScreenshot) {
      await commands.writeFile(path, canvasScreenshot.base64, "base64");
      expect(canvasScreenshot.base64.length).toBeGreaterThan(5_000);
      expect(canvasScreenshot.visiblePixelRatio).toBeGreaterThan(0.001);
      expect(canvasScreenshot.colorBuckets).toBeGreaterThan(1);
      const sha256 = await hashBase64(canvasScreenshot.base64);

      return {
        path,
        mode: "canvas",
        viewport,
        base64Length: canvasScreenshot.base64.length,
        sha256,
        visiblePixelRatio: round(canvasScreenshot.visiblePixelRatio, 4),
        colorBuckets: canvasScreenshot.colorBuckets,
        averageLuma: round(canvasScreenshot.averageLuma, 2),
        lumaStdDev: round(canvasScreenshot.lumaStdDev, 2),
        perceptualHash: canvasScreenshot.perceptualHash,
      };
    }
  } else {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }

  const fallbackScreenshot = await page.screenshot({
    element: rootElement,
    save: false,
    timeout: 15_000,
  });
  await commands.writeFile(path, fallbackScreenshot, "base64");
  expect(fallbackScreenshot.length).toBeGreaterThan(5_000);
  const sha256 = await hashBase64(fallbackScreenshot);

  return {
    path,
    mode: "page",
    viewport,
    base64Length: fallbackScreenshot.length,
    sha256,
    visiblePixelRatio: null,
    colorBuckets: null,
    averageLuma: null,
    lumaStdDev: null,
    perceptualHash: null,
  };
}

async function waitForVisibleCanvasScreenshot() {
  let lastCapture: Awaited<ReturnType<typeof captureLargestCanvas>>;

  for (let attempt = 0; attempt < 24; attempt++) {
    await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 750 : 400));

    lastCapture = await captureLargestCanvas();
    if (!lastCapture) return undefined;

    if (
      lastCapture.base64.length > 5_000 &&
      lastCapture.visiblePixelRatio > 0.001 &&
      lastCapture.colorBuckets > 1
    ) {
      return lastCapture;
    }
  }

  return undefined;
}

function assertViewportFill(host: Element, rootElement: Element, viewport: BrowserGameViewport) {
  const hostRect = host.getBoundingClientRect();
  const rootRect = rootElement.getBoundingClientRect();

  expect(Math.round(hostRect.width)).toBe(viewport.width);
  expect(Math.round(hostRect.height)).toBe(viewport.height);
  expect(Math.round(rootRect.width)).toBe(viewport.width);
  expect(Math.round(rootRect.height)).toBe(viewport.height);
}

async function captureLargestCanvas() {
  const canvases = Array.from(
    document.querySelectorAll<HTMLCanvasElement>('canvas:not([data-capture-exclude="true"])')
  );
  const canvas = canvases
    .map((element) => ({
      area: element.width * element.height,
      element,
    }))
    .sort((a, b) => b.area - a.area)[0]?.element;

  if (!canvas || canvas.width === 0 || canvas.height === 0) return undefined;

  const metrics = measureCanvasPixels(canvas);
  const dataUrl = canvas.toDataURL("image/png");
  const marker = "base64,";
  const markerIndex = dataUrl.indexOf(marker);
  if (markerIndex === -1) return undefined;

  return {
    base64: dataUrl.slice(markerIndex + marker.length),
    ...metrics,
  };
}

function measureCanvasPixels(canvas: HTMLCanvasElement) {
  const sampleSize = 64;
  const probe = document.createElement("canvas");
  probe.width = sampleSize;
  probe.height = sampleSize;

  const context = probe.getContext("2d");
  if (!context) {
    return { colorBuckets: 0, visiblePixelRatio: 0 };
  }

  context.drawImage(canvas, 0, 0, sampleSize, sampleSize);
  const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
  const colorBuckets = new Set<string>();
  const lumaValues: number[] = [];
  let visiblePixels = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] ?? 0;
    if (alpha <= 10) continue;

    const red = pixels[i] ?? 0;
    const green = pixels[i + 1] ?? 0;
    const blue = pixels[i + 2] ?? 0;
    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;

    if (luma > 8) visiblePixels += 1;
    lumaValues.push(luma);
    colorBuckets.add(`${red >> 4},${green >> 4},${blue >> 4}`);
  }
  const averageLuma = average(lumaValues);

  return {
    colorBuckets: colorBuckets.size,
    visiblePixelRatio: visiblePixels / (sampleSize * sampleSize),
    averageLuma,
    lumaStdDev: standardDeviation(lumaValues, averageLuma),
    perceptualHash: createPerceptualHash(pixels, sampleSize),
  };
}

function createPerceptualHash(pixels: Uint8ClampedArray, sampleSize: number) {
  const hashSize = 8;
  const cellSize = sampleSize / hashSize;
  const cellLumas: number[] = [];

  for (let cellY = 0; cellY < hashSize; cellY++) {
    for (let cellX = 0; cellX < hashSize; cellX++) {
      const values: number[] = [];

      for (let y = cellY * cellSize; y < (cellY + 1) * cellSize; y++) {
        for (let x = cellX * cellSize; x < (cellX + 1) * cellSize; x++) {
          const index = (y * sampleSize + x) * 4;
          const red = pixels[index] ?? 0;
          const green = pixels[index + 1] ?? 0;
          const blue = pixels[index + 2] ?? 0;
          values.push(red * 0.2126 + green * 0.7152 + blue * 0.0722);
        }
      }

      cellLumas.push(average(values));
    }
  }

  const averageCellLuma = average(cellLumas);
  let bits = "";

  for (const luma of cellLumas) {
    bits += luma >= averageCellLuma ? "1" : "0";
  }

  return bitsToHex(bits);
}

function bitsToHex(bits: string) {
  let hex = "";

  for (let index = 0; index < bits.length; index += 4) {
    hex += Number.parseInt(bits.slice(index, index + 4), 2).toString(16);
  }

  return hex;
}

async function hashBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values: number[], mean: number) {
  if (values.length === 0) {
    return 0;
  }

  const variance =
    values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / values.length;

  return Math.sqrt(variance);
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

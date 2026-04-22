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
) {
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
      return path;
    }
  } else {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }

  const screenshot = await page.screenshot({
    base64: true,
    path: `../${path}`,
  });
  expect(screenshot.base64.length).toBeGreaterThan(5_000);

  return screenshot.path;
}

async function waitForVisibleCanvasScreenshot() {
  let lastCapture: Awaited<ReturnType<typeof captureLargestCanvas>>;

  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 500 : 250));

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

  return lastCapture;
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
  let visiblePixels = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] ?? 0;
    if (alpha <= 10) continue;

    const red = pixels[i] ?? 0;
    const green = pixels[i + 1] ?? 0;
    const blue = pixels[i + 2] ?? 0;
    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;

    if (luma > 8) visiblePixels += 1;
    colorBuckets.add(`${red >> 4},${green >> 4},${blue >> 4}`);
  }

  return {
    colorBuckets: colorBuckets.size,
    visiblePixelRatio: visiblePixels / (sampleSize * sampleSize),
  };
}

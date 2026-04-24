import { chromium } from "playwright";

const url = process.env.TARGET_URL ?? "https://arcade-cabinet.github.io/voxel-realms/";
const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "iphone", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch();
for (const viewport of viewports) {
  const { name, ...vp } = viewport;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
  });
  const page = await ctx.newPage();
  const errors = [];
  const fourohfours = [];
  page.on("pageerror", (err) => errors.push({ kind: "pageerror", msg: err.message }));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push({ kind: "console-error", msg: msg.text() });
  });
  page.on("response", (res) => {
    if (res.status() === 404) fourohfours.push(res.url());
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("button:has-text('Enter Realm')", { timeout: 15000 });
  await page.click("button:has-text('Enter Realm')");
  await page.waitForTimeout(8000);

  const canvasCount = await page.locator("canvas").count();
  const hasHUD = await page
    .locator("text=/GATE|NEXT JUMP|RUN 1/i")
    .first()
    .isVisible()
    .catch(() => false);
  console.log(
    `[${name}] ${vp.width}x${vp.height}: canvases=${canvasCount} hud=${hasHUD} errors=${errors.length} 404s=${fourohfours.length}`
  );
  for (const e of errors) console.log(`  [${e.kind}] ${e.msg.slice(0, 200)}`);
  for (const u of fourohfours) console.log(`  [404] ${u}`);

  await page.screenshot({ path: `/tmp/live-smoke-${name}.png`, fullPage: false });
  await ctx.close();
}
await browser.close();

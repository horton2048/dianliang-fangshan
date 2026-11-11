import { chromium, devices } from 'playwright-core';
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(process.argv[2] || 'http://localhost:8765/index.html'); await page.waitForTimeout(600);
await page.tap('#screen'); await page.waitForTimeout(300);
for (let i = 0; i < 6; i++) { await page.tap('#bA'); await page.waitForTimeout(150); }
const box = await page.locator('#joy').boundingBox();
await page.mouse.move(box.x + 60, box.y + 60); await page.mouse.down(); await page.mouse.move(box.x + 60, box.y + 10, { steps: 3 });
await page.waitForTimeout(800); await page.mouse.up();
const s = await page.evaluate(() => window.__game.state); console.log('mobile', s.mode, s.x, s.y, errs);
await page.screenshot({ path: 'shots/07-mobile.png' });
await browser.close();

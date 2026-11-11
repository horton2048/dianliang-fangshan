// 自动化验证：纯按键走完序章+第一章；第二、三章用“路径逐格传送（模拟走路）+按键交互”走完；截图。
import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:8765/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
const st = () => page.evaluate(() => window.__game.state);
const sleep = ms => page.waitForTimeout(ms);
const log = (...a) => console.log(...a);
const check = (cond, msg) => { log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };
async function tap(k, n = 1) { for (let i = 0; i < n; i++) { await page.keyboard.down(k); await sleep(40); await page.keyboard.up(k); await sleep(90); } }
let stampShot = false;
async function clearDialogs(max = 40) { for (let i = 0; i < max; i++) { const s = await st(); if (!s.dialog && !s.overlay) return; if (s.overlay === 'stamp' || s.overlay === 'chapter') await sleep(900); if (s.overlay === 'stamp' && !stampShot && s.done.includes('c1a')) { stampShot = true; await page.screenshot({ path: 'shots/05-stamp.png' }); } await tap('z'); } }
async function walk(key, pred, maxMs = 20000) { await page.keyboard.down(key); const t0 = Date.now(); while (Date.now() - t0 < maxMs) { const s = await st(); if (pred(s)) break; await sleep(15); } await page.keyboard.up(key); await sleep(300); return st(); }
// BFS 路径，逐格传送（会沿途点亮迷雾），模拟长距离步行
async function goTo(x, y, dir) {
  const n = await page.evaluate(([tx, ty, dir]) => {
    const g = window.__game, s = g.state, W = 158, H = 293; const prev = new Map(); const k = (x, y) => y * W + x; const q = [[s.x, s.y]]; prev.set(k(s.x, s.y), null);
    while (q.length) { const [cx, cy] = q.shift(); if (cx === tx && cy === ty) break; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = cx + a, Y = cy + b; if (X < 0 || Y < 0 || X >= W || Y >= H || prev.has(k(X, Y)) || g.blocked(X, Y)) continue; prev.set(k(X, Y), [cx, cy]); q.push([X, Y]); } }
    if (!prev.has(k(tx, ty))) return -1; const path = []; let c = [tx, ty]; while (c) { path.push(c); c = prev.get(k(c[0], c[1])); } path.reverse();
    for (const [X, Y] of path) g.teleport(X, Y, dir); return path.length;
  }, [x, y, dir]);
  await sleep(150); return n;
}
await page.screenshot({ path: 'shots/01-title.png' });
await tap('z'); await sleep(300); await clearDialogs();
let s = await st(); const fog0 = s.fog; check(s.mode === 'play' && s.task === 'p1', '标题→新游戏，任务卡 p1「找到迎新点」');
s = await walk('ArrowUp', s => s.ty <= 280); check(s.region.startsWith('SB3'), '按键走进 SB3 行政综合组团，迷雾 ' + fog0 + '→' + s.fog);
await tap('z'); await sleep(1300);
await page.screenshot({ path: 'shots/02-outdoor-dialog.png' });
await clearDialogs();
s = await st(); check(s.done.includes('p1') && s.stamps.includes('SB3') && s.fog > fog0 + 1000, '序章打卡：盖 SB3 章、点亮整个分区（迷雾 ' + s.fog + '）');
let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dianliang-fangshan-save-v1') || 'null'));
check(saved && saved.done.includes('p1'), '自动存档写入 localStorage');
// 没有校园卡进不了食堂
const doors0 = await page.evaluate(() => window.__game.doors());
await page.evaluate(([x, y]) => window.__game.teleport(x, y + 1, 'up'), doors0['NA2-1']); await tap('ArrowUp'); await sleep(500);
s = await st(); check(s.scene === 'outdoor' && s.dialog, '无校园卡 → 食堂闸机拦下'); await clearDialogs();
await page.evaluate(() => window.__game.teleport(65, 280, 'up')); await sleep(200);
// 第一章：三个摊位（纯按键）
await walk('ArrowLeft', s => s.tx <= 60); await walk('ArrowUp', s => s.ty <= 277, 1500); await tap('ArrowUp'); await tap('z'); await clearDialogs();
await walk('ArrowRight', s => s.tx >= 69); await tap('ArrowUp'); await tap('z'); await clearDialogs();
await walk('ArrowLeft', s => s.tx <= 63); await walk('ArrowUp', s => s.ty <= 272); await walk('ArrowLeft', s => s.tx <= 60); await tap('ArrowUp'); await tap('z'); await clearDialogs();
s = await st(); check(['c1a', 'c1b', 'c1c'].every(t => s.done.includes(t)) && s.items.includes('校园卡') && s.items.includes('宿舍钥匙'), '报到/领证卡/领物资完成，背包：' + s.items.join('、'));
// 去宿舍（路径步行），进门找床
const doors = await page.evaluate(() => window.__game.doors());
log('path to dorm', await goTo(doors['NA2-3'][0], doors['NA2-3'][1] + 1, 'up'));
await tap('ArrowUp'); await sleep(900); s = await st(); check(s.scene === 'dorm', '宿舍钥匙开门 → 切屏进宿舍');
await walk('ArrowLeft', s => s.tx <= 5); await walk('ArrowUp', s => s.ty <= 3); await walk('ArrowLeft', s => s.tx <= 3); await tap('ArrowUp'); await tap('z'); await clearDialogs();
s = await st(); check(s.done.includes('c1d') && s.ch === 2, '找到床 → 第一章完成');
await tap('ArrowUp'); await tap('z'); await sleep(900); s = await st(); log('bed prompt dialog', s.dialog); await tap('z'); await sleep(100); await tap('z'); await sleep(300);
saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dianliang-fangshan-save-v1') || 'null'));
check(saved && saved.scene === 'dorm', '宿舍床存档');
await clearDialogs(); await walk('ArrowRight', s => s.tx >= 5); await walk('ArrowDown', s => s.ty >= 9); await walk('ArrowRight', s => s.tx >= 9); await walk('ArrowDown', s => s.scene === 'outdoor', 6000); await sleep(800);
s = await st(); check(s.scene === 'outdoor', '出宿舍回到室外 ' + s.x + ',' + s.y);
// 第二章：食堂（校园卡）+ 驿站
await goTo(doors['NA2-1'][0], doors['NA2-1'][1] + 1, 'up'); await tap('ArrowUp'); await sleep(900);
s = await st(); check(s.scene === 'canteen', '刷校园卡进北区食堂');
await walk('ArrowUp', s => s.ty <= 2); await tap('ArrowUp'); await tap('z'); await clearDialogs();
s = await st(); check(s.done.includes('c2a'), '食堂打卡');
await walk('ArrowDown', s => s.scene === 'outdoor', 6000); await sleep(800);
const npcs = await page.evaluate(() => window.__game.npcs()); const cour = npcs.find(n => n.id === 'courier');
await goTo(cour.x, cour.y + 1, 'up'); await tap('ArrowUp'); await tap('z'); await clearDialogs();
s = await st(); check(s.done.includes('c2b') && s.items.includes('被褥快递') && s.ch === 3, '驿站取被褥快递 → 第二章完成');
// 第三章：三座教学楼
for (const [id, t] of [['NC2-1-north', 'c3a'], ['NC2-1-south', 'c3b'], ['SC1-1', 'c3c']]) {
  await goTo(doors[id][0], doors[id][1] + 1, 'up'); await tap('ArrowUp'); await sleep(900);
  await walk('ArrowUp', s => s.ty <= 4); await tap('ArrowUp'); await tap('z'); await clearDialogs();
  s = await st(); check(s.done.includes(t), id + ' 打卡板打卡');
  await walk('ArrowDown', s => s.scene === 'outdoor', 6000); await sleep(800);
}
s = await st(); check(s.done.length === 10 && s.items.includes('课表'), 'MVP 主线完成：' + s.done.join(','));
await clearDialogs();
await tap('m'); await sleep(500); await page.screenshot({ path: 'shots/03-map.png' }); await tap('m');
await tap('i'); await sleep(300); await page.screenshot({ path: 'shots/04-bag.png' }); await tap('x');
// 户外对话（图书馆前）与路牌
const lib = (await page.evaluate(() => window.__game.npcs())).find(n => n.id === 'librarian');
await goTo(lib.x, lib.y + 1, 'up'); await tap('ArrowUp'); await tap('z'); await sleep(1400); await page.screenshot({ path: 'shots/02b-outdoor-dialog-library.png' }); await clearDialogs();
const sg = (await page.evaluate(() => window.__game.signs())).find(x => x.title.includes('分界')); await goTo(sg.x, sg.y + 1, 'up'); await tap('ArrowUp'); await tap('z'); await sleep(400); s = await st(); check(s.overlay === 'sign', '路牌按键显示方向'); await page.screenshot({ path: 'shots/06-sign.png' }); await tap('x');
// 读档
const before = await st();
await page.reload(); await sleep(800); await tap('z'); await sleep(500); s = await st();
check(s.mode === 'play' && s.done.length === before.done.length && s.items.includes('课表') && s.fog > 10000, '刷新后「继续游戏」恢复进度、背包和迷雾（fog ' + s.fog + '）');
check(errors.length === 0, '控制台无报错 ' + JSON.stringify(errors));
await browser.close();

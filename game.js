// 《点亮房山》主程序：Canvas 2D，内部分辨率 320×180 整数放大。
(function () {
  'use strict';
  const VW = 320, VH = 180, T = 16;
  const { P } = ART; const MD = window.MAPDATA, GD = window.GAMEDATA, SFX = AUDIO.SFX;
  const W = MD.W, H = MD.H;
  const G = { VOID: 0, ROAD: 1, PAVE: 2, GRASS: 3, BELT: 4, COURT: 5, TRACK: 6, INFIELD: 7, BUILD: 8, FENCE: 9, PARK: 10, PLAZA: 11, WALL: 12, TREE: 13, STAND: 14, POLE: 15, TENNIS: 18 };
  const WALK = new Set([G.ROAD, G.PAVE, G.GRASS, G.BELT, G.COURT, G.TRACK, G.INFIELD, G.PARK, G.PLAZA, G.TENNIS]);
  const FONT = "'Noto Sans CJK SC','Noto Sans SC','PingFang SC','Microsoft YaHei','Hiragino Sans GB',sans-serif";
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const SAVE_KEY = 'dianliang-fangshan-save-v1';

  // ---------- 地图解析 ----------
  const ground = new Uint8Array(W * H), regionAt = new Int16Array(W * H), bidAt = new Int16Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    ground[i] = MD.ground[y].charCodeAt(x) - 48;
    const r = MD.region[y][x]; regionAt[i] = r === '.' ? -1 : r.charCodeAt(0) - 65;
    const b = MD.bid[y][x]; bidAt[i] = b === '.' ? -1 : b.charCodeAt(0) - 48;
  }
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h ^ (h >>> 16)) >>> 0; };
  // 公园草地内部点缀乔木（八邻域都是草地才种，避免堵路）
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (ground[y * W + x] !== G.GRASS || hash(x, y) % 100 >= 7) continue;
    let ok = true; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const g = ground[(y + b) * W + x + a]; if (g !== G.GRASS) ok = false; }
    if (ok) ground[y * W + x] = G.TREE;
  }
  const B = MD.buildings, byId = {}; B.forEach((b, i) => { b.idx = i; byId[b.id] = b; });
  const doorAt = new Map(); B.forEach(b => { if (b.door) doorAt.set(b.door[1] * W + b.door[0], b); });
  // 立面层数：从每列底边往上数 tier 行是墙面，其余是屋顶
  const facade = new Int8Array(W * H).fill(-1);
  for (let x = 0; x < W; x++) {
    let y = H - 1;
    while (y >= 0) {
      const i = y * W + x; const bi = ground[i] === G.BUILD ? bidAt[i] : -1;
      if (bi < 0) { y--; continue; }
      let top = y; while (top - 1 >= 0 && ground[(top - 1) * W + x] === G.BUILD && bidAt[(top - 1) * W + x] === bi) top--;
      const len = y - top + 1, tier = B[bi].tier || 1, nf = len > 1 ? Math.max(1, Math.min(tier, len - 1)) : 1;
      for (let k = 0; k < nf; k++) facade[(y - k) * W + x] = k;
      y = top - 1;
    }
  }
  const regions = MD.regions;
  const regionIdx = {}; regions.forEach((r, i) => regionIdx[r.id] = i);
  const regionTiles = regions.map(() => []);
  for (let i = 0; i < W * H; i++) if (regionAt[i] >= 0) regionTiles[regionAt[i]].push(i);

  // ---------- 实体：NPC / 摊位 / 路牌 ----------
  const blockers = new Map(); // 室外阻挡物 idx -> entity
  function reachableFrom(sx, sy) {
    const seen = new Uint8Array(W * H), q = [sy * W + sx]; seen[q[0]] = 1;
    while (q.length) { const i = q.pop(), x = i % W, y = (i / W) | 0; for (const [a, b] of Object.values(DIRS)) { const X = x + a, Y = y + b, j = Y * W + X; if (X < 0 || Y < 0 || X >= W || Y >= H || seen[j]) continue; if (WALK.has(ground[j])) { seen[j] = 1; q.push(j); } } }
    return seen;
  }
  const reach = reachableFrom(GD.start.x, GD.start.y);
  function snap(x, y, avoid) { // 最近的可达空地
    for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const X = x + dx, Y = y + dy, i = Y * W + X;
      if (X > 0 && Y > 0 && X < W && Y < H && reach[i] && !blockers.has(i) && !(avoid && avoid(X, Y))) return [X, Y];
    }
    return [x, y];
  }
  const nearDoor = (X, Y) => { for (const b of B) if (b.door && Math.abs(b.door[0] - X) <= 0 && Y - b.door[1] === 1) return true; return false; };
  const outdoorObjs = [];
  for (const o of GD.objects) { for (let k = 0; k < (o.w || 1); k++) { const e = Object.assign({ type: 'obj' }, o, { x: o.x + k, y: o.y, part: k }); blockers.set(e.y * W + e.x, e); if (k === 0) outdoorObjs.push(e); } }
  const outdoorNpcs = GD.npcs.map(n => {
    let x = n.x, y = n.y; if (n.near && byId[n.near] && byId[n.near].door) { x = byId[n.near].door[0] + (n.dx || 0); y = byId[n.near].door[1] + (n.dy || 1); }
    [x, y] = snap(x, y, nearDoor); const e = Object.assign({ type: 'npc' }, n, { x, y, home: n.dir }); blockers.set(y * W + x, e); return e;
  });
  const signs = GD.signs.map(s => { const [x, y] = snap(s.x, s.y, nearDoor); const e = Object.assign({ type: 'sign' }, s, { x, y }); blockers.set(y * W + x, e); return e; });
  const flag = (() => { for (let i = 0; i < W * H; i++) if (ground[i] === G.POLE) return [i % W, (i / W) | 0]; return [65, 272]; })();
  const landmarks = GD.landmarks.map(l => { if (l.b === 'SB3-flag') return { name: l.name, x: flag[0], y: flag[1] }; const b = byId[l.b]; return b ? { name: l.name, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 } : null; }).filter(Boolean);

  // 室内场景
  const interiors = {};
  for (const [k, d] of Object.entries(GD.interiors)) {
    const h = d.map.length, w = d.map[0].length;
    const tiles = d.map.map((row, y) => [...row].map((ch, x) => ART.interiorTile(ch, d.floor, (x + y) % 2)));
    interiors[k] = Object.assign({ w, h, tiles }, d);
  }
  const SOLID_IN = new Set(['#', 'w', 'B', 'C', 'T', 'K', 'P', 'L', 'd', 'S']);

  // ---------- 状态 ----------
  const S = {
    mode: 'title', scene: 'outdoor', inBuilding: null,
    p: { x: 0, y: 0, dir: 'up', moving: false, fx: 0, fy: 0, tx: 0, ty: 0, t: 0, anim: 0, run: false, hold: 0 },
    ch: 0, ti: 0, items: [], stamps: [], done: [], fog: new Uint8Array(W * H), day: 1, minutes: 450,
    curRegion: -2, plate: null, dialog: null, overlay: null, toast: null, fade: 0, fadeCb: null, titleSel: 0, bagSel: 0, finished: false, menuSel: 0
  };
  const hasSave = () => !!localStorage.getItem(SAVE_KEY);
  function newGame() {
    const s = GD.start; Object.assign(S, { scene: 'outdoor', inBuilding: null, ch: 0, ti: 0, items: [], stamps: [], done: [], fog: new Uint8Array(W * H), day: s.day, minutes: s.minutes, curRegion: -2, finished: false });
    placePlayer(s.x, s.y, s.dir); reveal(S.p.x, S.p.y); S.mode = 'play';
    say('', ['你拖着行李箱，站在北工大房山新校区的南入口。', '开学第一天。听说迎新点就在南门北面的旗杆广场。'], () => showCard());
  }
  function placePlayer(x, y, dir) { Object.assign(S.p, { x, y, fx: x * T, fy: y * T, moving: false, dir: dir || S.p.dir }); }
  // ---------- 存档 ----------
  function packFog() { let s = ''; for (let i = 0; i < W * H; i += 8) { let b = 0; for (let k = 0; k < 8; k++) if (S.fog[i + k]) b |= 1 << k; s += String.fromCharCode(b); } return btoa(s); }
  function unpackFog(str) { const s = atob(str), f = new Uint8Array(W * H); for (let i = 0; i < s.length; i++) { const b = s.charCodeAt(i); for (let k = 0; k < 8; k++) if (b & (1 << k) && i * 8 + k < W * H) f[i * 8 + k] = 1; } return f; }
  function save(reason) {
    const d = { v: 1, scene: S.scene, inBuilding: S.inBuilding, x: S.p.x, y: S.p.y, dir: S.p.dir, ch: S.ch, ti: S.ti, items: S.items, stamps: S.stamps, done: S.done, fog: packFog(), day: S.day, minutes: S.minutes, finished: S.finished, at: Date.now() };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); toast(reason === 'bed' ? '已存档（宿舍床）' : '自动存档'); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (!d) return false;
      Object.assign(S, { scene: d.scene, inBuilding: d.inBuilding, ch: d.ch, ti: d.ti, items: d.items, stamps: d.stamps, done: d.done || [], fog: unpackFog(d.fog), day: d.day, minutes: d.minutes, finished: !!d.finished, curRegion: -2 });
      placePlayer(d.x, d.y, d.dir); S.mode = 'play'; toast('读取存档'); return true;
    } catch (e) { console.warn('save broken', e); return false; }
  }
  // ---------- 迷雾 ----------
  function reveal(cx, cy, r = 6) {
    if (S.scene !== 'outdoor') return 0; let n = 0;
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue; if ((x - cx) ** 2 + (y - cy) ** 2 > r * r + r) continue;
      const i = y * W + x; if (!S.fog[i]) { S.fog[i] = 1; n++; }
    }
    return n;
  }
  function revealRegion(ri) { for (const i of regionTiles[ri]) S.fog[i] = 1; const t = regionTiles[ri]; if (!t.length) return; // 外沿道路也点亮一圈
    for (const i of t) { const x = i % W, y = (i / W) | 0; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < W && Y < H) S.fog[Y * W + X] = 1; } } }
  const fogCount = () => { let n = 0; for (let i = 0; i < W * H; i++) n += S.fog[i]; return n; };

  // ---------- 任务 ----------
  const curTask = () => { const c = GD.chapters[S.ch]; return c && c.tasks[S.ti]; };
  function showCard() { const t = curTask(); if (!t) return; SFX.ok(); S.overlay = { kind: 'card', t: 0, task: t, chapter: GD.chapters[S.ch].title }; }
  function tryTarget(key, fallback) {
    const t = curTask();
    if (t && t.target === key) { completeTask(t); return true; }
    if (fallback) fallback(); return false;
  }
  function completeTask(t) {
    S.done.push(t.id);
    const ri = regionIdx[t.region];
    const after = () => {
      const give = (t.gives || []).slice();
      const nextItem = () => {
        if (give.length) { const it = give.shift(); if (!S.items.includes(it)) S.items.push(it); SFX.item(); say('', ['获得关键道具【' + it + '】！按 I 查看背包。'], nextItem); return; }
        S.ti++;
        if (S.ti >= GD.chapters[S.ch].tasks.length) {
          const title = GD.chapters[S.ch].title; S.ch++; S.ti = 0;
          if (S.ch >= GD.chapters.length) S.finished = true;
          save('auto'); SFX.chapter();
          S.overlay = { kind: 'chapter', t: 0, title, next: S.finished ? null : GD.chapters[S.ch].title };
        } else { save('auto'); showCard(); }
      };
      nextItem();
    };
    const first = ri !== undefined && !S.stamps.includes(t.region);
    if (first) S.stamps.push(t.region);
    S.overlay = { kind: 'stamp', t: 0, task: t, region: regions[ri], first, cb: () => { if (first && ri !== undefined) { revealRegion(ri); SFX.reveal(); } after(); } };
    SFX.stamp();
  }

  // ---------- 对话 ----------
  function say(speaker, lines, cb, choices) { S.dialog = { speaker, pages: [], raw: lines.slice(), i: 0, shown: 0, cb, choices, sel: 0, laid: false }; }
  function layoutDialog(ctx, sc) {
    const d = S.dialog; if (d.laid) return; d.laid = true;
    ctx.font = `${Math.round(8 * sc)}px ${FONT}`; const maxW = (VW - 28) * sc; const out = [];
    for (const text of d.raw) {
      const lines = []; let cur = '';
      for (const ch of text) { if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch; }
      if (cur) lines.push(cur);
      for (let i = 0; i < lines.length; i += 2) out.push(lines.slice(i, i + 2));
    }
    d.pages = out;
  }
  function dialogAdvance() {
    layoutDialog(ctx, scale);
    const d = S.dialog; const page = d.pages[d.i]; if (!page) { S.dialog = null; return; }
    const len = page.join('').length;
    if (d.shown < len) { d.shown = len; return; }
    if (d.i < d.pages.length - 1) { d.i++; d.shown = 0; SFX.type(); return; }
    if (d.choices) { const c = d.choices[d.sel]; S.dialog = null; c.fn && c.fn(); return; }
    S.dialog = null; d.cb && d.cb();
  }

  // ---------- 交互 ----------
  function facing() { const [a, b] = DIRS[S.p.dir]; return [S.p.x + a, S.p.y + b]; }
  function interact() {
    const [fx, fy] = facing();
    if (S.scene === 'outdoor') {
      const e = blockers.get(fy * W + fx);
      if (e) {
        if (e.type === 'npc') return talkNpc(e);
        if (e.type === 'obj') return useDesk(e);
        if (e.type === 'sign') return readSign(e);
      }
      const b = doorAt.get(fy * W + fx); if (b) return enterDoor(b);
      const g = ground[fy * W + fx];
      if (g === G.FENCE) return say('', ['围挡：东北0047地块未开放。（用途待核实）']);
      if (g === G.POLE) return say('', ['旗杆。行政楼南侧旗杆广场的中心，位置为工作估计。']);
      if (g === G.BUILD) { const bi = bidAt[fy * W + fx]; if (bi >= 0) return say('', ['这是【' + B[bi].name + '】（' + B[bi].id + '）。']); }
      return;
    }
    const I = interiors[S.scene]; const ch = (I.map[fy] || '')[fx];
    const npc = I.npcs.find(n => n.x === fx && n.y === fy);
    if (npc) return talkNpc(npc);
    if (ch === 'B') {
      if (fx === 3) return tryTarget('obj:dorm_bed', bedPrompt) && null;
      return say('', ['室友的床，还没人来。']);
    }
    if (ch === 'C') return tryTarget('obj:canteen_counter', () => say('食堂师傅', S.done.includes('c2a') ? ['吃饱了吧？下回再来！'] : ['同学刷卡打饭！营业时间和支付方式待补真实信息。']));
    if (ch === 'S') return tryTarget('obj:board_' + S.inBuilding, () => say('', ['【' + (GD.enterable[S.inBuilding].title || '') + '】打卡板：' + (S.done.some(d => d.startsWith('c3')) ? '已经来过了。' : '找教室是第三章的任务。') + '教室编号规则待补真实信息。']));
    if (ch === 'K') return say('', ['黑板上写着：欢迎新同学！']);
    if (ch === 'd') return say('', ['值班台。']);
    if (ch === 'L') return say('', ['衣柜，空的。']);
  }
  function bedPrompt() { say('', ['这是你的床。要在这里存档吗？'], null, [{ label: '存档', fn: () => { save('bed'); SFX.ok(); } }, { label: '算了', fn: () => SFX.cancel() }]); }
  function talkNpc(n) {
    n.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[S.p.dir];
    if (n.guard) { const ri = regionAt[n.y * W + n.x]; const r = regions[ri]; return say(n.name, ['你现在在【' + (r ? r.id + ' ' + r.name : '校园道路') + '】。', '迷路了就回到路上，站到路牌前按 Z 看方向。'], () => n.dir = n.home); }
    const key = 'npc:' + n.id;
    say(n.name, n.lines, () => { n.dir = n.home; tryTarget(key); });
  }
  function useDesk(e) {
    const key = 'obj:' + e.id; const t = curTask();
    if (t && t.target === key) return say('迎新志愿者', ['这里是' + e.label + e.note + '。', '好的，办好了！'], () => completeTask(t));
    const doneMap = { desk_report: 'c1a', desk_card: 'c1b', desk_supply: 'c1c' };
    if (S.done.includes(doneMap[e.id])) return say('迎新志愿者', [e.label + '：你已经办过啦。']);
    if (S.ch === 0) return say('迎新志愿者', ['这里是' + e.label + e.note + '。先找迎新学长报个到吧，他就在广场中间。']);
    return say('迎新志愿者', ['这里是' + e.label + e.note + '。按顺序来：先完成【' + (t ? t.card : '') + '】。']);
  }
  function arrow(dx, dy) { const a = Math.atan2(dy, dx) * 180 / Math.PI; const ar = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗']; return ar[((Math.round(a / 45) % 8) + 8) % 8]; }
  function readSign(s) {
    const list = landmarks.map(l => ({ l, d: Math.hypot(l.x - s.x, l.y - s.y) })).sort((a, b) => a.d - b.d).slice(0, 5);
    S.overlay = { kind: 'sign', t: 0, title: s.title, rows: list.map(({ l, d }) => arrow(l.x - s.x, l.y - s.y) + ' ' + l.name + '  约' + Math.round(d * 3 / 10) * 10 + '米') };
    SFX.ok();
  }
  function enterDoor(b) {
    const en = GD.enterable[b.id];
    if (!en) return say('', ['【' + b.name + '】', '室内暂未开放（MVP 只做宿舍、食堂、教学楼）。']);
    if (en.need && !S.items.includes(en.need)) { SFX.bump(); return say('', [en.needMsg]); }
    transition(() => { S.scene = en.interior; S.inBuilding = b.id; S.retDoor = b.door; const I = interiors[en.interior]; placePlayer(9, I.h - 2, 'up'); save('auto'); });
    SFX.door();
  }
  function exitInterior() {
    const b = byId[S.inBuilding]; transition(() => { S.scene = 'outdoor'; placePlayer(b.door[0], b.door[1] + 1, 'down'); S.inBuilding = null; reveal(S.p.x, S.p.y); save('auto'); });
    SFX.door();
  }
  function transition(cb) { S.fade = 0.0001; S.fadeCb = cb; }

  // ---------- 移动 ----------
  function blockedAt(x, y) {
    if (S.scene === 'outdoor') { if (x < 0 || y < 0 || x >= W || y >= H) return true; const i = y * W + x; return !WALK.has(ground[i]) || blockers.has(i); }
    const I = interiors[S.scene]; const ch = (I.map[y] || '')[x]; if (ch === undefined) return true;
    return SOLID_IN.has(ch) || I.npcs.some(n => n.x === x && n.y === y);
  }
  let bumpCd = 0;
  function updatePlayer(dt, inp) {
    const p = S.p;
    if (p.moving) {
      const sp = (p.run ? 9 : 5) * T; p.t += sp * dt / T;
      p.anim += dt * (p.run ? 14 : 8);
      if (p.t >= 1) { p.x = p.tx; p.y = p.ty; p.fx = p.x * T; p.fy = p.y * T; p.moving = false; arrived(); }
      else { p.fx = (p.x + (p.tx - p.x) * p.t) * T; p.fy = (p.y + (p.ty - p.y) * p.t) * T; }
      if (p.moving) return;
    }
    const d = inp.dir;
    if (!d) { p.hold = 0; return; }
    p.hold += dt;
    if (d !== p.dir && p.hold < 0.08 && !p.wasMoving) { p.dir = d; return; }
    p.dir = d; p.run = inp.run;
    const [a, b] = DIRS[d]; const nx = p.x + a, ny = p.y + b;
    if (blockedAt(nx, ny)) {
      p.wasMoving = false;
      if (S.scene === 'outdoor') { const bd = doorAt.get(ny * W + nx); if (bd && GD.enterable[bd.id]) { enterDoor(bd); return; } }
      if (bumpCd <= 0) { SFX.bump(); bumpCd = 0.35; }
      return;
    }
    p.moving = true; p.wasMoving = true; p.tx = nx; p.ty = ny; p.t = 0;
  }
  function arrived() {
    const p = S.p;
    if (S.scene === 'outdoor') {
      reveal(p.x, p.y);
      const g = ground[p.y * W + p.x]; SFX.step(g === G.GRASS || g === G.BELT || g === G.INFIELD ? 'grass' : g === G.TRACK ? 'track' : 'pave');
      const ri = regionAt[p.y * W + p.x];
      if (ri !== S.curRegion) { if (ri >= 0) S.plate = { text: regions[ri].id + ' · ' + regions[ri].name, t: 0 }; S.curRegion = ri; }
    } else {
      SFX.step('pave');
      if (interiors[S.scene].map[p.y][p.x] === 'E') exitInterior();
    }
  }

  // ---------- 输入 ----------
  const held = new Set(); let pressed = [];
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'A', Space: 'A', KeyX: 'B', Escape: 'B', Enter: 'menu', KeyM: 'map', KeyI: 'bag', KeyN: 'mute', ShiftLeft: 'run', ShiftRight: 'run' };
  addEventListener('keydown', e => { const k = KEYMAP[e.code]; if (!k) return; e.preventDefault(); AUDIO.init(); if (!held.has(k)) pressed.push(k); held.add(k); });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) held.delete(k); });
  addEventListener('blur', () => held.clear());
  const order = ['up', 'down', 'left', 'right']; let lastDir = null;
  function readInput() {
    let dir = null;
    if (lastDir && held.has(lastDir)) dir = lastDir; else { dir = order.find(d => held.has(d)) || null; lastDir = dir; }
    for (const k of pressed) if (order.includes(k)) lastDir = k;
    if (lastDir && held.has(lastDir)) dir = lastDir;
    return { dir, run: held.has('run') || held.has('Bhold'), pressed: pressed.splice(0) };
  }
  // 手机：虚拟摇杆 + A/B
  window.TOUCH = {
    setDir(d) { for (const k of order) held.delete(k); if (d) { if (!held.has(d)) pressed.push(d); held.add(d); } },
    press(k) { AUDIO.init(); pressed.push(k); if (k === 'B') held.add('Bhold'); },
    release(k) { if (k === 'B') held.delete('Bhold'); }
  };

  // ---------- 主循环 ----------
  const cvs = document.getElementById('screen'), ctx = cvs.getContext('2d');
  const [buf, bx] = ART.cv(VW, VH);
  let scale = 3;
  function resize() {
    const w = innerWidth, h = innerHeight; let s = Math.floor(Math.min(w / VW, h / VH)); if (s < 2) s = Math.min(w / VW, h / VH);
    scale = Math.max(1, s); cvs.width = Math.round(VW * scale); cvs.height = Math.round(VH * scale);
    cvs.style.width = cvs.width + 'px'; cvs.style.height = cvs.height + 'px';
    if (S.dialog) S.dialog.laid = false;
  }
  addEventListener('resize', resize); resize();
  cvs.addEventListener('pointerdown', () => { AUDIO.init(); if (S.mode === 'title') pressed.push('A'); });

  function handleUI(inp) {
    for (const k of inp.pressed) {
      if (k === 'mute') { const m = AUDIO.toggle(); toast(m ? '已静音' : '声音已开'); continue; }
      if (S.mode === 'title') {
        const opts = titleOpts();
        if (k === 'up' || k === 'down') { S.titleSel = (S.titleSel + (k === 'up' ? -1 : 1) + opts.length) % opts.length; SFX.type(); }
        if (k === 'A' || k === 'menu') { SFX.ok(); opts[S.titleSel].fn(); }
        continue;
      }
      if (S.fade) continue;
      if (S.dialog) {
        const d = S.dialog;
        if (d.choices && d.i === d.pages.length - 1 && (k === 'up' || k === 'down' || k === 'left' || k === 'right')) { d.sel = (d.sel + 1) % d.choices.length; SFX.type(); }
        else if (k === 'A') dialogAdvance();
        else if (k === 'B') { if (d.choices) { d.sel = d.choices.length - 1; dialogAdvance(); } else { const page = d.pages[d.i]; if (page && d.shown < page.join('').length) d.shown = 999; else dialogAdvance(); } }
        continue;
      }
      if (S.overlay) {
        const o = S.overlay;
        if (o.kind === 'stamp') { if (o.t > 0.6 && (k === 'A' || k === 'B')) { S.overlay = null; o.cb(); } continue; }
        if (o.kind === 'bag') { if (k === 'up' || k === 'down') { S.bagSel = Math.max(0, Math.min(S.items.length - 1, S.bagSel + (k === 'up' ? -1 : 1))); SFX.type(); } if (k === 'B' || k === 'bag' || k === 'A') { S.overlay = null; SFX.cancel(); } continue; }
        if (o.kind === 'map') { if (k === 'B' || k === 'map' || k === 'A') { S.overlay = null; SFX.cancel(); } continue; }
        if (o.kind === 'menu') {
          if (k === 'B' || k === 'menu') { S.overlay = null; SFX.cancel(); continue; }
          if (k === 'up' || k === 'down') { S.menuSel = (S.menuSel + (k === 'up' ? -1 : 1) + 4) % 4; SFX.type(); }
          if (k === 'A') { const s = S.menuSel; S.overlay = null; if (s === 0) S.overlay = { kind: 'map', t: 0 }; if (s === 1) S.overlay = { kind: 'bag', t: 0 }; if (s === 2) S.overlay = { kind: 'book', t: 0 }; if (s === 3) { const m = AUDIO.toggle(); toast(m ? '已静音' : '声音已开'); } SFX.ok(); }
          continue;
        }
        if (o.kind === 'chapter') { if (o.t > 0.8 && k === 'A') { S.overlay = null; if (!S.finished) showCard(); else say('', ['MVP 到这里结束：序章到第三章已完成！', '第四章“图书馆日”到第七章待续。按 M 看看你点亮的地图吧。']); } continue; }
        if (k === 'A' || k === 'B' || (o.kind === 'card' && k === 'menu')) { S.overlay = null; SFX.cancel(); }
        continue;
      }
      if (S.p.moving && k === 'A') { S.queuedA = true; continue; }
      if (k === 'A') interact();
      if (k === 'map') { S.overlay = { kind: 'map', t: 0 }; SFX.ok(); }
      if (k === 'bag') { S.overlay = { kind: 'bag', t: 0 }; S.bagSel = 0; SFX.ok(); }
      if (k === 'menu') { S.overlay = { kind: 'menu', t: 0 }; S.menuSel = 0; SFX.ok(); }
    }
  }
  function titleOpts() { const o = [{ label: '新的开始', fn: () => { newGame(); } }]; if (hasSave()) o.unshift({ label: '继续游戏', fn: () => { if (!load()) newGame(); } }); return o; }
  function toast(t) { S.toast = { text: t, t: 0 }; }

  let last = performance.now(), titleT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const inp = readInput();
    handleUI(inp);
    if (bumpCd > 0) bumpCd -= dt;
    if (S.mode === 'title') { titleT += dt; AUDIO.setTheme('south'); }
    else {
      if (S.fade) { S.fade += dt * 3; if (S.fade >= 1 && S.fadeCb) { const c = S.fadeCb; S.fadeCb = null; c(); } if (S.fade >= 2) S.fade = 0; }
      if (!S.dialog && !S.overlay && !S.fade) { updatePlayer(dt, inp); if (S.queuedA && !S.p.moving) { S.queuedA = false; interact(); } }
      else if (S.p.moving) updatePlayer(dt, { dir: null });
      if (!S.overlay || S.overlay.kind === 'card') S.minutes += dt / 6; // 1 秒 = 10 游戏秒
      if (S.minutes >= 24 * 60) { S.minutes -= 24 * 60; S.day++; }
      if (S.plate) { S.plate.t += dt; if (S.plate.t > 3) S.plate = null; }
      if (S.overlay) S.overlay.t += dt;
      if (S.dialog) { const d = S.dialog; const page = d.pages[d.i]; if (page) { const len = page.join('').length; if (d.shown < len) { const before = Math.floor(d.shown); d.shown += dt * 40; if (Math.floor(d.shown) !== before && before % 2 === 0) SFX.type(); } } }
      AUDIO.setTheme(S.scene !== 'outdoor' ? 'inside' : (S.p.y < 140 ? 'north' : 'south'));
    }
    if (S.scene === 'outdoor' && !S.overlay) {
      const [cx, cy] = camera();
      for (const o of outdoorObjs) { const X = o.x * T - cx + (o.w || 1) * 8, Y = o.y * T - cy - 16; if (X < -40 || X > VW + 40 || Y < -20 || Y > VH) continue; ctx.font = `bold ${U(6)}px ${FONT}`; const tw = ctx.measureText(o.label).width / sc + 8; ctx.fillStyle = 'rgba(26,28,44,0.85)'; ctx.fillRect(U(X - tw / 2), U(Y - 1), U(tw), U(9)); text(o.label, X, Y - 0.5, 6, P.cyan, 'center', true); }
    }
    if (S.toast) { S.toast.t += dt; if (S.toast.t > 2) S.toast = null; }
    render(dt);
    requestAnimationFrame(frame);
  }

  // ---------- 渲染：世界 ----------
  const [fogPat] = ART.cv(16, 16); { const x = fogPat.getContext('2d'); x.fillStyle = 'rgba(51,60,87,0.66)'; x.fillRect(0, 0, 16, 16); x.fillStyle = 'rgba(148,176,194,0.25)'; for (let i = 0; i < 16; i += 2) for (let j = (i / 2) % 2; j < 16; j += 4) x.fillRect(j, i, 1, 1); }
  function camera() { const p = S.p; let cx = p.fx + 8 - VW / 2, cy = p.fy + 8 - VH / 2; if (S.scene === 'outdoor') { cx = Math.max(0, Math.min(W * T - VW, cx)); cy = Math.max(0, Math.min(H * T - VH, cy)); } else { const I = interiors[S.scene]; cx = (I.w * T - VW) / 2; cy = (I.h * T - VH) / 2; } return [Math.round(cx), Math.round(cy)]; }
  function drawOutdoor(cx, cy) {
    const x0 = Math.floor(cx / T), y0 = Math.floor(cy / T), x1 = Math.ceil((cx + VW) / T), y1 = Math.ceil((cy + VH) / T);
    const trees = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x, g = ground[i], sx = x * T - cx, sy = y * T - cy, v = hash(x, y) % 4;
      if (g === G.BUILD) {
        const bi = bidAt[i], b = B[bi], st = b.st || (b.st = ART.styleOf(b));
        const same = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && ground[Y * W + X] === G.BUILD && bidAt[Y * W + X] === bi;
        const e = (same(x, y - 1) ? 0 : 1) | (same(x + 1, y) ? 0 : 2) | (same(x, y + 1) ? 0 : 4) | (same(x - 1, y) ? 0 : 8);
        const f = facade[i];
        const dr = doorAt.get(i) === b ? (GD.enterable[b.id] ? 2 : 1) : 0;
        bx.drawImage(f >= 0 ? ART.wallTile(st, f, e & 10, dr) : ART.roofTile(st, e, v), sx, sy);
        continue;
      }
      if (g === G.TREE) { bx.drawImage(ART.tiles[3][v], sx, sy); trees.push([sx, sy - 8, y]); continue; }
      if (g === G.POLE) { bx.drawImage(ART.tiles[11][0], sx, sy); continue; }
      const set = ART.tiles[g] || ART.tiles[1]; bx.drawImage(set[v], sx, sy);
      if (g === G.ROAD) { // 路缘
        bx.fillStyle = P.grey;
        if (y > 0 && ground[i - W] !== G.ROAD && ground[i - W] !== G.WALL) bx.fillRect(sx, sy, 16, 1);
        if (y < H - 1 && ground[i + W] !== G.ROAD && ground[i + W] !== G.WALL) bx.fillRect(sx, sy + 15, 16, 1);
        if (x > 0 && ground[i - 1] !== G.ROAD && ground[i - 1] !== G.WALL) bx.fillRect(sx, sy, 1, 16);
        if (x < W - 1 && ground[i + 1] !== G.ROAD && ground[i + 1] !== G.WALL) bx.fillRect(sx + 15, sy, 1, 16);
      }
    }
    // 球场划线
    bx.strokeStyle = P.white; bx.lineWidth = 1;
    for (const f of MD.fields) {
      if (/跑道|田径场|看台|停车|广场/.test(f.name)) continue;
      const X = f.x0 * T - cx + 2.5, Y = f.y0 * T - cy + 2.5, w = (f.x1 - f.x0 + 1) * T - 5, h = (f.y1 - f.y0 + 1) * T - 5;
      if (X > VW || Y > VH || X + w < 0 || Y + h < 0) continue;
      bx.strokeRect(X, Y, w, h);
      if (h > w) { bx.beginPath(); bx.moveTo(X, Y + h / 2); bx.lineTo(X + w, Y + h / 2); bx.stroke(); } else { bx.beginPath(); bx.moveTo(X + w / 2, Y); bx.lineTo(X + w / 2, Y + h); bx.stroke(); }
      if (!/网球/.test(f.name)) { bx.fillStyle = P.green; bx.fillRect(X + w / 2 - 2, Y - 1, 4, 2); bx.fillRect(X + w / 2 - 2, Y + h - 1, 4, 2); } // 绿色篮架
    }
    // 实体（按 y 排序）
    const ents = [];
    for (const n of outdoorNpcs) ents.push({ y: n.y, draw: () => drawChar(n.look, n.dir, 'idle', 0, n.x * T - cx, n.y * T - cy - 8) });
    for (const s of signs) ents.push({ y: s.y, draw: () => drawSign(s.x * T - cx, s.y * T - cy) });
    for (const o of outdoorObjs) ents.push({ y: o.y, draw: () => drawDesk(o, o.x * T - cx, o.y * T - cy) });
    for (const t of trees) ents.push({ y: t[2], draw: () => bx.drawImage(ART.treeImg, t[0], t[1]) });
    ents.push({ y: flag[1], draw: () => drawFlag(flag[0] * T - cx, flag[1] * T - cy) });
    ents.push({ y: S.p.fy / T + 0.01, draw: drawPlayer(cx, cy) });
    ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
    // 迷雾
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; if (!S.fog[y * W + x]) bx.drawImage(fogPat, x * T - cx, y * T - cy); }
  }
  function drawChar(look, dir, mode, f, X, Y) { ART.shadow(bx, X, Y); bx.drawImage(ART.charSprite(look, dir, mode, f), X, Y); }
  function drawPlayer(cx, cy) { return () => { const p = S.p; const mode = p.moving ? (p.run ? 'run' : 'walk') : 'idle'; const n = mode === 'run' ? 6 : 4; drawChar(0, p.dir, mode, mode === 'idle' ? 0 : Math.floor(p.anim) % n, Math.round(p.fx - cx), Math.round(p.fy - cy - 8)); }; }
  function drawSign(X, Y) { bx.fillStyle = P.wood; bx.fillRect(X + 7, Y + 6, 2, 10); bx.fillStyle = P.ink; bx.fillRect(X + 1, Y - 3, 14, 10); bx.fillStyle = P.dgreen; bx.fillRect(X + 2, Y - 2, 12, 8); bx.fillStyle = P.white; bx.fillRect(X + 4, Y, 8, 1); bx.fillRect(X + 4, Y + 3, 6, 1); }
  function drawDesk(o, X, Y) { const w = (o.w || 1) * T; bx.fillStyle = P.ink; bx.fillRect(X, Y + 2, w, 12); bx.fillStyle = P.white; bx.fillRect(X + 1, Y + 3, w - 2, 5); bx.fillStyle = P.red; bx.fillRect(X + 1, Y + 8, w - 2, 5); bx.fillStyle = P.yellow; bx.fillRect(X + 3, Y + 10, w - 6, 1); bx.fillStyle = P.sky; bx.fillRect(X + 4, Y - 6, w - 8, 6); bx.fillStyle = P.ink; bx.fillRect(X + 4, Y - 6, w - 8, 1); }
  function drawFlag(X, Y) { const t = performance.now() / 300; bx.fillStyle = P.ink; bx.fillRect(X + 5, Y + 12, 6, 3); bx.fillStyle = P.mist; bx.fillRect(X + 7, Y - 40, 2, 53); bx.fillStyle = P.red; for (let i = 0; i < 12; i++) bx.fillRect(X + 9 + i, Y - 40 + Math.round(Math.sin(t + i / 2)), 1, 8); bx.fillStyle = P.yellow; bx.fillRect(X + 11, Y - 38, 2, 2); }
  function drawInterior(cx, cy) {
    const I = interiors[S.scene]; bx.fillStyle = P.ink; bx.fillRect(0, 0, VW, VH);
    for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) bx.drawImage(I.tiles[y][x], x * T - cx, y * T - cy);
    const ents = I.npcs.map(n => ({ y: n.y, draw: () => drawChar(n.look, n.dir || 'down', 'idle', 0, n.x * T - cx, n.y * T - cy - 8) }));
    ents.push({ y: S.p.fy / T + 0.01, draw: drawPlayer(cx, cy) }); ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  }

  // ---------- 渲染：UI（显示分辨率，像素风框） ----------
  let sc = 3;
  const U = v => Math.round(v * sc);
  function box(x, y, w, h, fill = P.cream, border = P.ink) { ctx.fillStyle = border; ctx.fillRect(U(x), U(y), U(w), U(h)); ctx.fillStyle = P.white; ctx.fillRect(U(x + 1), U(y + 1), U(w - 2), U(h - 2)); ctx.fillStyle = fill; ctx.fillRect(U(x + 2), U(y + 2), U(w - 4), U(h - 4)); }
  function text(t, x, y, size = 8, color = P.ink, align = 'left', bold = false) { ctx.font = `${bold ? 'bold ' : ''}${U(size)}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(t, U(x), U(y)); }
  function textO(t, x, y, size, color, align = 'left', ol = P.ink) { ctx.font = `bold ${U(size)}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillStyle = ol; for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) ctx.fillText(t, U(x) + a * Math.max(1, sc / 2), U(y) + b * Math.max(1, sc / 2)); ctx.fillStyle = color; ctx.fillText(t, U(x), U(y)); }
  const fmtClock = () => { const m = Math.floor(S.minutes); return '第' + S.day + '天 ' + String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  function curRegionName() { if (S.scene !== 'outdoor') return interiors[S.scene].title.split(' · ')[0] === '公共教学楼' ? (GD.enterable[S.inBuilding].title || '') : interiors[S.scene].title; const r = regions[regionAt[S.p.y * W + S.p.x]]; return r ? r.id + ' ' + r.name : '校园道路'; }
  function drawHUD() {
    // 右上角时钟和分区名
    const rn = curRegionName(); ctx.font = `${U(7)}px ${FONT}`; const w = Math.max(70, ctx.measureText(rn).width / sc + 12);
    box(VW - w - 3, 3, w, 25, P.cream); text(fmtClock(), VW - 9, 6, 7, P.navy, 'right', true); text(rn, VW - 9, 16, 6.5, P.ink, 'right');
    // 左上任务卡（无箭头）
    const t = curTask();
    if (t || S.finished) { const s = S.finished ? 'MVP 主线完成' : '任务：' + t.card; ctx.font = `${U(7)}px ${FONT}`; const tw = ctx.measureText(s).width / sc + 14; box(3, S.plate ? 30 : 3, tw, 15, P.yellow); text(s, 9, (S.plate ? 30 : 3) + 4, 7, P.ink, 'left', true); }
    // 地名牌
    if (S.plate) { const k = Math.min(1, S.plate.t * 4, (3 - S.plate.t) * 4); ctx.font = `bold ${U(8)}px ${FONT}`; const tw = ctx.measureText(S.plate.text).width / sc + 18; const y = -26 + 29 * k; box(3, y, tw, 24, P.paveL); ctx.fillStyle = P.wood; ctx.fillRect(U(3), U(y + 20), U(tw), U(4)); text(S.plate.text, 12, y + 6, 8, P.ink, 'left', true); }
    // 门牌：靠近有门的楼时显示楼名
    if (S.scene === 'outdoor' && !S.dialog && !S.overlay) {
      const [cx, cy] = camera(); let best = null;
      for (const b of B) if (b.door) { const d = Math.hypot(b.door[0] - S.p.x, b.door[1] - S.p.y); if (d < 4.5 && (!best || d < best.d)) best = { b, d }; }
      if (best) { const b = best.b; const X = b.door[0] * T - cx + 8, Y = b.door[1] * T - cy - 10; ctx.font = `bold ${U(6.5)}px ${FONT}`; const tw = ctx.measureText(b.name).width / sc + 8; ctx.fillStyle = 'rgba(26,28,44,0.85)'; ctx.fillRect(U(X - tw / 2), U(Y - 2), U(tw), U(11)); text(b.name, X, Y - 0.5, 6.5, GD.enterable[b.id] ? P.yellow : P.white, 'center', true); }
    }
    if (S.scene === 'outdoor' && !S.overlay) {
      const [cx, cy] = camera();
      for (const o of outdoorObjs) { const X = o.x * T - cx + (o.w || 1) * 8, Y = o.y * T - cy - 16; if (X < -40 || X > VW + 40 || Y < -20 || Y > VH) continue; ctx.font = `bold ${U(6)}px ${FONT}`; const tw = ctx.measureText(o.label).width / sc + 8; ctx.fillStyle = 'rgba(26,28,44,0.85)'; ctx.fillRect(U(X - tw / 2), U(Y - 1), U(tw), U(9)); text(o.label, X, Y - 0.5, 6, P.cyan, 'center', true); }
    }
    if (S.toast) { const a = Math.min(1, (2 - S.toast.t) * 3); ctx.globalAlpha = a; ctx.font = `${U(7)}px ${FONT}`; const tw = ctx.measureText(S.toast.text).width / sc + 12; box(VW - tw - 3, VH - 20, tw, 16, P.lime); text(S.toast.text, VW - tw / 2 - 3, VH - 16, 7, P.ink, 'center'); ctx.globalAlpha = 1; }
  }
  function drawDialog() {
    const d = S.dialog; layoutDialog(ctx, sc); const page = d.pages[d.i] || [];
    const y0 = VH - 50; box(4, y0, VW - 8, 46, P.cream);
    if (d.speaker) { ctx.font = `bold ${U(7)}px ${FONT}`; const tw = ctx.measureText(d.speaker).width / sc + 12; box(10, y0 - 11, tw, 14, P.yellow); text(d.speaker, 16, y0 - 8, 7, P.ink, 'left', true); }
    let left = Math.floor(d.shown);
    page.forEach((ln, k) => { const s = ln.slice(0, Math.max(0, left)); left -= ln.length; text(s, 14, y0 + 9 + k * 14, 8, P.ink); });
    const full = d.shown >= page.join('').length;
    if (full && d.choices && d.i === d.pages.length - 1) { const w = 56; box(VW - w - 8, y0 - 6 - d.choices.length * 13, w, d.choices.length * 13 + 6, P.white); d.choices.forEach((c, k) => text((k === d.sel ? '▶ ' : '   ') + c.label, VW - w - 2, y0 - 2 - d.choices.length * 13 + k * 13, 7.5, P.ink)); }
    else if (full && Math.floor(performance.now() / 300) % 2) { ctx.fillStyle = P.red; ctx.fillRect(U(VW - 18), U(y0 + 36), U(5), U(3)); ctx.fillRect(U(VW - 17), U(y0 + 39), U(3), U(1)); }
  }
  // 地图
  const [mapImg, mx] = ART.cv(W, H); const mapData = mx.createImageData(W, H);
  const MAPCOL = { 0: P.wood, 1: P.asph, 2: P.pave, 3: P.grass, 4: P.dgreen, 5: P.brick, 6: P.blue, 7: P.green, 9: P.yellow, 10: P.asphD, 11: P.paveL, 12: P.dslate, 13: P.dgreen, 14: P.navy, 15: P.red, 18: P.teal };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function buildMapImg() {
    const fogC = hex(P.dslate), fogC2 = hex(P.slate);
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i / W) | 0; let c;
      if (!S.fog[i]) c = ((x + y) % 2) ? fogC : fogC2;
      else if (ground[i] === G.BUILD) { const b = B[bidAt[i]]; const st = b.st || (b.st = ART.styleOf(b)); c = hex(facade[i] >= 0 ? st.wall : st.roof); }
      else c = hex(MAPCOL[ground[i]] || P.asph);
      mapData.data.set([c[0], c[1], c[2], 255], i * 4);
    }
    mx.putImageData(mapData, 0, 0);
  }
  function drawMap() {
    if (!S.overlay.built) { buildMapImg(); S.overlay.built = true; }
    ctx.fillStyle = P.ink; ctx.fillRect(0, 0, cvs.width, cvs.height);
    const mh = VH - 12, k = mh / H, mw = W * k, X = 8, Y = 6;
    box(X - 3, Y - 3, mw + 6, mh + 6, P.dslate);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(mapImg, U(X), U(Y), U(mw), U(mh));
    // 已点亮分区的名称
    for (let ri = 0; ri < regions.length; ri++) {
      const r = regions[ri]; const tl = regionTiles[ri]; if (!tl.length) continue; let n = 0; for (const i of tl) n += S.fog[i];
      if (n / tl.length < 0.35 && !S.stamps.includes(r.id)) continue;
      if (r.kind !== '建设组团') continue;
      textO(r.id, X + r.cx * k, Y + r.cy * k - 3, 5.5, S.stamps.includes(r.id) ? P.yellow : P.white, 'center');
    }
    if (S.scene === 'outdoor' || S.inBuilding) { const px = S.scene === 'outdoor' ? S.p.x : byId[S.inBuilding].door[0], py = S.scene === 'outdoor' ? S.p.y : byId[S.inBuilding].door[1]; if (Math.floor(performance.now() / 250) % 2) { ctx.fillStyle = P.red; ctx.fillRect(U(X + px * k - 2), U(Y + py * k - 2), U(4), U(4)); ctx.fillStyle = P.white; ctx.fillRect(U(X + px * k - 1), U(Y + py * k - 1), U(2), U(2)); } }
    // 右侧信息
    const RX = X + mw + 12, RW = VW - RX - 6; box(RX, 6, RW, VH - 12, P.cream);
    text('校园地图', RX + 8, 12, 9, P.navy, 'left', true);
    text('北工大房山新校区 · 已点亮 ' + (fogCount() / (W * H) * 100).toFixed(1) + '%', RX + 8, 26, 6.5, P.ink);
    text('分区章 ' + S.stamps.length + ' / 24', RX + 8, 37, 6.5, P.ink);
    text('当前位置：' + curRegionName(), RX + 8, 48, 6.5, P.ink);
    const t = curTask(); text('任务卡：' + (t ? t.card : '主线 MVP 已完成'), RX + 8, 62, 7, P.red, 'left', true);
    if (t) { wrap(t.hint, RX + 8, 74, RW - 14, 6.5, P.ink, 9); }
    text('只显示你走过、点亮过的地方。', RX + 8, VH - 34, 6, P.slate);
    text('红点是你。黄色分区号＝已盖章。', RX + 8, VH - 25, 6, P.slate);
    text('M / X 关闭', RX + 8, VH - 16, 6, P.slate);
  }
  function wrap(s, x, y, w, size, color, lh) { ctx.font = `${U(size)}px ${FONT}`; let cur = '', yy = y; for (const ch of s) { if (ctx.measureText(cur + ch).width > U(w)) { text(cur, x, yy, size, color); cur = ch; yy += lh; } else cur += ch; } if (cur) text(cur, x, yy, size, color); return yy + lh; }
  function drawBag() {
    box(30, 14, VW - 60, VH - 28, P.cream); text('背包 · 关键道具', 42, 22, 9, P.navy, 'left', true);
    if (!S.items.length) text('空空如也。去旗杆广场迎新点看看吧。', 42, 44, 7.5, P.ink);
    S.items.forEach((it, k) => { const y = 40 + k * 14; if (k === S.bagSel) { ctx.fillStyle = P.yellow; ctx.fillRect(U(40), U(y - 2), U(80), U(13)); } text(it, 46, y, 7.5, P.ink, 'left', k === S.bagSel); });
    if (S.items[S.bagSel]) wrap(GD.items[S.items[S.bagSel]] || '', 128, 42, VW - 170, 6.5, P.ink, 10);
    text('I / X 关闭', VW - 42, VH - 26, 6, P.slate, 'right');
  }
  function drawBook() {
    box(20, 10, VW - 40, VH - 20, P.cream); text('章册 · 24 个分区章', 32, 17, 9, P.navy, 'left', true);
    regions.forEach((r, k) => { const col = k % 6, row = (k / 6) | 0; const X = 34 + col * 44, Y = 34 + row * 32; const got = S.stamps.includes(r.id);
      ctx.fillStyle = got ? P.red : P.mist; ctx.beginPath(); ctx.arc(U(X + 10), U(Y + 10), U(10), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = got ? P.cream : P.white; ctx.beginPath(); ctx.arc(U(X + 10), U(Y + 10), U(8), 0, Math.PI * 2); ctx.fill();
      text(r.id, X + 10, Y + 6, 6, got ? P.red : P.grey, 'center', true); });
    text('X 关闭', VW - 32, VH - 22, 6, P.slate, 'right');
  }
  function drawOverlay() {
    const o = S.overlay;
    if (o.kind === 'card') {
      const k = Math.min(1, o.t * 5); box(60, 40 - (1 - k) * 60, 200, 88, P.cream);
      ctx.fillStyle = P.yellow; ctx.fillRect(U(62), U(42 - (1 - k) * 60), U(196), U(16)); text('新任务卡 · ' + o.chapter, 70, 45 - (1 - k) * 60, 7, P.ink, 'left', true);
      text(o.task.card, 160, 64 - (1 - k) * 60, 12, P.red, 'center', true);
      wrap(o.task.hint, 72, 86 - (1 - k) * 60, 176, 7, P.ink, 11);
      text('Z 收起 · Enter 随时查看', 252, 116 - (1 - k) * 60, 5.5, P.slate, 'right');
    } else if (o.kind === 'stamp') {
      ctx.fillStyle = 'rgba(26,28,44,0.55)'; ctx.fillRect(0, 0, cvs.width, cvs.height);
      const s = o.t < 0.25 ? 2.2 - o.t * 4.8 : 1; const cx = VW / 2, cy = 76;
      ctx.save(); ctx.translate(U(cx), U(cy)); ctx.scale(s, s); ctx.rotate(-0.12);
      ctx.fillStyle = P.red; ctx.beginPath(); ctx.arc(0, 0, U(36), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = P.cream; ctx.beginPath(); ctx.arc(0, 0, U(31), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.red; ctx.beginPath(); ctx.arc(0, 0, U(29), 0, Math.PI * 2); ctx.fill();
      ctx.font = `bold ${U(13)}px ${FONT}`; ctx.fillStyle = P.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.region ? o.region.id : '打卡', 0, -U(6));
      ctx.font = `bold ${U(7)}px ${FONT}`; ctx.fillText('已打卡', 0, U(10)); ctx.restore();
      if (o.t > 0.3) { textO('打卡成功：' + o.task.card, VW / 2, 122, 9, P.yellow, 'center'); if (o.first && o.region) textO('点亮分区【' + o.region.id + ' ' + o.region.name + '】', VW / 2, 138, 7.5, P.white, 'center'); textO('按 Z 继续', VW / 2, 156, 6, P.mist, 'center'); }
    } else if (o.kind === 'chapter') {
      ctx.fillStyle = 'rgba(26,28,44,0.8)'; ctx.fillRect(0, 0, cvs.width, cvs.height);
      textO(o.title, VW / 2, 50, 14, P.yellow, 'center'); textO('完成！', VW / 2, 72, 12, P.white, 'center');
      textO(o.next ? '下一章：' + o.next : 'MVP 主线（序章～第三章）全部完成', VW / 2, 102, 8, P.cyan, 'center');
      textO('分区章 ' + S.stamps.length + '/24 · 已点亮 ' + (fogCount() / (W * H) * 100).toFixed(1) + '%', VW / 2, 120, 7, P.white, 'center');
      if (o.t > 0.8) textO('按 Z 继续', VW / 2, 146, 6.5, P.mist, 'center');
    } else if (o.kind === 'sign') {
      box(70, 30, 180, 30 + o.rows.length * 13, P.dgreen, P.ink); text('路牌 · ' + o.title, 80, 37, 7.5, P.yellow, 'left', true);
      o.rows.forEach((r, k) => text(r, 82, 52 + k * 13, 7.5, P.white));
    } else if (o.kind === 'map') drawMap();
    else if (o.kind === 'bag') drawBag();
    else if (o.kind === 'book') drawBook();
    else if (o.kind === 'menu') {
      const t = curTask(); box(150, 10, 166, 124, P.cream);
      text(GD.chapters[Math.min(S.ch, GD.chapters.length - 1)].title, 160, 16, 7.5, P.navy, 'left', true);
      text(t ? '任务卡：' + t.card : '主线 MVP 已完成', 160, 30, 8, P.red, 'left', true);
      if (t) wrap(t.hint, 160, 44, 148, 6.5, P.ink, 9);
      ['地图 (M)', '背包 (I)', '章册', AUDIO.muted ? '声音：关 (N)' : '声音：开 (N)'].forEach((s, k) => text((S.menuSel === k ? '▶ ' : '   ') + s, 164, 82 + k * 12, 7.5, P.ink));
    }
  }
  function drawTitle() {
    // 背景：缓慢平移的校园（图书馆—宿舍一带），压暗
    const ty = 108 * T - 90 + Math.cos(titleT / 9) * 40, tx = 46 * T + Math.sin(titleT / 7) * 220;
    const save = S.fog; S.fog = FULL; const p = S.p; const old = [p.fx, p.fy, p.x, p.y]; p.fx = -999; p.fy = -999;
    drawOutdoor(Math.round(tx), Math.round(ty)); S.fog = save; [p.fx, p.fy, p.x, p.y] = old;
    bx.fillStyle = 'rgba(26,28,44,0.55)'; bx.fillRect(0, 0, VW, VH);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);
    textO('点亮房山', VW / 2, 28, 30, P.yellow, 'center');
    textO('北工大房山新校区 · 新生探索像素 RPG', VW / 2, 70, 8, P.white, 'center');
    const opts = titleOpts();
    opts.forEach((o, k) => textO((S.titleSel === k ? '▶ ' : '  ') + o.label, VW / 2, 102 + k * 15, 9, S.titleSel === k ? P.cyan : P.mist, 'center'));
    if (Math.floor(titleT * 2) % 2) textO('按 Z / 空格 / 轻触 开始', VW / 2, 146, 6.5, P.white, 'center');
    textO('方向键/WASD 移动 · Z 确认 · X 取消 · Shift 跑 · M 地图 · I 背包 · Enter 菜单 · N 静音', VW / 2, 164, 5, P.mist, 'center');
  }
  const FULL = new Uint8Array(W * H).fill(1);
  function render() {
    sc = scale; ctx.imageSmoothingEnabled = false;
    if (S.mode === 'title') { drawTitle(); return; }
    const [cx, cy] = camera();
    if (S.scene === 'outdoor') drawOutdoor(cx, cy); else drawInterior(cx, cy);
    ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);
    drawHUD();
    if (S.overlay) drawOverlay();
    if (S.dialog) drawDialog();
    if (S.fade) { ctx.fillStyle = P.ink; ctx.globalAlpha = S.fade < 1 ? S.fade : 2 - S.fade; ctx.fillRect(0, 0, cvs.width, cvs.height); ctx.globalAlpha = 1; }
  }

  // 测试/调试接口（只读状态 + 传送）
  window.__game = {
    get state() { const t = curTask(); return { mode: S.mode, scene: S.scene, x: S.p.x, y: S.p.y, tx: S.p.moving ? S.p.tx : S.p.x, ty: S.p.moving ? S.p.ty : S.p.y, dir: S.p.dir, moving: S.p.moving, ch: S.ch, ti: S.ti, task: t && t.id, items: S.items.slice(), stamps: S.stamps.slice(), done: S.done.slice(), fog: fogCount(), dialog: !!S.dialog, overlay: S.overlay && S.overlay.kind, region: curRegionName() }; },
    teleport(x, y, dir) { S.scene = 'outdoor'; S.inBuilding = null; placePlayer(x, y, dir); reveal(x, y); },
    doors: () => Object.fromEntries(B.filter(b => b.door).map(b => [b.id, b.door])),
    npcs: () => outdoorNpcs.map(n => ({ id: n.id, x: n.x, y: n.y })),
    signs: () => signs.map(n => ({ title: n.title, x: n.x, y: n.y })),
    blocked: (x, y) => blockedAt(x, y),
    hasSave
  };
  requestAnimationFrame(frame);
})();

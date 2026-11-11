// 代码生成的像素美术：32 色限定调色板、16px 瓦片、16×24 人物四向行走/跑步帧。无外部素材。
(function () {
  const P = {
    ink: '#1a1c2c', plum: '#5d275d', red: '#b13e53', orange: '#ef7d57', yellow: '#ffcd75', lime: '#a7f070',
    green: '#38b764', teal: '#257179', navy: '#29366f', blue: '#3b5dc9', sky: '#41a6f6', cyan: '#73eff7',
    white: '#f4f4f4', mist: '#94b0c2', slate: '#566c86', dslate: '#333c57',
    brickD: '#8b4a3c', brick: '#b8644c', tan: '#d9a27e', paveL: '#e8dcc8', pave: '#c9bfa8', grey: '#9a9a9a',
    asph: '#6e6e73', asphD: '#4a4a50', dgreen: '#2e6b3a', grass: '#5fa05a', grassL: '#7cc46a', violet: '#c86fb0',
    cream: '#f7f0e0', gold: '#d8c050', wood: '#7a5236', glass: '#4b7fb5'
  };
  const PALETTE = Object.values(P); // 正好 32 色
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function px(x, c, X, Y, w = 1, h = 1) { x.fillStyle = c; x.fillRect(X, Y, w, h); }

  // ---------- 地面瓦片 ----------
  function groundTile(type, v) {
    const [c, x] = cv(16, 16); const r = rng(type * 977 + v * 131 + 7);
    const speck = (base, dots, n) => { px(x, base, 0, 0, 16, 16); for (let i = 0; i < n; i++) px(x, dots[(r() * dots.length) | 0], (r() * 16) | 0, (r() * 16) | 0); };
    switch (type) {
      case 1: speck(P.asph, [P.asphD, P.grey], 10); break; // 道路
      case 2: px(x, P.pave, 0, 0, 16, 16); px(x, P.paveL, 0, 0, 16, 1); px(x, P.paveL, 0, 0, 1, 16); if (v === 3) px(x, P.tan, 6, 11, 2, 1); if (v === 1) px(x, P.paveL, 9, 5, 1, 1); break;
      case 3: speck(P.grass, [P.grassL, P.dgreen], 14); if (v === 1) { px(x, P.violet, 4, 5); px(x, P.violet, 5, 4); px(x, P.violet, 11, 11); } if (v === 2) { px(x, P.cream, 9, 3); px(x, P.cream, 3, 12); } break;
      case 4: speck(P.dgreen, [P.grass, P.grassL], 22); if (v % 2) { px(x, P.violet, 3, 3); px(x, P.violet, 12, 9); px(x, P.violet, 7, 13); } break;
      case 5: px(x, P.brick, 0, 0, 16, 16); for (let i = 0; i < 6; i++) px(x, P.tan, (r() * 16) | 0, (r() * 16) | 0); break; // 篮球场
      case 6: px(x, P.blue, 0, 0, 16, 16); px(x, P.mist, 0, 4, 16, 1); px(x, P.mist, 0, 11, 16, 1); for (let i = 0; i < 5; i++) px(x, P.navy, (r() * 16) | 0, (r() * 16) | 0); break; // 蓝色跑道
      case 7: px(x, P.green, 0, 0, 16, 16); px(x, v % 2 ? P.grassL : P.grass, 0, 0, 16, 8); break; // 内场
      case 9: for (let i = 0; i < 16; i++) px(x, ((i >> 2) % 2) ? P.yellow : P.ink, i, 0, 1, 16); px(x, P.grey, 0, 0, 16, 2); px(x, P.grey, 0, 14, 16, 2); break; // 围挡
      case 0: speck(P.wood, [P.brickD, P.tan], 18); break; // 围挡内工地
      case 10: px(x, P.asphD, 0, 0, 16, 16); px(x, P.white, 0, 0, 1, 10); px(x, P.white, 8, 0, 1, 10); break; // 停车
      case 11: px(x, P.paveL, 0, 0, 16, 16); px(x, P.pave, 0, 15, 16, 1); px(x, P.pave, 15, 0, 1, 16); if (v === 1) px(x, P.cream, 3, 3, 4, 4); break; // 广场
      case 12: px(x, P.dgreen, 0, 0, 16, 16); px(x, P.dslate, 0, 3, 16, 2); for (let i = 1; i < 16; i += 4) px(x, P.dslate, i, 0, 2, 16); px(x, P.ink, 0, 15, 16, 1); break; // 校园围墙
      case 14: px(x, P.grey, 0, 0, 16, 16); for (let y = 1; y < 16; y += 4) for (let xx = 1; xx < 16; xx += 3) px(x, P.blue, xx, y, 2, 2); px(x, P.asphD, 15, 0, 1, 16); break; // 蓝座看台
      case 18: px(x, P.teal, 0, 0, 16, 16); for (let i = 0; i < 4; i++) px(x, P.green, (r() * 16) | 0, (r() * 16) | 0); break; // 网球场
      default: px(x, '#ff00ff', 0, 0, 16, 16);
    }
    return c;
  }
  const tiles = {};
  for (const t of [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 14, 18]) tiles[t] = [0, 1, 2, 3].map(v => groundTile(t, v));

  function tree() { // 16×24 树，白花乔木风格
    const [c, x] = cv(16, 24);
    px(x, P.wood, 7, 15, 2, 8); px(x, P.ink, 6, 22, 4, 1);
    const blob = [[4, 2, 8, 2], [2, 4, 12, 6], [1, 6, 14, 6], [3, 12, 10, 3]];
    for (const [a, b, w, h] of blob) px(x, P.dgreen, a, b, w, h);
    px(x, P.grass, 4, 4, 6, 4); px(x, P.grassL, 5, 4, 3, 2);
    for (const [a, b] of [[4, 7], [9, 5], [11, 9], [6, 11], [3, 10]]) px(x, P.cream, a, b);
    return c;
  }
  const treeImg = tree();

  // ---------- 建筑风格 ----------
  function styleOf(b) {
    const n = b.name;
    if (b.id === 'NB2-library') return { roof: P.white, roof2: P.mist, wall: P.white, win: P.sky, frame: P.mist, band: true };
    if (/钟塔/.test(n)) return { roof: P.paveL, roof2: P.pave, wall: P.paveL, win: P.glass, frame: P.tan, clock: true };
    if (/食堂/.test(n)) return { roof: P.mist, roof2: P.slate, wall: P.paveL, win: P.glass, frame: P.white, band: true };
    if (/宿舍/.test(n)) return { roof: P.brickD, roof2: P.ink, wall: P.brick, win: P.glass, frame: P.paveL, core: true };
    if (/公共教学楼/.test(n)) return { roof: P.mist, roof2: P.slate, wall: P.white, win: P.glass, frame: P.mist };
    if (/实验|学科/.test(n)) return { roof: P.grey, roof2: P.slate, wall: P.white, win: P.glass, frame: P.brick, base: P.brick };
    if (/体育馆/.test(n)) return { roof: P.white, roof2: P.mist, wall: P.dslate, win: P.slate, frame: P.white, vert: true };
    if (/行政/.test(n)) return { roof: P.grey, roof2: P.slate, wall: P.pave, win: P.glass, frame: P.paveL };
    if (/校医院/.test(n)) return { roof: P.mist, roof2: P.slate, wall: P.white, win: P.sky, frame: P.mist };
    if (/现状保留/.test(n)) return { roof: P.grey, roof2: P.asphD, wall: P.pave, win: P.slate, frame: P.grey };
    return { roof: P.wood, roof2: P.brickD, wall: P.tan, win: P.glass, frame: P.paveL };
  }
  // 屋顶瓦片：edges 位掩码 1上 2右 4下 8左（相邻不是同一栋）
  const roofCache = {};
  function roofTile(st, edges, v) {
    const k = st.roof + edges + v; if (roofCache[k]) return roofCache[k];
    const [c, x] = cv(16, 16); const r = rng(v * 31 + edges);
    px(x, st.roof, 0, 0, 16, 16);
    if (v === 3) { px(x, st.roof2, 5, 5, 6, 5); px(x, P.grey, 6, 6, 4, 3); }
    for (let i = 0; i < 3; i++) px(x, st.roof2, (r() * 16) | 0, (r() * 16) | 0);
    if (edges & 1) { px(x, P.ink, 0, 0, 16, 1); px(x, P.white, 0, 1, 16, 1); }
    if (edges & 8) px(x, P.ink, 0, 0, 1, 16);
    if (edges & 2) px(x, P.ink, 15, 0, 1, 16);
    if (edges & 4) px(x, st.roof2, 0, 15, 16, 1);
    return (roofCache[k] = c);
  }
  const wallCache = {};
  function wallTile(st, row, edges, door) {
    const k = st.wall + st.win + row + '_' + edges + '_' + door; if (wallCache[k]) return wallCache[k];
    const [c, x] = cv(16, 16);
    px(x, st.wall, 0, 0, 16, 16);
    if (st.vert) { for (let i = 1; i < 16; i += 3) px(x, st.win, i, 2, 1, 12); px(x, st.frame, 0, 0, 16, 2); }
    else if (st.band) { px(x, st.win, 0, 4, 16, 7); px(x, st.frame, 0, 4, 16, 1); px(x, st.frame, 0, 10, 16, 1); for (let i = 3; i < 16; i += 5) px(x, st.frame, i, 4, 1, 7); }
    else {
      for (const wx of [2, 9]) { px(x, st.frame, wx - 1, 3, 7, 8); px(x, st.win, wx, 4, 5, 6); px(x, P.cyan, wx, 4, 2, 1); px(x, st.frame, wx + 2, 4, 1, 6); }
    }
    if (st.core && row === 1) { px(x, P.paveL, 7, 0, 2, 16); }
    if (st.base && row === 0) { px(x, st.base, 0, 11, 16, 5); }
    if (st.clock && row >= 1) { px(x, P.ink, 4, 3, 8, 8); px(x, P.cream, 5, 4, 6, 6); px(x, P.ink, 8, 5, 1, 3); px(x, P.ink, 8, 7, 2, 1); }
    if (row === 0) px(x, P.ink, 0, 15, 16, 1);
    if (edges & 8) px(x, P.ink, 0, 0, 1, 16);
    if (edges & 2) px(x, P.ink, 15, 0, 1, 16);
    if (door) {
      px(x, P.ink, 4, 4, 8, 12); px(x, door === 2 ? P.cyan : P.slate, 5, 5, 6, 11); px(x, P.ink, 8, 5, 1, 11);
      px(x, P.gold, 3, 3, 10, 1);
    }
    return (wallCache[k] = c);
  }

  // ---------- 人物 ----------
  const LOOKS = [
    { hair: P.ink, skin: P.yellow, shirt: P.red, pants: P.navy, shoe: P.ink },        // 0 主角
    { hair: P.ink, skin: P.yellow, shirt: P.sky, pants: P.dslate, shoe: P.ink },      // 1 迎新学长（蓝色志愿者衫）
    { hair: P.brickD, skin: P.tan, shirt: P.orange, pants: P.slate, shoe: P.ink },    // 2 驿站小哥
    { hair: P.ink, skin: P.yellow, shirt: P.lime, pants: P.ink, shoe: P.white },      // 3 晨跑同学
    { hair: P.plum, skin: P.yellow, shirt: P.violet, pants: P.navy, shoe: P.ink },    // 4 社团部长
    { hair: P.grey, skin: P.tan, shirt: P.teal, pants: P.dslate, shoe: P.ink },       // 5 图书管理员
    { hair: P.ink, skin: P.tan, shirt: P.white, pants: P.blue, shoe: P.white },       // 6 体育老师
    { hair: P.grey, skin: P.tan, shirt: P.navy, pants: P.navy, shoe: P.ink },         // 7 保卫值班
    { hair: P.wood, skin: P.tan, shirt: P.violet, pants: P.slate, shoe: P.ink },      // 8 宿管阿姨
    { hair: P.white, skin: P.tan, shirt: P.white, pants: P.grey, shoe: P.ink }        // 9 食堂师傅
  ];
  const charCache = {};
  // dir: down/up/left/right; mode: walk(4 帧)/run(6 帧); f: 帧号
  function charSprite(look, dir, mode, f) {
    const k = look + dir + mode + f; if (charCache[k]) return charCache[k];
    const L = LOOKS[look] || LOOKS[0];
    const n = mode === 'run' ? 6 : 4;
    const phase = f / n * Math.PI * 2;
    const moving = mode !== 'idle';
    const amp = mode === 'run' ? 2 : 1.4;
    const sw = moving ? Math.round(Math.sin(phase) * amp) : 0;
    const bob = moving && (f % (n / 2) === 1) ? -1 : 0;
    const [c, x] = cv(16, 24);
    const o = bob;
    // 腿
    if (dir === 'down' || dir === 'up') {
      px(x, L.pants, 5, 17 + o, 3, 5 - Math.max(0, sw)); px(x, L.pants, 8, 17 + o, 3, 5 - Math.max(0, -sw));
      px(x, L.shoe, 5, 22 + o - Math.max(0, sw), 3, 1); px(x, L.shoe, 8, 22 + o - Math.max(0, -sw), 3, 1);
    } else {
      const s = dir === 'left' ? -1 : 1;
      px(x, L.pants, 6 + sw * s, 17 + o, 3, 5); px(x, L.pants, 7 - sw * s, 17 + o, 3, 5);
      px(x, L.shoe, 6 + sw * s + (s > 0 ? 1 : -1), 22 + o, 3, 1); px(x, L.shoe, 7 - sw * s + (s > 0 ? 1 : -1), 22 + o, 3, 1);
    }
    // 身体
    px(x, L.shirt, 4, 10 + o, 8, 7);
    if (dir === 'down' || dir === 'up') {
      px(x, L.shirt, 3, 11 + o + sw, 1, 4); px(x, L.shirt, 12, 11 + o - sw, 1, 4);
      px(x, L.skin, 3, 15 + o + sw, 1, 1); px(x, L.skin, 12, 15 + o - sw, 1, 1);
    } else {
      px(x, L.shirt, 7 + sw, 11 + o, 2, 4); px(x, L.skin, 7 + sw, 15 + o, 2, 1);
    }
    // 头
    px(x, L.skin, 4, 3 + o, 8, 7);
    px(x, L.hair, 4, 2 + o, 8, 2); px(x, L.hair, 3, 3 + o, 1, 4); px(x, L.hair, 12, 3 + o, 1, 4);
    if (dir === 'up') px(x, L.hair, 4, 3 + o, 8, 6);
    if (dir === 'left') { px(x, L.hair, 8, 3 + o, 4, 4); px(x, L.ink, 5, 6 + o); }
    if (dir === 'right') { px(x, L.hair, 4, 3 + o, 4, 4); px(x, L.ink, 10, 6 + o); }
    if (dir === 'down') { px(x, L.hair, 4, 3 + o, 8, 1); px(x, L.ink, 6, 6 + o); px(x, L.ink, 9, 6 + o); px(x, P.orange, 7, 8 + o, 2, 1); }
    // 描边
    const id = x.getImageData(0, 0, 16, 24), d = id.data, out = new Uint8ClampedArray(d);
    for (let yy = 0; yy < 24; yy++) for (let xx = 0; xx < 16; xx++) {
      const i = (yy * 16 + xx) * 4; if (d[i + 3]) continue;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = xx + a, Y = yy + b; if (X < 0 || Y < 0 || X > 15 || Y > 23) continue;
        if (d[(Y * 16 + X) * 4 + 3]) { out[i] = 26; out[i + 1] = 28; out[i + 2] = 44; out[i + 3] = 255; break; }
      }
    }
    x.putImageData(new ImageData(out, 16, 24), 0, 0);
    return (charCache[k] = c);
  }
  function shadow(ctx, X, Y) { ctx.fillStyle = 'rgba(26,28,44,0.35)'; ctx.fillRect(X + 3, Y + 22, 10, 2); ctx.fillRect(X + 4, Y + 21, 8, 1); }

  // ---------- 室内瓦片 ----------
  function interiorTile(ch, floor, v) {
    const [c, x] = cv(16, 16);
    const fl = () => { if (floor === 'wood') { px(x, P.tan, 0, 0, 16, 16); px(x, P.wood, 0, 7, 16, 1); px(x, P.wood, 0, 15, 16, 1); px(x, P.wood, v % 2 ? 5 : 11, 0, 1, 7); } else { px(x, P.paveL, 0, 0, 16, 16); px(x, P.pave, 0, 15, 16, 1); px(x, P.pave, 15, 0, 1, 16); } };
    switch (ch) {
      case '#': px(x, P.pave, 0, 0, 16, 16); px(x, P.paveL, 0, 0, 16, 10); px(x, P.wood, 0, 13, 16, 3); px(x, P.ink, 0, 15, 16, 1); break;
      case 'w': px(x, P.paveL, 0, 0, 16, 16); px(x, P.frame || P.white, 2, 2, 12, 9); px(x, P.sky, 3, 3, 10, 7); px(x, P.cyan, 3, 3, 3, 2); px(x, P.wood, 0, 13, 16, 3); break;
      case 'E': fl(); px(x, P.red, 2, 4, 12, 10); px(x, P.orange, 3, 5, 10, 1); break;
      case 'B': fl(); px(x, P.wood, 1, 0, 14, 16); px(x, P.white, 2, 1, 12, 5); px(x, P.sky, 2, 6, 12, 9); px(x, P.blue, 2, 12, 12, 3); break;
      case 'C': px(x, P.grey, 0, 0, 16, 16); px(x, P.white, 0, 0, 16, 6); px(x, P.ink, 0, 15, 16, 1); px(x, P.orange, 3, 2, 4, 3); px(x, P.green, 9, 2, 4, 3); break;
      case 'T': fl(); px(x, P.wood, 1, 3, 14, 9); px(x, P.tan, 2, 4, 12, 6); px(x, P.ink, 2, 12, 2, 3); px(x, P.ink, 12, 12, 2, 3); break;
      case 'K': px(x, P.paveL, 0, 0, 16, 16); px(x, P.wood, 0, 1, 16, 10); px(x, P.dgreen, 0, 2, 16, 8); px(x, P.white, 3, 4, 5, 1); px(x, P.white, 4, 6, 7, 1); px(x, P.wood, 0, 13, 16, 3); break;
      case 'P': fl(); px(x, P.brick, 5, 10, 6, 5); px(x, P.dgreen, 3, 2, 10, 8); px(x, P.grassL, 5, 3, 4, 3); break;
      case 'L': fl(); px(x, P.mist, 2, 0, 12, 16); px(x, P.slate, 7, 1, 1, 14); px(x, P.ink, 5, 7, 1, 2); px(x, P.ink, 10, 7, 1, 2); break;
      case 'd': fl(); px(x, P.wood, 0, 4, 16, 10); px(x, P.tan, 0, 4, 16, 3); break;
      case 'S': fl(); px(x, P.wood, 7, 9, 2, 7); px(x, P.gold, 1, 1, 14, 9); px(x, P.red, 3, 3, 10, 5); px(x, P.cream, 6, 4, 4, 3); break;
      default: fl();
    }
    return c;
  }

  window.ART = { P, PALETTE, cv, px, tiles, treeImg, styleOf, roofTile, wallTile, charSprite, shadow, interiorTile, rng };
})();

#!/usr/bin/env python3
"""把《手册数据.json》按设计方案公式转换为瓦片地图（地面/碰撞/分区/门/打卡点）。
公式：tileX = (X游戏 + 175) / 3，tileY = (Z游戏 + 330) / 3（1 瓦片 = 3 游戏米），外圈再加 M 格围墙边距。
"""
import json, math, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
src = json.load(open(os.path.join(ROOT, 'ref', 'data.json')))
M = 4
W = 150 + 2 * M
H = 285 + 2 * M
def tx(x): return (x + 175) / 3 + M
def ty(z): return (z + 330) / 3 + M
def ix(x): return int(math.floor(tx(x)))
def iy(z): return int(math.floor(ty(z)))

# 地面类型
VOID, ROAD, PAVE, GRASS, BELT, COURT, TRACK, INFIELD, BUILD, FENCE, PARK, PLAZA, WALL, TREE, STAND, POLE, DOOR, SIGN, TENNIS = range(19)
ground = [[ROAD] * W for _ in range(H)]
region = [[-1] * W for _ in range(H)]
bid = [[-1] * W for _ in range(H)]

def pip(px, py, poly):
    c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > py) != (y2 > py):
            xi = x1 + (py - y1) * (x2 - x1) / (y2 - y1)
            if px < xi: c = not c
    return c

regions = []
for ri, r in enumerate(src['regions']):
    poly = [(tx(x), ty(z)) for x, z in r['polygon_game_xz_m']]
    regions.append({'id': r['id'], 'name': r['name'], 'kind': r['kind'], 'color': r['color'],
                    'cx': round(tx(r['game_center'][0]), 2), 'cy': round(ty(r['game_center'][2]), 2)})
    kind = r['kind']
    g = PAVE if kind == '建设组团' else (GRASS if kind == '公园绿地' else BELT)
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    for y in range(max(0, int(min(ys)) - 1), min(H, int(max(ys)) + 2)):
        for x in range(max(0, int(min(xs)) - 1), min(W, int(max(xs)) + 2)):
            if pip(x + 0.5, y + 0.5, poly):
                region[y][x] = ri; ground[y][x] = g

# 外圈：所有分区包络外 M 格之外是围墙
for y in range(H):
    for x in range(W):
        if x < M - 1 or y < M - 1 or x >= W - M + 1 or y >= H - M + 1:
            ground[y][x] = WALL

reg_index = {r['id']: i for i, r in enumerate(src['regions'])}
# T0047：围挡不可进（边界一圈 FENCE，内部 VOID 不可达）
ti = reg_index['T0047']
for y in range(H):
    for x in range(W):
        if region[y][x] == ti:
            edge = any(0 <= x + dx < W and 0 <= y + dy < H and region[y + dy][x + dx] != ti
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            ground[y][x] = FENCE if edge else VOID

buildings = []
fields = []
def rect_of(o):
    x, _, z = o['position']; sx, _, sz = o['game_size']
    return ix(x - sx / 2), iy(z - sz / 2), ix(x + sx / 2), iy(z + sz / 2)

SKIP_CONTAINERS = {'SB3-1', 'SA3-1', 'T0047-concept'}
def fill(x0, y0, x1, y1, t, cond=None):
    for y in range(max(0, y0), min(H, y1 + 1)):
        for x in range(max(0, x0), min(W, x1 + 1)):
            if cond is None or cond(x, y): ground[y][x] = t

def tier(o):
    f = o.get('floors')
    if not isinstance(f, (int, float)):
        import re
        m = re.findall(r'(\d+)F', str(o.get('shape') or '') + ' ' + str(f or ''))
        f = max(map(int, m)) if m else 3
    return 1 if f <= 3 else (2 if f <= 8 else 3), f

for r in src['regions']:
    for o in r['objects']:
        if o['id'] in SKIP_CONTAINERS: continue
        name = o['name']; cat = o['category']; shape = o.get('shape') or ''
        x0, y0, x1, y1 = rect_of(o)
        oid = o['id']
        if cat == '场地与设施':
            if 'courts' not in oid: fields.append({'id': oid, 'name': name, 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'region': r['id']})
            if '跑道' in shape or '田径场' in name:
                cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; rx, ry = (x1 - x0) / 2, (y1 - y0) / 2
                for y in range(y0, y1 + 1):
                    for x in range(x0, x1 + 1):
                        # 体育场形：两端半圆+中间直道
                        dx = abs(x + 0.5 - cx); dy = abs(y + 0.5 - cy)
                        straight = ry - rx
                        d = math.hypot(dx, max(0, dy - straight)) if straight > 0 else math.hypot(dx / rx * ry, dy)
                        R = rx
                        if d <= R: ground[y][x] = TRACK if d > R - 3 else INFIELD
            elif '看台' in name:
                fill(x0, y0, x1, y1, STAND)
                buildings.append({'id': oid, 'name': name, 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'kind': 'stand', 'region': r['id']})
            elif '停车' in name:
                fill(x0, y0, x1, y1, PARK)
            elif '旗杆广场' in name:
                fill(x0, y0, x1, y1, PLAZA)
            elif '网球' in name:
                fill(x0, y0, x1, y1, TENNIS)
            elif 'courts' in oid:
                continue  # 组外框，不重复铺
            elif '球场' in name or '排球' in name or 'court' in oid:
                fill(x0, y0, x1, y1, COURT)
            continue
        if '围网' in name: continue
        if oid == 'SB3-flagpole':
            ground[iy(o['position'][2])][ix(o['position'][0])] = POLE
            continue
        t, floors = tier(o)
        b = {'id': oid, 'name': name, 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'tier': t, 'floors': floors,
             'shape': shape, 'region': r['id'], 'cat': cat}
        cells = set()
        w = x1 - x0 + 1; h = y1 - y0 + 1
        if oid == 'NB2-library':
            # 圆形主体：外包 90×73m 含外环与附体，主体圆取 半径 ≈ 外包短边×0.42
            cx, cy = tx(o['position'][0]), ty(o['position'][2])
            R = (o['game_size'][2] / 3) * 0.42
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                    if d <= R: cells.add((x, y))
                    elif d <= R + 3: ground[y][x] = PLAZA  # 外环平台
            b['round'] = [round(cx, 2), round(cy, 2), round(R, 2)]
        elif ('C形' in shape or 'U形' in shape or '院' in shape or '多翼' in shape or '围合' in shape) and w >= 8 and h >= 8:
            th = max(3, min(w, h) // 4)
            open_side = 'E'
            if 'U形' in shape: open_side = 'N'
            if '向西开口' in shape: open_side = 'W'
            if 'C形' in shape and '向东' in shape: open_side = 'E'
            if 'L形' in shape: open_side = 'L'
            if '弧形' in shape: open_side = 'ARC'
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    inner = x0 + th <= x <= x1 - th and y0 + th <= y <= y1 - th
                    if open_side == 'L':
                        # L 形：保留北翼与西翼
                        if y <= y0 + th - 1 or x <= x0 + th - 1: cells.add((x, y))
                        continue
                    if open_side == 'ARC':
                        # 弧形北楼：北侧为弧，南侧院落
                        cx = (x0 + x1 + 1) / 2; cy = y1 + 1 + w * 0.15
                        d = math.hypot(x + 0.5 - cx, (y + 0.5 - cy))
                        Rout = math.hypot(w / 2, cy - y0) 
                        if d <= Rout and d >= Rout - th - 1 and y <= y1: cells.add((x, y))
                        elif d <= Rout and (x <= x0 + th - 1 or x >= x1 - th + 1) and y <= y1: cells.add((x, y))
                        continue
                    if inner: continue
                    if open_side == 'E' and x > x1 - th and y0 + th <= y <= y1 - th: continue
                    if open_side == 'W' and x < x0 + th and y0 + th <= y <= y1 - th: continue
                    if open_side == 'N' and y < y0 + th and x0 + th <= x <= x1 - th: continue
                    cells.add((x, y))
        else:
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1): cells.add((x, y))
        bi = len(buildings)
        for (x, y) in cells:
            if 0 <= x < W and 0 <= y < H and ground[y][x] not in (WALL,):
                ground[y][x] = BUILD; bid[y][x] = bi
        b['n'] = len(cells)
        buildings.append(b)

# 门：南立面中点（向外一格必须可走）；若不行再试其它面
WALKABLE = {ROAD, PAVE, GRASS, BELT, COURT, TRACK, INFIELD, PARK, PLAZA, TENNIS}
def find_door(bi):
    b = buildings[bi]
    cands = []
    cx = (b['x0'] + b['x1']) // 2; cy = (b['y0'] + b['y1']) // 2
    for y in range(b['y0'], b['y1'] + 1):
        for x in range(b['x0'], b['x1'] + 1):
            if 0 <= y < H and 0 <= x < W and bid[y][x] == bi:
                if y + 1 < H and ground[y + 1][x] in WALKABLE and bid[y + 1][x] == -1:
                    # 南向外墙
                    out = all(ground[yy][x] in WALKABLE for yy in range(y + 1, min(H, y + 4)))
                    cands.append((0 if out else 1, abs(x - cx), -y, x, y))
    if not cands: return None
    cands.sort(); _, _, _, x, y = cands[0]
    return [x, y]

for bi, b in enumerate(buildings):
    if b.get('kind') == 'stand': continue
    d = find_door(bi)
    if d:
        b['door'] = d

out = {
    'W': W, 'H': H, 'M': M,
    'formula': 'tileX=(X+175)/3+M, tileY=(Z+330)/3+M, 1 tile=3 游戏米',
    'ground': [''.join(chr(48 + v) for v in row) for row in ground],
    'region': [''.join(chr(64 + v + 1) if v >= 0 else '.' for v in row) for row in region],
    'bid': [''.join(chr(48 + v) if v >= 0 else '.' for v in row) for row in bid],
    'regions': regions,
    'buildings': buildings,
    'fields': fields,
}
js = 'window.MAPDATA=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'game', 'mapdata.js'), 'w').write(js)

# 预览
try:
    from PIL import Image
    pal = {VOID: (60, 60, 60), ROAD: (150, 150, 150), PAVE: (210, 205, 190), GRASS: (110, 170, 90), BELT: (90, 150, 80),
           COURT: (200, 120, 70), TRACK: (60, 100, 200), INFIELD: (80, 170, 80), BUILD: (170, 70, 60), FENCE: (230, 200, 0),
           PARK: (120, 120, 130), PLAZA: (235, 230, 215), WALL: (30, 30, 30), STAND: (40, 60, 160), POLE: (255, 0, 0), TENNIS: (60, 140, 120)}
    im = Image.new('RGB', (W, H))
    for y in range(H):
        for x in range(W): im.putpixel((x, y), pal.get(ground[y][x], (255, 0, 255)))
    for b in buildings:
        if 'door' in b: im.putpixel(tuple(b['door']), (255, 255, 0))
    im.resize((W * 4, H * 4), Image.NEAREST).save(os.path.join(ROOT, 'tools', 'preview.png'))
except Exception as e:
    print('preview fail', e)
# 可达性检查：从南入口出发
from collections import deque
start = (ix(10.31), H - M - 1)
seen = {start}; q = deque([start])
while q:
    x, y = q.popleft()
    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx, ny = x+dx, y+dy
        if 0<=nx<W and 0<=ny<H and (nx,ny) not in seen and ground[ny][nx] in WALKABLE:
            seen.add((nx,ny)); q.append((nx,ny))
print('start', start, 'reachable', len(seen))
for b in buildings:
    d = b.get('door')
    if d and (d[0], d[1]+1) not in seen: print('  UNREACHABLE door', b['id'])
print('W', W, 'H', H, 'buildings', len(buildings))
for b in buildings: print(b['id'], b['name'], b.get('door'), b.get('tier'))

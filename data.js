// 《点亮房山》数据驱动配置：任务卡、NPC、打卡点、室内场景。补到真实信息后只改这里。
// 坐标为室外瓦片坐标（由 tools/build_map.py 按 tileX=(X+175)/3+4, tileY=(Z+330)/3+4 生成）。
(function () {
  const TBD = '（示意点位，待补真实信息）';
  window.GAMEDATA = {
    start: { scene: 'outdoor', x: 65, y: 288, dir: 'up', day: 1, minutes: 7 * 60 + 30 },

    // 关键道具
    items: {
      '学生证': '证明你是北工大学生。办理地点' + TBD,
      '校园卡': '吃饭、进门都靠它。没有校园卡进不了食堂。办理地点' + TBD,
      '宿舍钥匙': 'NA2-3 北区本科宿舍3 的钥匙。新生实际住哪栋待核实。',
      '迎新物资袋': '迎新物资。具体内容' + TBD,
      '被褥快递': '在 NA2-6 快递驿站取到的被褥快递。',
      '课表': '第一周课表。教室编号规则待补真实信息。'
    },

    // 章节与任务卡（无箭头，只写目的地和一句提示）
    chapters: [
      { title: '序章 · 到校', tasks: [
        { id: 'p1', card: '找到迎新点', hint: '从南入口进校，迎新点在南门北面的旗杆广场。', target: 'npc:senior', region: 'SB3' }
      ] },
      { title: '第一章 · 报到日上午', tasks: [
        { id: 'c1a', card: '报到', hint: '旗杆广场迎新点的报到处' + TBD, target: 'obj:desk_report', region: 'SB3' },
        { id: 'c1b', card: '领学生证、校园卡', hint: '旗杆广场迎新点的证卡办理处' + TBD, target: 'obj:desk_card', region: 'SB3', gives: ['学生证', '校园卡'] },
        { id: 'c1c', card: '领物资', hint: '旗杆广场迎新点的物资领取处' + TBD, target: 'obj:desk_supply', region: 'SB3', gives: ['迎新物资袋', '宿舍钥匙'] },
        { id: 'c1d', card: '找到宿舍', hint: '圆形图书馆西边的本科宿舍 NA2-3。进楼找到自己的床。', target: 'obj:dorm_bed', region: 'NA2' }
      ] },
      { title: '第二章 · 第一顿饭', tasks: [
        { id: 'c2a', card: '北区食堂吃饭', hint: '宿舍组团北头的三层楼 NA2-1 北区食堂。记得带校园卡。', target: 'obj:canteen_counter', region: 'NA2' },
        { id: 'c2b', card: '取被褥快递', hint: '宿舍区南头那排平房，NA2-6 快递驿站。', target: 'npc:courier', region: 'NA2', gives: ['被褥快递'] }
      ] },
      { title: '第三章 · 找教室', tasks: [
        { id: 'c3a', card: '找到公共教学楼北楼', hint: '田径场西边，弧形那栋（NC2-1 北楼）。进楼找打卡板。', target: 'obj:board_NC2-1-north', region: 'NC2' },
        { id: 'c3b', card: '分清公共教学楼南楼', hint: '北楼南边，U 形那栋（NC2-1 南楼）。', target: 'obj:board_NC2-1-south', region: 'NC2' },
        { id: 'c3c', card: '去 SC1 公共教学楼', hint: '富庄东路一线南面、东侧中部组团的公共教学楼 SC1-1。', target: 'obj:board_SC1-1', region: 'SC1', gives: ['课表'] }
      ] }
    ],

    // 室外 NPC（near: 以某栋楼门口为锚点；没有则用 x,y）
    npcs: [
      { id: 'senior', name: '迎新学长', x: 65, y: 279, dir: 'down', look: 1,
        lines: ['欢迎来到房山新校区！迎新点就在这片旗杆广场。', '宿舍在北区，一直往北穿过中央公园，看见那栋圆楼就是图书馆，圆楼左手边（西边）就是本科宿舍。', '先去报到处报到，再领证卡和物资。这几个摊位是示意点位，待补真实信息。'] },
      { id: 'club', name: '社团部长', x: 71, y: 270, dir: 'left', look: 4,
        lines: ['社团招新是第六章的事，到时候来旗杆广场找我！', '大学生活动中心入口就在行政综合楼这儿，旗杆广场北面。'] },
      { id: 'courier', name: '驿站小哥', near: 'NA2-6', dx: 2, dy: 1, dir: 'down', look: 2,
        lines: ['快递都在这儿，宿舍区南头这排平房。'] },
      { id: 'jogger', name: '晨跑同学', x: 119, y: 96, dir: 'down', look: 3,
        lines: ['公共教学楼就在跑道西边，北楼弧形、南楼 U 形，别走错。'] },
      { id: 'librarian', name: '图书管理员', near: 'NB2-library', dx: 2, dy: 1, dir: 'down', look: 5,
        lines: ['迷路就抬头找钟塔，它在最北边；圆楼在中间，记住这两个就丢不了。', '图书馆的打卡是第四章的内容，MVP 里先不开放室内。'] },
      { id: 'pe', name: '体育老师', near: 'SA1-体育馆', dx: 2, dy: 1, dir: 'down', look: 6,
        lines: ['体育馆在西边，东面挨着跑道和看台；游泳馆从馆里另一个入口进。'] },
      { id: 'guard1', name: '保卫值班大叔', near: 'NA2-8', dx: 1, dy: 1, dir: 'down', look: 7, guard: true },
      { id: 'guard2', name: '保卫值班大叔', near: 'NC2-2', dx: -1, dy: 1, dir: 'down', look: 7, guard: true }
    ],

    // 室外交互物（迎新点摊位在旗杆广场，均为示意点位）
    objects: [
      { id: 'desk_report', kind: 'desk', label: '报到处', x: 60, y: 276, w: 2, note: TBD },
      { id: 'desk_card', kind: 'desk', label: '证卡办理', x: 69, y: 276, w: 2, note: TBD },
      { id: 'desk_supply', kind: 'desk', label: '物资领取', x: 60, y: 271, w: 2, note: TBD }
    ],

    // 路牌：方向由坐标自动计算（唯一出现方向信息的 UI）
    signs: [
      { x: 64, y: 290 - 4, title: '南入口' },
      { x: 53, y: 262, title: '行政综合组团西侧' },
      { x: 53, y: 205, title: '南段中央公园西侧' },
      { x: 53, y: 140, title: '富庄东路一线（南北区分界）' },
      { x: 92, y: 140, title: '富庄东路一线' },
      { x: 53, y: 80, title: '北部公园绿地西侧' },
      { x: 92, y: 80, title: '公共教学楼西侧' },
      { x: 40, y: 135, title: '北区宿舍南口' }
    ],
    landmarks: [
      { name: '圆形图书馆', b: 'NB2-library' },
      { name: '北区本科宿舍3', b: 'NA2-3' },
      { name: '北区食堂', b: 'NA2-1' },
      { name: '快递驿站', b: 'NA2-6' },
      { name: '公共教学楼北楼', b: 'NC2-1-north' },
      { name: '公共教学楼南楼', b: 'NC2-1-south' },
      { name: 'SC1 公共教学楼', b: 'SC1-1' },
      { name: '钟塔', b: 'NB1-2' },
      { name: '体育馆', b: 'SA1-体育馆' },
      { name: '旗杆广场', b: 'SB3-flag' },
      { name: '校医院', b: 'NC2-4' }
    ],

    // 有室内的楼（门口切屏）
    enterable: {
      'NA2-3': { interior: 'dorm', need: '宿舍钥匙', needMsg: '门锁着。宿舍钥匙要先在旗杆广场的物资领取处领（示意点位）。' },
      'NA2-1': { interior: 'canteen', need: '校园卡', needMsg: '闸机“嘀”了一声：请刷校园卡。没有校园卡进不了食堂，先去旗杆广场迎新点领卡。' },
      'NC2-1-north': { interior: 'teach', title: '公共教学楼北楼' },
      'NC2-1-south': { interior: 'teach', title: '公共教学楼南楼' },
      'SC1-1': { interior: 'teach', title: 'SC1 公共教学楼' }
    },

    // 室内（20×11，'#'墙 '.'地 'E'出口 'B'床 'C'柜台 'T'桌 'K'黑板 'P'盆栽 'L'柜 'd'值班台 'S'打卡板 'w'窗）
    interiors: {
      dorm: { title: '北区本科宿舍3 · 一层与寝室', floor: 'wood', map: [
        '####################',
        '#L.B..B.L#ww#ww#ww##',
        '#..B..B..#.........#',
        '#........#..dd.....#',
        '#........#.........#',
        '#T......T..........#',
        '#T.................#',
        '#####..###.........#',
        '#P.................#',
        '#..............P...#',
        '#########EE#########'
      ], objs: [{ id: 'dorm_bed', at: [3, 2], kind: 'bed', label: '你的床' }], npcs: [
        { id: 'aunt', name: '宿管阿姨', x: 13, y: 4, dir: 'down', look: 8, lines: ['饿了吧？食堂就在咱们组团北头，三层那栋，北区食堂。', '床就是存档点。睡前记得存档！'] }
      ] },
      canteen: { title: '北区食堂 · 一层', floor: 'tile', map: [
        '####################',
        '#wwCCCCCCCCCCCCCCww#',
        '#..................#',
        '#..TT..TT..TT..TT..#',
        '#..................#',
        '#..TT..TT..TT..TT..#',
        '#..................#',
        '#..TT..TT..TT..TT..#',
        '#P................P#',
        '#..................#',
        '#########EE#########'
      ], objs: [{ id: 'canteen_counter', at: [9, 1], w: 3, kind: 'counter', label: '打饭窗口' }], npcs: [
        { id: 'cook', name: '食堂师傅', x: 10, y: 2, dir: 'down', look: 9, lines: ['同学刷卡打饭！营业时间和支付方式待补真实信息。'] }
      ] },
      teach: { title: '公共教学楼 · 一层', floor: 'tile', map: [
        '####################',
        '#KKKKK#ww#ww#KKKKK##',
        '#.....#.....#......#',
        '#TTTT.#..S..#.TTTT.#',
        '#.....#.....#......#',
        '#TTTT.......#.TTTT.#',
        '#...........#......#',
        '#####.............##',
        '#P................P#',
        '#..................#',
        '#########EE#########'
      ], objs: [{ id: 'board', at: [9, 3], kind: 'board', label: '打卡板' }], npcs: [] }
    }
  };
})();

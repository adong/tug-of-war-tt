/* 中文 for TT Tug of War (拔河): the words on the page, the banners, the pops, the toasts, the result card and the ?
   panel (Kit.lang, from kit/lang.js). The kids' names and the game's name stay in English. There are no canvas words
   besides the name tags, which are names. */
(function () {
  const L = Kit.lang;
  L.keep(['TT Tug of War', 'TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'ZOOM', 'LUNA', 'BOLT', 'BRUNO', 'Teddy', 'Tommy', 'Claude Code', 'P · Esc', 'Esc', 'Enter', 'VS', 'W', 'A D', 'W S']);

  const TEAMS = { BEARS: '小熊', PANDAS: '熊猫', BUNNIES: '小兔', PIGLETS: '小猪' };
  const TREATS = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  for (const [en, zh] of Object.entries(TEAMS)) L.add({ [en]: zh + '队' });
  L.add({
    // title
    'Tug of war! Pull with the drum, BOOM, BOOM, BOOM. Pull the red ribbon over your line, and call your brother to grab the rope too.':
      '拔河比赛！跟着鼓声用力拉：咚、咚、咚！把红丝带拉过你这边的线就赢，还可以叫兄弟一起来拉绳子。',
    'How many players': '几个人玩', '1 PLAYER': '1 个人', '2 PLAYERS': '2 个人', CAPTAIN: '队长', 'PLAYER 1': '玩家 1', 'PLAYER 2': '玩家 2',
    'Previous captain': '上一个队长', 'Next captain': '下一个队长', 'Animal team': '动物队', 'How hard': '难度', '🐣 EASY': '🐣 简单', '🔥 NORMAL': '🔥 普通', ZOMBIE: '僵尸',
    '▶ PLAY': '▶ 开始', 'pull with the drum': '跟着鼓声拉', 'call your brother': '叫兄弟来帮忙', 'pick your captain': '选队长', 'pick a team': '选动物队',
    '👆 tap PULL when the ring meets the button': '👆 白圈碰到按钮的时候，点“拉”', 'built with': '制作工具', 'LOADING…': '加载中…',
    // pause
    PAUSED: '暂停', '▶ RESUME': '▶ 继续', '🏠 MENU': '🏠 菜单',
    // HUD
    'PULL!': '用力拉！', SPACE: '空格', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Call your brother (T)': '叫兄弟来帮忙 (T)', 'High five (T)': '击掌 (T)',
    'TAP ME!': '点我！', 'HIGH FIVE!': '击掌！',
    // banners
    'READY…': '预备…', 'GRAB THE ROPE…': '抓紧绳子…', 'SET…': '准备…',
    'ONE TAP ON EACH BOOM OF THE DRUM!': '鼓声“咚”一下，就点一下！', 'TAP PULL WITH THE DRUM: BOOM, BOOM!': '跟着鼓声点“拉”：咚，咚！',
    'DRAW!': '平局！', 'NOBODY GETS THIS ONE. PULL AGAIN!': '这一局谁都没赢，再拉一次！',
    // pops and toasts
    'PERFECT!': '太棒了！', 'GREAT!': '真好！', 'GOOD!': '好！', OK: '还行', 'SLIP!': '滑了一下！', 'TOO SOON!': '太早啦！', 'TOO LATE!': '太晚啦！',
    'TAP PULL ON EVERY BOOM!': '每次“咚”都点“拉”！', 'PRESS SPACE ON EVERY BOOM!': '每次“咚”都按空格！', 'ONE TAP ON EACH BOOM!': '“咚”一下，点一下！',
    '🙌 HIGH FIVE!': '🙌 击掌！',
    // the result card
    "IT'S A DRAW!": '平局！', '↻ PLAY AGAIN': '↻ 再玩一次',
    // the ? panel
    '1 player': '1 个人', 'Player 1': '玩家 1', 'Player 2': '玩家 2', 'Space or ↑': '空格 或 ↑',
    'pull: one tap on each BOOM of the drum': '拉绳子：鼓声“咚”一下点一下', 'call your brother (2 players: high five)': '叫兄弟来帮忙（2 个人：击掌）',
    'pick your captain (title)': '选队长（标题页）', 'pick your animal team (title)': '选动物队（标题页）', 'easy or normal (title)': '简单还是普通（标题页）',
    'start · play again': '开始 · 再玩一次', pause: '暂停', 'sound on / off': '声音开 / 关',
    'Pull the red ribbon over your line to win the round; first to 2 rounds wins. EASY: every tap helps, extra taps are just ignored. NORMAL: tap once on each BOOM; tapping between them makes you slip.':
      '把红丝带拉过你这边的线就赢一局，先赢 2 局的队获胜。简单：每次点都有用，多点的不算。普通：鼓声“咚”一下只点一下，在两声中间乱点会滑倒。',
    "Tap PULL when the white ring meets the button (in 1 player you can tap anywhere). Tap your brother's face to call him.":
      '白圈碰到按钮的时候点“拉”（1 个人玩的时候点屏幕哪里都行）。点兄弟的脸可以叫他来。',
  });
  // words with names and numbers in them
  L.rule(/^ROUND (\d)$/, '第 $1 局');
  L.rule(/^TEAM (BEARS|PANDAS|BUNNIES|PIGLETS)( \S+)?$/, (m, t, e) => `${TEAMS[t]}队${e || ''}`);
  L.rule(/^(\S+)'S TEAM WINS!$/, '$1 队赢啦！');
  L.rule(/^(\S+) WINS!$/, '$1 赢啦！');
  L.rule(/^(\S+) WINS! TRY AGAIN!$/, '$1 赢啦！再来一次！');
  L.rule(/^FOXY & FROGGY (\S+)$/, 'FOXY 和 FROGGY $1');
  L.rule(/^TODAY: (.+)$/, '今天：$1');
  L.rule(/^🏆 (\S+): (\d+)( · 🏆 (\S+): (\d+))?$/, (m, a, n, more, b, k) => `🏆 ${a}：赢了 ${n} 次` + (more ? ` · 🏆 ${b}：赢了 ${k} 次` : ''));
  L.rule(/^(\S+) IS HERE!$/, '$1 来啦！');
  L.rule(/^(\S+) SAYS: I'LL PULL WITH YOU! PULL HARD!$/, '$1 说：我来帮你拉！用力！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (\S+)!$/, (m, e, item, who) => `${e} ${who} 送来的${TREATS[item]}！`);
})();

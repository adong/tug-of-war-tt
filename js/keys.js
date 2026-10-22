/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.TW_TITLE || 'TT Tug of War',
  cols: ['1 player', 'Player 1', 'Player 2'],
  keys: [
    ['pull: one tap on each BOOM of the drum', 'Space or ↑', 'W', '↑'],
    ['call your brother (2 players: high five)', 'T', 'T', 'T'],
    ['pick your captain (title)', '← →', 'A D', '← →'],
    ['pick your animal team (title)', '↑ ↓', 'W S', '↑ ↓'],
    ['easy or normal (title)', 'E', '', ''],
    ['start · play again', 'Enter', 'Enter', 'Enter'],
    ['pause', 'P or Esc', 'P or Esc', 'P or Esc'],
    ['sound on / off', 'M', 'M', 'M'],
  ],
  note: 'Pull the red ribbon over your line to win the round; first to 2 rounds wins. EASY: every tap helps, extra taps are just ignored. NORMAL: tap once on each BOOM; tapping between them makes you slip.',
  touch: 'Tap PULL when the white ring meets the button (in 1 player you can tap anywhere). Tap your brother\'s face to call him.',
});

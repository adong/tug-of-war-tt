# TT Tug of War

[![TT Tug of War title screen](docs/screenshot.jpg)](https://adong.github.io/tug-of-war-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 拔河比赛：跟着鼓声“咚、咚”用力拉，带上小熊、熊猫、小兔或小猪队，把红丝带拉过你的线，还可以叫兄弟一起来拉绳子。

Tug of war in a sunny park, starring Teddy and Tommy. Each captain pulls with two animal teammates (🐻 BEARS, 🐼 PANDAS, 🐰 BUNNIES or 🐷 PIGLETS) on one long rope over a mud puddle. A big drum goes BOOM, BOOM, BOOM: tap PULL on the beat and your whole team heaves. Pull the red ribbon over your line to win the round, and the other team slides into the mud. First to 2 rounds wins; the winning captain does his signature move under the confetti. 1 player pulls against Foxy 🦊 and Froggy 🐸; 2 players pull against each other. It's built with Claude Code from plain JavaScript and Three.js, in the same style as Metro Surfer and the other Teddy & Tommy games. There are no image, model or audio files: the park, the drum, the mud and the rope are boxes, cylinders and canvas-painted textures, the characters come from the shared kit (`kit/`), and every sound is synthesised.

The name lives in one place, [js/title.js](js/title.js). "TT Tug of War" is a working title until Alan names it.

## Play

- **Double-click `index.html`.** It works offline, because Three.js and the kit are copied into `kit/`. Without internet the logo falls back from the Bungee font to Arial Black.
- **Send one file:** `dist/tug-of-war-tt.html` is the whole game in one file. AirDrop or email it, then open it in a browser.
- **Rebuild that file** after any edit: `python3 kit/tools/bundle.py . --name tug-of-war-tt`
- **Get kit updates** from `~/claude-games/kit`: `python3 ../kit/tools/sync.py .`, then rebuild.
- **Saved per browser:** 1 or 2 players, each player's captain and animal team, each captain's EASY / NORMAL, and how many matches each captain has won. `index.html` and `dist/tug-of-war-tt.html` each keep their own, because they're different ways of opening the game.

### How hard

| | 🐣 EASY (for Tommy, the default) | 🔥 NORMAL (for Teddy) |
|---|---|---|
| your taps | every tap counts for the nearest BOOM; tap more than once and the extras are just ignored | tap **once** on each BOOM; a tap far from the beat, or a second tap on the same beat, is a **SLIP** (the heave stops) |
| timing | within 0.12 s of the beat is PERFECT, 0.24 s GREAT, anything else GOOD (75 %) | within 0.07 s PERFECT, 0.15 s GOOD (80 %), 0.24 s OK (50 %) |
| Foxy | skips about 3 beats in 10, taps loosely | skips about 1 in 7, taps close to the beat |

Good heaves in a row build a combo (🔥 × 2 … × 5, up to 25 % stronger). Each player picks his own level, so in 2 players Tommy can pull EASY while Teddy pulls NORMAL. On EASY, tapping as fast as you can still works (about 85–90 % of a perfect pull); on NORMAL it doesn't, you have to keep the rhythm.

## The rope

| | |
|---|---|
| the drum | BOOM every 0.7 s, starting just after PULL!; a white ring closes in on your PULL button and meets it on the beat |
| a heave | your tap starts it, your two teammates join a moment later, as strong as your timing was good |
| winning a round | the red ribbon (the middle of the rope) crosses your line; or after 30 seconds, whichever side the ribbon is on (dead centre is a DRAW) |
| the match | first to 2 rounds (at most 5) |
| the end | the losing team gets yanked into the mud (SPLASH), the winners jump; after the last round the winning captain does his signature move (Teddy: boxing, then a jump shot with 🏀; Tommy: his Y with peace fingers), confetti, then ↻ PLAY AGAIN |
| the score | the match score (2–1), today's match wins for both captains, and every win ever for each captain (🏆) |

Every countdown goes ROUND 1, READY…, GRAB THE ROPE…, SET…, PULL! Taps before PULL! don't count: no false starts, no head start. On the title screen the two teams tug by themselves, quietly.

## Controls

| Touch | 1 player | 2 players | |
|---|---|---|---|
| PULL (or anywhere on the field) | `Space` (or any arrow, or `W` `A` `S` `D`) | `W` (or `A` `S` `D`) · `↑` (or the other arrows) | pull: one tap on each BOOM |
| his face (bottom right) | `T` | `T` (or 🙌) | call your brother; 2 players: a high five |
| ❚❚ button | `P` / `Esc` | same | pause |
| 🔊 button | `M` | same | sound on/off (the same switch as every game) |
| ◀ ▶, the four animals, EASY / NORMAL | `←` `→`, `↑` `↓`, `E` | `A` `D` / `W` `S` · `←` `→` / `↑` `↓` | pick the captain, the team, how hard (title) |
| ▶ PLAY, ↻ PLAY AGAIN | `Enter` | same | start |

In 1 player the PULL pad is bottom right and a tap anywhere on the field pulls too. In 2 players player 1's pad is bottom left and player 2's bottom right, and each player's half of the screen pulls for him. Only a finger or key going down counts: a held key's auto-repeat never does. Everything stays clear of the kit's round buttons on the left edge (on a phone held upright the rope sits above them).

## Companion

Call your brother any time, as often as you like: press `T` or tap his face. (Teddy's brother is Tommy; when Tommy plays, Teddy comes.)

1. He pops in at his buddy size, says hi with his signature move (Tommy's Y with peace fingers, Teddy's boxing) and tosses a treat (🍦 💧 🧃 🍪 🍉 🍌), with a toast like "🍦 ICE CREAM FROM TEDDY!".
2. Then he does this game's helper, **he joins your rope**: "TEDDY SAYS: I'LL PULL WITH YOU! PULL HARD!". He hops to the back of your rope (the anchor) and heaves on every BOOM by himself, about as strong as one more captain, so the team keeps pulling even when you miss a beat.
3. Called during a round, he grabs on straight away; called between rounds or on the title, he's on the rope from the next round's start. He stays for the rest of the match; call him again and he lets go to say hi, tosses another treat and grabs back on.
4. When the match is decided he says bye with his goodbye move (Tommy's Y, Teddy's jump shot with a 🏀) and pops out.

In 2 players, `T` (or the 🙌 button) is a high five between the brothers.

## How it was checked

All of it was tested muted (`localStorage['claudeGames.muted'] = '1'`), with sound checked in code, never by ear.

- **`node tools/check.js`** (under a second) runs the headless rules check in [js/checks.js](js/checks.js). It plays whole rounds with scripted captains: drummers (one tap per beat, with or without timing errors and skipped beats), mashers (2.5 to 25 taps a second), a held key, and the CPU.
  - **Rope physics:**
    - **still / balance:** nobody pulling for 30 s leaves the ribbon at exactly 0; the same taps on both sides (8 rounds, both levels) never move it at all.
    - **mirror:** swapping the two captains' taps mirrors the ribbon's whole path exactly and the other side wins at the same moment.
    - **stronger / settle / limits:** the better puller always wins and pulls the ribbon his way; one perfect heave alone moves it the exact amount the formula says (0.441 m) and then it stops; the round ends the very step the ribbon crosses a line, and the speed never passes its cap.
    - **fps:** the same taps replayed at 24, 30, 50, 60, 90, 120, 144 and 240 fps and with jittery frames give the same grades, ribbon path and winner (`===`, 30 replays), with the brother joining mid-round too. Every round runs in fixed 1/120 s steps, and every tap is stamped with the moment it happened.
    - **verlet (the drawn rope):** it starts at rest, stretches at most 3 % lying still and 6 % in a hard tug, sags over the mud, its loose ends rest on the grass, and its shape is the same at 30, 60 and 144 fps.
  - **Fair tapping detection:**
    - **held key:** holding a key down is one heave; 325 auto-repeats are ignored.
    - **double event:** the same tap arriving twice, 20 ms apart (a touch and a click), counts once.
    - **one per beat (EASY):** mashing at 6, 10, 15 or 25 taps a second never beats tapping with the drum, never gets more than one heave per beat, and never slips; 4 taps a second still pulls at about 86 %.
    - **NORMAL rhythm:** a so-so drummer beats an 8-taps-a-second masher in 10 of 10 (the masher slips hundreds of times).
    - **together / before GO:** two players tapping at the very same moment both count, the order taps reach the game doesn't matter, and taps before PULL! don't count.
  - **The kids can win:** on EASY tapping 4 (or even 2.5) times a second beats Foxy in 10 of 10; on NORMAL tapping with the drum beats Foxy 10 of 10 and mashing loses 10 of 10; NORMAL Foxy beats EASY Foxy; the same seed plays the same. A very slow tapper (once a second) wins 4 of 10 alone and 10 of 10 with his brother on the rope.
- **`node tools/check.js --fail`** runs four broken variants: one step per frame (`fps`), the right team 5 % stronger (`lopsided`), every EASY tap a heave (`mash`), and one constraint pass for the drawn rope (`stretchy`). Each one is caught (rope.fps, rope.balance + rope.mirror, tap.one-per-beat, rope.verlet FAIL), so it prints FAILED and exits 1. The start-at-rest part of rope.verlet was added after it caught the rope's loose ends whipping up at the start of a round; it fails on that old code.
- **In the page, `game.check()`** runs the same rules check plus the real game loop: a round on each level driven through the game's own frame code at 30, 60 and 144 fps gives `===` results. `game.check({ fail: 'fps' })` fails it. Both pass in `dist/tug-of-war-tt.html` opened from `file://` too.
- **In the Browser pane:** 1-player matches (EASY Tommy and NORMAL Teddy) to the results card, a 2-player match with a draw round, the countdown, the grade pops, the hints, slips, the mud splash, the winners' signature moves and confetti, the companion (hello, treat, joining the rope, bye) and the high five, at 1200x750, phone portrait (390x844), phone landscape (740x360) and iPad (1024x768), no console errors. With `Kit.lang.set('zh')` every screen (title in 1 and 2 players, ? panel, countdown, play, hints, companion, pause, a draw, a CPU win, a 2-player win) gives `Kit.lang.untranslated()` = []. In English no Chinese shows except the kit's own language button label.

## Files

| | |
|---|---|
| [js/title.js](js/title.js) | the name |
| [js/sim.js](js/sim.js) | the rules: the drum, judging taps, heaves, the rope physics, the CPU, the drawn rope's Verlet chain (no drawing; runs in node too) |
| [js/checks.js](js/checks.js) | the headless rules check and its scripted captains |
| [js/scene.js](js/scene.js) | the park, mud, drum, lines, rope, pullers' poses, effects and camera |
| [js/game.js](js/game.js) | menus, the match, input, HUD, the companion, the celebration, `window.game` |
| [js/friends.js](js/friends.js) | Foxy and Froggy (copied from TT Track & Field), and the four animal teams |
| [js/sfx.js](js/sfx.js) | the game's own synth sounds |
| [js/keys.js](js/keys.js), [js/zh.js](js/zh.js) | the ? panel's keys, the 中文 dictionary |
| [tools/check.js](tools/check.js) | the check in node |

## Not verified

- Sound by ear (tested muted only), including whether the drum feels in time with the ring on a slow device.
- Real fingers on an iPad or phone: two kids tapping their own halves at once, and how tap timing feels on iOS Safari (multi-touch was only exercised with synthetic events).
- A real double-click: the `file://` page was only opened in headless Chrome.
- Whether the balance suits the real kids: 🐣 EASY assumes Tommy taps a few times a second; 🔥 NORMAL assumes Teddy can keep within about 0.1 s of the beat to beat Foxy.
- Adding it to an iPad home screen.

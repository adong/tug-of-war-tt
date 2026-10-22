/* TT Tug of War: the game's own sounds, built on Kit.sound.tone / hiss (Web Audio, no files). TW.sfx(name, arg)
   plays one of these or, failing that, a kit sound of that name (click, coin, swish, jump, land...). */
(function () {
  'use strict';
  const S = Kit.sound;
  const { tone, hiss } = S;

  const OWN = {
    // the big drum: BOOM on every beat (a little lighter on the off ones)
    drum(strong) {
      tone({ type: 'sine', f: strong ? 120 : 140, to: 48, dur: 0.3, vol: strong ? 0.42 : 0.3 });
      hiss({ filter: 'lowpass', f: 700, to: 200, dur: 0.08, vol: 0.12 });
    },
    // the countdown and GO
    beep() { tone({ type: 'square', f: 523, dur: 0.14, vol: 0.08, lp: 2200 }); },
    go() { [0, 0.07, 0.14].forEach((at) => tone({ type: 'sine', f: 2350, to: 2250, at, dur: 0.06, vol: 0.09 })); tone({ type: 'sine', f: 2400, at: 0.21, dur: 0.32, vol: 0.1 }); },
    // a heave: the rope creaks, a little "hup" (higher for a perfect one)
    heave(q) {
      hiss({ filter: 'bandpass', f: 500, to: 260, q: 4, dur: 0.18, vol: 0.12 * (0.5 + q) });
      tone({ type: 'triangle', f: q >= 1 ? 330 : 260, to: q >= 1 ? 440 : 300, dur: 0.12, vol: 0.06 });
    },
    perfect() { [880, 1320].forEach((f, i) => tone({ type: 'sine', f, at: i * 0.05, dur: 0.12, vol: 0.05 })); },
    slip() { tone({ type: 'sawtooth', f: 520, to: 180, dur: 0.22, vol: 0.06, lp: 1600 }); hiss({ filter: 'highpass', f: 1500, dur: 0.1, vol: 0.06 }); },
    // the brother grabbing the rope
    grab() { tone({ type: 'triangle', f: 220, to: 440, dur: 0.16, vol: 0.09 }); hiss({ filter: 'bandpass', f: 900, q: 2, dur: 0.12, vol: 0.08 }); },
    // into the mud!
    splash() {
      hiss({ filter: 'lowpass', f: 1200, to: 250, dur: 0.6, vol: 0.3 });
      tone({ type: 'sine', f: 180, to: 60, dur: 0.3, vol: 0.25 });
      [0.12, 0.22, 0.33].forEach((at, i) => tone({ type: 'sine', f: 300 - i * 50, to: 500, at, dur: 0.07, vol: 0.06 }));
    },
    // the crowd and the win
    cheer(big) {
      const v = big ? 0.15 : 0.08;
      hiss({ filter: 'bandpass', f: 900, to: 1300, q: 0.6, dur: big ? 1.8 : 1.1, vol: v });
      hiss({ filter: 'bandpass', f: 2200, to: 1800, q: 1.2, at: 0.1, dur: big ? 1.4 : 0.8, vol: v * 0.5 });
    },
    round() { [523, 659, 784].forEach((f, i) => tone({ type: 'square', f, at: i * 0.1, dur: 0.12, vol: 0.06, lp: 2400 })); },
    fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'square', f, at: i * 0.12, dur: i === 3 ? 0.45 : 0.14, vol: 0.07, lp: 2600 })); },
    aww() { [392, 370, 349, 330].forEach((f, i) => tone({ type: 'triangle', f, to: f * 0.97, at: i * 0.22, dur: i === 3 ? 0.5 : 0.2, vol: 0.07 })); },
    pop() { tone({ type: 'sine', f: 880, to: 1320, dur: 0.08, vol: 0.06 }); },
    // the brother: a poof in and out, a treat landing, a high five
    poof() { hiss({ filter: 'bandpass', f: 1400, to: 500, q: 1, dur: 0.3, vol: 0.12 }); tone({ type: 'sine', f: 520, to: 880, dur: 0.16, vol: 0.08 }); },
    treat() { [784, 988, 1175].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.07, dur: 0.12, vol: 0.08 })); },
    five() { hiss({ filter: 'bandpass', f: 2400, q: 0.8, dur: 0.09, vol: 0.3 }); tone({ type: 'triangle', f: 660, to: 990, at: 0.05, dur: 0.15, vol: 0.08 }); },
  };

  window.TW.sfx = function (name, arg) {
    try {
      if (OWN[name]) OWN[name](arg);
      else if (typeof S[name] === 'function') S[name](arg);
    } catch (e) { /* sound is never worth an error */ }
  };
})();

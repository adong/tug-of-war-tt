#!/usr/bin/env node
/* The headless rules check, outside the browser: node tools/check.js
   node tools/check.js --fail   runs the four broken variants (one step per frame, a stronger right team, every
                                tap a heave, a stretchy rope); each must be caught, so this prints FAILED and exits 1. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { window: {}, console, Math, JSON, Float64Array, Int8Array, Number, Array, Infinity };
vm.createContext(ctx);
for (const f of ['js/sim.js', 'js/checks.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
const TW = ctx.window.TW;

const show = (rep) => {
  for (const c of rep.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.name}: ${c.detail}`);
  console.log(rep.ok ? 'ALL OK' : 'FAILED');
};

const t0 = Date.now();
if (process.argv.includes('--fail')) {
  const kinds = ['fps', 'lopsided', 'mash', 'stretchy'];
  let caught = 0;
  for (const fail of kinds) {
    const rep = TW.checks.run({ fail });
    console.log(`\n--- broken on purpose: ${fail}`);
    show(rep);
    if (!rep.ok) caught++;
  }
  console.log(`\n${caught}/${kinds.length} broken variants caught (${Date.now() - t0} ms)`);
  process.exit(caught === kinds.length ? 1 : 0);
} else {
  const rep = TW.checks.run();
  show(rep);
  console.log(`(${Date.now() - t0} ms)`);
  process.exit(rep.ok ? 0 : 1);
}

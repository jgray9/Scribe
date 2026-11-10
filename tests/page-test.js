// Page test: drives file://…/index.html in headless Chrome and runs the plan.md checklist.
// Not needed to run the app. Needs puppeteer-core installed OUTSIDE the repo, e.g.:
//   mkdir /tmp/pt && cd /tmp/pt && npm i puppeteer-core
//   NODE_PATH=/tmp/pt/node_modules node tests/page-test.js "$PWD" /tmp/scribe.png
const puppeteer = require('puppeteer-core');
const path = require('path');

const REPO = process.argv[2];
const SHOT = process.argv[3];
const url = 'file://' + path.join(REPO, 'index.html');

let fails = 0, passes = 0;
function check(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { passes++; console.log('ok   ' + name); }
  else { fails++; console.log('FAIL ' + name + '\n     got:  ' + g + '\n     want: ' + w); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 600 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url);

  const K = page.keyboard;
  // Lines as "text@stamp" using the rendered stamp column, matched by vertical position.
  const view = () => page.evaluate(() => {
    const mirror = document.getElementById('mirror');
    const stamps = [...document.querySelectorAll('#gutter .stamp')];
    return document.getElementById('text').value.split('\n').map((t, i) => {
      const top = mirror.children[i].getBoundingClientRect().top;
      const s = stamps.find(s => Math.abs(s.getBoundingClientRect().top - top) < 1);
      return s ? t + '@' + s.textContent : t;
    });
  });
  const ui = () => page.evaluate(() => ({
    cur: document.getElementById('cur').textContent,
    max: document.getElementById('max').textContent,
    btn: document.getElementById('play').textContent,
    seekDisabled: document.getElementById('seek').disabled,
    rate: document.getElementById('rate').textContent,
  }));
  // Programmatic seek (does not move focus), for deterministic stamp times.
  // The seek bar's unit is one frame (1/30 s).
  const setFrame = f => page.evaluate(f => {
    const el = document.getElementById('seek');
    el.value = String(f);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, f);
  const setTime = sec => setFrame(Math.round(sec * 30));
  const caret = () => page.evaluate(() => {
    const ta = document.getElementById('text');
    return [ta.selectionStart, ta.selectionEnd, ta.value.length];
  });
  const focused = () => page.evaluate(() => document.activeElement.id);
  // Simulates paste: insertText goes through the same input pipeline as a paste.
  const paste = text => page.evaluate(t => document.execCommand('insertText', false, t), text);
  const aligned = () => page.evaluate(() => {
    const mirror = document.getElementById('mirror');
    const ta = document.getElementById('text');
    const stamps = document.querySelectorAll('#gutter .stamp').length;
    const stamped = ta.value.split('\n').filter(t => t !== '').length;
    let misaligned = 0;
    const tops = [...document.querySelectorAll('#gutter .stamp')].map(s => s.getBoundingClientRect().top);
    [...mirror.children].forEach((c, i) => {
      if (ta.value.split('\n')[i] === '') return;
      const top = c.getBoundingClientRect().top;
      if (!tops.some(t => Math.abs(t - top) < 1)) misaligned++;
    });
    return { stampsMatchLines: stamps === stamped, misaligned,
             noHiddenOverflow: ta.scrollHeight <= ta.clientHeight + 1 };
  });

  // ---------------------------------------------------------------- self-test
  check('selfTest in browser', await page.evaluate(() => Scribe.selfTest()), true);

  // -------------------------------------------------------------------- timer
  check('load state (seek bar enabled at max 0, D8)', await ui(), { cur: '0:00.00', max: '0:00.00', btn: 'Play', seekDisabled: false, rate: '1×' });
  await page.click('#play');
  check('play label', (await ui()).btn, 'Pause');
  // While running, the label should show (nearly) every frame: sample it on every animation frame for 1 s.
  const distinct = await page.evaluate(() => new Promise(res => {
    const seen = new Set(), el = document.getElementById('cur'), t0 = performance.now();
    (function f() { seen.add(el.textContent); if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(seen.size); })();
  }));
  check('running label shows ~30 distinct frames per second (got ' + distinct + ')', distinct >= 25 && distinct <= 32, true);
  await sleep(1300);
  await page.click('#play');
  let u = await ui();
  check('pause after ~2s: M:SS.FF format', /^0:02\.([0-2]\d)$/.test(u.cur), true);
  check('pause after ~2s: max = cur, Play, seek enabled', [u.max, u.btn, u.seekDisabled], [u.cur, 'Play', false]);
  const seekMax = await page.$eval('#seek', el => [Number(el.max), Number(el.step)]);
  check('seek bar max is the frame count of max', seekMax[0], 60 + Number(u.cur.slice(-2)));
  check('seek bar step is one frame', seekMax[1], 1);
  await setFrame(45);
  check('seek to frame 45 while paused', [(await ui()).cur, (await ui()).btn], ['0:01.15', 'Play']);
  const steps = [];
  for (let f = 0; f <= 31; f++) { await setFrame(f); steps.push((await ui()).cur); }
  check('one seek step = one frame (0..31)', steps,
    Array.from({ length: 32 }, (_, f) => '0:' + String(Math.floor(f / 30)).padStart(2, '0') + '.' + String(f % 30).padStart(2, '0')));
  await setTime(1);
  u = await ui();
  check('seek paused', [u.cur, u.btn], ['0:01.00', 'Play']);
  await page.click('#play');
  await setTime(0.5);
  await sleep(1200);
  u = await ui();
  check('seek while running keeps running', [/^0:01\.\d\d$/.test(u.cur), u.btn], [true, 'Pause']);
  await sleep(1500);   // run past the old max so high ≈ 3.2 s
  await page.click('#play');
  u = await ui();
  check('high-water mark grows', /^0:03\.\d\d$/.test(u.max), true);
  const highWas = u.max;
  await setTime(1);
  check('seek back keeps high-water mark', (await ui()).max, highWas);

  // ------------------------------------------------------------------- stamps
  await page.click('#text');
  check('notepad focused', await focused(), 'text');
  await setTime(1); await K.type('a');
  await setTime(2); await K.type('bc');
  check('S1/S2 stamp fixed while editing', await view(), ['abc@0:01.00']);
  await K.press('Enter'); await K.type(' ');
  check('S3 whitespace line stamped', await view(), ['abc@0:01.00', ' @0:02.00']);
  await K.press('Backspace');
  check('S4 emptied line loses stamp', await view(), ['abc@0:01.00', '']);
  await setTime(3); await K.type('x');
  check('S5 retyped line gets new stamp', await view(), ['abc@0:01.00', 'x@0:03.00']);

  await K.down('Control'); await K.press('Home'); await K.up('Control');
  await K.press('ArrowRight'); await K.press('ArrowRight');
  await setTime(2); await K.press('Enter');
  check('S7 enter mid-line', await view(), ['ab@0:01.00', 'c@0:02.00', 'x@0:03.00']);
  await K.press('Backspace');
  check('S9 backspace merge keeps upper', await view(), ['abc@0:01.00', 'x@0:03.00']);
  await K.down('Control'); await K.press('Home'); await K.up('Control');
  await setTime(3); await K.press('Enter');
  check('S8 enter at start keeps stamp', await view(), ['', 'abc@0:01.00', 'x@0:03.00']);
  await K.press('Backspace');
  check('S10 merge into empty upper keeps lower', await view(), ['abc@0:01.00', 'x@0:03.00']);

  await K.down('Control'); await K.press('Home'); await K.up('Control');
  await K.press('ArrowRight');
  await K.down('Shift'); await K.press('ArrowDown'); await K.up('Shift');
  await K.press('Delete');
  check('S12 multi-line delete keeps first stamp', await view(), ['a@0:01.00']);

  await K.press('End'); await K.press('Enter');
  await setTime(2); await paste('p\nq\n\nr');
  check('S14 multi-line paste', await view(), ['a@0:01.00', 'p@0:02.00', 'q@0:02.00', '', 'r@0:02.00']);

  // Frames within one second: stamped at different frames, sorted by frame on leave (S21, O11).
  // Frames stay inside second 2, below the ~3.2 s high-water mark (seeks past it are clamped).
  await K.down('Control'); await K.press('End'); await K.up('Control');
  await K.press('Enter'); await setFrame(60 + 20); await K.type('f20');
  await K.press('Enter'); await setFrame(60 + 3); await K.type('f03');
  await K.press('Enter');
  check('O11 frames order lines within a second', (await view()).slice(-3), ['f03@0:02.03', 'f20@0:02.20', '']);
  // Remove those two lines again (caret is on the empty last line) so later checks see the original document.
  await K.press('Backspace');
  await K.down('Shift'); await K.press('ArrowUp'); await K.press('ArrowUp'); await K.press('End'); await K.up('Shift');
  await K.press('Backspace');
  check('frame lines removed', (await view()).filter(l => /^f\d/.test(l)), []);

  // ----------------------------------------------------------------- ordering
  await K.down('Control'); await K.press('End'); await K.up('Control');
  await K.press('Enter');
  await setTime(0); await K.type('early');
  check('O3 active line not moved yet',
    await view(), ['a@0:01.00', 'p@0:02.00', 'q@0:02.00', '', 'r@0:02.00', 'early@0:00.00']);
  await K.press('Enter');
  check('O2 sorted on leave (O5 ties keep creation order, O6 separator stays)',
    await view(), ['early@0:00.00', 'a@0:01.00', 'p@0:02.00', '', 'q@0:02.00', 'r@0:02.00', '']);
  let c = await caret();
  check('O9 caret stays on its (last, empty) line', [c[0] === c[2], c[1] === c[2]], [true, true]);

  await setTime(1); await K.type('mid');
  await page.click('#play');   // real click → blur → leave
  check('O4 clicking Play counts as leaving',
    await view(), ['early@0:00.00', 'a@0:01.00', 'mid@0:01.00', '', 'p@0:02.00', 'q@0:02.00', 'r@0:02.00']);
  await page.click('#play');   // pause again

  // Caret stays on the same line object at the same column when lines move above it.
  await page.click('#text');
  await K.down('Control'); await K.press('End'); await K.up('Control');
  await K.press('Enter'); await setTime(0); await K.type('zz');
  await K.press('ArrowUp');   // leave 'zz' → it moves to the top; caret goes to 'r'
  c = await caret();
  const after = await page.evaluate(() => {
    const ta = document.getElementById('text');
    const before = ta.value.slice(0, ta.selectionStart);
    return { line: before.split('\n').length - 1, text: ta.value.split('\n')[before.split('\n').length - 1], col: before.split('\n').pop().length };
  });
  check('O9 caret follows its line after a sort above it', [after.text, after.col], ['r', 1]);
  check('O9 zz moved up, after the earlier-created tie', (await view()).slice(0, 2), ['early@0:00.00', 'zz@0:00.00']);

  // Real click on the seek bar also leaves the line.
  await K.down('Control'); await K.press('End'); await K.up('Control');
  await K.press('Enter'); await setTime(0); await K.type('seekleave');
  const box = await (await page.$('#seek')).boundingBox();
  await page.mouse.click(box.x + 2, box.y + box.height / 2);
  check('O4 clicking seek bar counts as leaving', (await view()).indexOf('seekleave@0:00.00') < 3, true);
  check('focus left notepad', await focused() !== 'text', true);

  // ------------------------------------------------------------------- layout
  await page.click('#text');
  await K.down('Control'); await K.press('End'); await K.up('Control');
  await K.press('Enter'); await setTime(3);
  const long = 'This is a long line that should wrap onto several visual rows when the window is narrow enough to force it. '.repeat(3);
  await paste(long);
  await K.press('Enter'); await K.type('after');
  await page.setViewport({ width: 500, height: 600 });
  await sleep(100);
  const narrow = await aligned();
  check('narrow: stamps aligned to first rows', narrow, { stampsMatchLines: true, misaligned: 0, noHiddenOverflow: true });
  const gap = () => page.evaluate(() => {
    const m = document.getElementById('mirror').children, n = m.length;
    return m[n - 1].getBoundingClientRect().top - m[n - 2].getBoundingClientRect().top;
  });
  const narrowGap = await gap();
  check('long line wraps (gap > 3 rows)', narrowGap > 22 * 3, true);
  await page.screenshot({ path: SHOT.replace('.png', '-narrow.png') });
  await page.setViewport({ width: 900, height: 600 });
  await sleep(100);
  check('resize wider: stamps re-aligned', await aligned(), { stampsMatchLines: true, misaligned: 0, noHiddenOverflow: true });
  check('resize wider: fewer wrapped rows', (await gap()) < narrowGap, true);

  // Long document: stamps scroll with text.
  await setTime(3);
  for (let i = 0; i < 40; i++) { await K.press('Enter'); await K.type('row ' + i); }
  const scroll = await page.evaluate(() => {
    const pad = document.getElementById('pad');
    return { scrollable: pad.scrollHeight > pad.clientHeight, scrollTop: pad.scrollTop };
  });
  check('long doc scrolls; caret kept in view', [scroll.scrollable, scroll.scrollTop > 0], [true, true]);
  check('long doc: stamps aligned after scroll', await aligned(), { stampsMatchLines: true, misaligned: 0, noHiddenOverflow: true });
  const lastVisible = await page.evaluate(() => {
    const ta = document.getElementById('text'), pad = document.getElementById('pad');
    const m = document.getElementById('mirror').children;
    const r = m[m.length - 1].getBoundingClientRect(), p = pad.getBoundingClientRect();
    return r.top >= p.top && r.bottom <= p.bottom;
  });
  check('last typed line visible', lastVisible, true);

  // Screenshot of a typical session at normal width.
  await page.evaluate(() => document.getElementById('pad').scrollTop = 0);
  await page.screenshot({ path: SHOT });

  // ----------------------------------------------------------------- keyboard
  // A page whose clock only moves when the test says so: performance.now() returns window.__now.
  const kb = await browser.newPage();
  await kb.setViewport({ width: 900, height: 600 });
  kb.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  kb.on('pageerror', e => errors.push(String(e)));
  await kb.evaluateOnNewDocument(() => { window.__now = 0; performance.now = () => window.__now; });
  await kb.goto(url);
  const KK = kb.keyboard;
  const at = async ms => { await kb.evaluate(ms => { window.__now = ms; }, ms); };
  const kui = () => kb.evaluate(() => ({
    cur: document.getElementById('cur').textContent,
    max: document.getElementById('max').textContent,
    btn: document.getElementById('play').textContent,
    rate: document.getElementById('rate').textContent,
    seek: document.getElementById('seek').value,
    focus: document.activeElement.id,
  }));
  // Render with the current fake clock (the rAF loop would too, but this avoids waiting for a frame).
  const cur = async () => { await kb.evaluate(() => new Promise(r => requestAnimationFrame(() => r()))); return (await kui()).cur; };
  const kSet = sec => kb.evaluate(f => {
    const el = document.getElementById('seek'); el.value = String(f);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, Math.round(sec * 30));
  const kText = () => kb.evaluate(() => document.getElementById('text').value);
  const kView = () => kb.evaluate(() => {
    const mirror = document.getElementById('mirror');
    const stamps = [...document.querySelectorAll('#gutter .stamp')];
    return document.getElementById('text').value.split('\n').map((t, i) => {
      const top = mirror.children[i].getBoundingClientRect().top;
      const s = stamps.find(s => Math.abs(s.getBoundingClientRect().top - top) < 1);
      return s ? t + '@' + s.textContent : t;
    });
  });

  // Before any Play: Tab reaches the seek bar (via the Play button) and Space starts the timer (K11).
  await KK.press('Tab'); await KK.press('Tab');
  check('K11 seek bar reachable by Tab before first Play', (await kui()).focus, 'seek');
  for (const k of ['j', 'l', ',', '.', 'ArrowLeft', 'ArrowRight']) await KK.press(k);
  check('K11 seek keys at max 0 do nothing', [await cur(), (await kui()).btn], ['0:00.00', 'Play']);
  await KK.press(' ');
  check('Space plays', (await kui()).btn, 'Pause');
  await at(5000);
  check('clock runs at 1x', await cur(), '0:05.00');
  await KK.press('k');
  check('k pauses', [(await kui()).btn, await cur()], ['Play', '0:05.00']);
  await KK.press('K');
  check('K (uppercase) plays (K15)', (await kui()).btn, 'Pause');
  await at(30000); await KK.press('k');
  check('build max 0:30', [(await kui()).max, (await kui()).btn], ['0:30.00', 'Play']);

  // 10 s jumps
  const seq = [];
  for (const k of ['j', 'ArrowLeft', 'l', 'ArrowRight', 'l']) { await KK.press(k); seq.push(await cur()); }
  check('j / ← / l / → jump 10 s; l at max stays (K1)', seq, ['0:20.00', '0:10.00', '0:20.00', '0:30.00', '0:30.00']);
  await kSet(4); await KK.press('j');
  check('K2 j at 0:04 → 0:00', await cur(), '0:00.00');
  await kSet(25); await KK.press('l');
  check('K3 l clamps to max', await cur(), '0:30.00');
  check('jumps keep focus on the seek bar', (await kui()).focus, 'seek');
  await kSet(5); await KK.press('k'); await at(31000);   // play from 0:05 at clock 30 s → 0:06 now
  await KK.press('l');
  check('K4 l while running keeps running', [await cur(), (await kui()).btn], ['0:16.00', 'Pause']);
  await at(32000);
  check('K4 still running after the jump', await cur(), '0:17.00');
  await KK.press('j');
  check('j while running', [await cur(), (await kui()).btn], ['0:07.00', 'Pause']);

  // Frame steps
  await at(32400);   // 0:07.40 s of timer → frame 0:07.12, running, behind max
  await KK.press('.');
  check('K7 . while running pauses, then next frame', [await cur(), (await kui()).btn], ['0:07.13', 'Play']);
  await KK.press(','); await KK.press(',');
  check(', steps back one frame each', await cur(), '0:07.11');
  await KK.press('.');
  check('K8 , then . returns', await cur(), '0:07.12');
  await kSet(0); await KK.press(',');
  check('K5 , at 0 stays', await cur(), '0:00.00');
  await kSet(30); await KK.press('.');
  check('K6 . at last frame stays', await cur(), '0:30.00');
  await kSet(1); const fr = [];
  for (let i = 0; i < 31; i++) { await KK.press('.'); fr.push(await cur()); }
  check('. steps exactly one frame (31 presses from 0:01.00)', fr,
    Array.from({ length: 31 }, (_, i) => { const f = 31 + i; return '0:' + String(Math.floor(f / 30)).padStart(2, '0') + '.' + String(f % 30).padStart(2, '0'); }));

  // Speed
  const up = [], down = [];
  for (let i = 0; i < 5; i++) { await KK.press('>'); up.push((await kui()).rate); }
  check('> steps up to 2× (K10, K9)', up, ['1.25×', '1.5×', '1.75×', '2×', '2×']);
  for (let i = 0; i < 8; i++) { await KK.press('<'); down.push((await kui()).rate); }
  check('< steps down to 0.25× (K9)', down, ['1.75×', '1.5×', '1.25×', '1×', '0.75×', '0.5×', '0.25×', '0.25×']);
  await kSet(10); await at(40000);
  for (let i = 0; i < 7; i++) await KK.press('>');
  check('back at 2×', (await kui()).rate, '2×');
  await KK.press(' '); await at(41000);
  check('2×: 1 s of clock = 2 s of timer', await cur(), '0:12.00');
  await KK.press('<'); await KK.press('<');   // 1.5×, while running: no jump
  check('speed change while running does not jump', [await cur(), (await kui()).rate], ['0:12.00', '1.5×']);
  await at(43000);
  check('1.5× after the change', await cur(), '0:15.00');
  await KK.press(' ');
  check('pause keeps speed', [(await kui()).btn, (await kui()).rate], ['Play', '1.5×']);

  // Blocked and ignored keys
  const before = await kui();
  for (const k of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) await KK.press(k);
  const afterBlock = await kui();
  check('↑ ↓ Home End PgUp PgDn blocked', [afterBlock.cur, afterBlock.seek, afterBlock.btn], [before.cur, before.seek, before.btn]);
  for (const [mod, k] of [['Control', 'k'], ['Alt', 'j'], ['Meta', '.'], ['Control', 'l']]) {
    await KK.down(mod); await KK.press(k); await KK.up(mod);
  }
  const afterMods = await kui();
  check('K14 Ctrl/Alt/Meta + key ignored', [afterMods.cur, afterMods.btn, afterMods.rate], [before.cur, before.btn, before.rate]);

  // Held key repeats (K13): four keydowns of l from 0 with max 0:30 → 0:30 (three would be enough).
  await kSet(0);
  await KK.down('l'); await KK.down('l'); await KK.down('l'); await KK.up('l');
  check('K13 holding l repeats', await cur(), '0:30.00');

  // Notepad and Tab
  await kb.click('#text');
  check('notepad focus by click', (await kui()).focus, 'text');
  await kSet(20); await KK.type('later');
  await KK.press('Enter'); await kSet(10); await KK.type('ear');
  await KK.press('ArrowLeft');   // caret: "ea|r" on the out-of-order line
  await KK.press('Tab');
  check('Tab moves notepad → seek bar', (await kui()).focus, 'seek');
  check('Tab inserted nothing', (await kText()).includes('\t'), false);
  check('K16 leaving by Tab sorts the line', await kView(), ['ear@0:10.00', 'later@0:20.00']);
  await KK.press('Tab');
  const back = await kb.evaluate(() => { const ta = document.getElementById('text'); return [document.activeElement.id, ta.selectionStart, ta.selectionEnd]; });
  check('Tab back restores caret on the same (moved) line', back, ['text', 2, 2]);
  // Selection survives a round trip, with Shift+Tab both ways.
  await KK.down('Shift'); await KK.press('ArrowDown'); await KK.up('Shift');   // select "r\nla"
  const sel = await kb.evaluate(() => { const ta = document.getElementById('text'); return [ta.selectionStart, ta.selectionEnd]; });
  await KK.down('Shift'); await KK.press('Tab'); await KK.up('Shift');
  check('Shift+Tab notepad → seek bar', (await kui()).focus, 'seek');
  await KK.down('Shift'); await KK.press('Tab'); await KK.up('Shift');
  const sel2 = await kb.evaluate(() => { const ta = document.getElementById('text'); return [document.activeElement.id, ta.selectionStart, ta.selectionEnd]; });
  check('Shift+Tab back restores the selection', sel2, ['text', sel[0], sel[1]]);

  // K17: shortcut characters typed in the notepad are just text.
  await KK.press('End');
  const timeBefore = await cur();
  await KK.type(' k,.<>jl');
  check('K17 shortcut chars type into the notepad', (await kText()).split('\n')[1], 'later k,.<>jl');
  check('K17 timer untouched while typing', [await cur(), (await kui()).btn, (await kui()).rate], [timeBefore, 'Play', '1.5×']);

  // Play click focuses the seek bar; focus ring visible.
  await kb.click('#play');
  const ring = await kb.evaluate(() => { const s = getComputedStyle(document.getElementById('seek')); return [document.activeElement.id, s.outlineStyle, s.outlineWidth]; });
  check('clicking Play focuses the seek bar, with a focus ring (D26, D27)', ring, ['seek', 'solid', '2px']);
  await KK.press('k');
  check('keys work right after clicking Play', (await kui()).btn, 'Play');
  // Stamps take the timer time at other speeds too.
  await KK.press('k'); await at(44000); await KK.press('k');   // 1 s at 1.5× → +1.5 s
  const tStamp = await cur();
  await KK.press('Tab'); await KK.down('Control'); await KK.press('End'); await KK.up('Control');
  await KK.press('Enter'); await KK.type('fast');
  check('stamp = scaled timer time', (await kView()).slice(-1)[0], 'fast@' + tStamp);
  await kb.click('#play'); await kb.click('#play');   // focus on seek bar for the screenshot
  await kb.screenshot({ path: SHOT.replace('.png', '-keys.png') });
  await kb.setViewport({ width: 500, height: 600 });
  const fit = await kb.evaluate(() => {
    const r = document.getElementById('rate'), s = document.getElementById('seek');
    return { rateFits: r.scrollWidth <= r.clientWidth + 1, seekWidth: s.getBoundingClientRect().width };
  });
  check('500 px: speed label fits, seek bar still usable', [fit.rateFits, fit.seekWidth > 60], [true, true]);
  await kb.screenshot({ path: SHOT.replace('.png', '-keys-narrow.png') });
  await kb.close();

  // Tab into a never-focused notepad puts the caret at the end (D25).
  const fresh = await browser.newPage();
  await fresh.goto(url);
  await fresh.focus('#seek'); await fresh.keyboard.press('Tab');
  check('D25 first Tab into notepad: focused, caret at end', await fresh.evaluate(() => {
    const ta = document.getElementById('text'); return [document.activeElement.id, ta.selectionStart, ta.value.length];
  }), ['text', 0, 0]);
  await fresh.close();

  // Past one hour: speed up the page's clock 2000x so ~2 s real time is ~67 min of timer.
  const fast = await browser.newPage();
  await fast.setViewport({ width: 900, height: 600 });
  fast.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  fast.on('pageerror', e => errors.push(String(e)));
  await fast.evaluateOnNewDocument(() => {
    const real = performance.now.bind(performance), t0 = real();
    performance.now = () => t0 + (real() - t0) * 2000;
  });
  await fast.goto(url);
  await fast.click('#play'); await sleep(2000); await fast.click('#play');
  await fast.click('#text'); await fast.keyboard.type('an hour in');
  const hour = await fast.evaluate(() => {
    const st = document.querySelector('#gutter .stamp'), g = document.getElementById('gutter');
    const sr = st.getBoundingClientRect(), gr = g.getBoundingClientRect();
    const cur = document.getElementById('cur'), seek = document.getElementById('seek');
    return { stamp: st.textContent, inside: sr.left >= gr.left && sr.right <= gr.right,
             cur: cur.textContent, curFits: cur.scrollWidth <= cur.clientWidth + 1 };
  });
  check('hour stamp format H:MM:SS.FF', /^1:\d\d:\d\d\.\d\d$/.test(hour.stamp), true);
  check('hour stamp fits inside the column', hour.inside, true);
  check('hour label format and fits', [/^1:\d\d:\d\d\.\d\d$/.test(hour.cur), hour.curFits], [true, true]);
  await fast.screenshot({ path: SHOT.replace('.png', '-hour.png') });
  await fast.close();

  check('no console errors', errors, []);
  await browser.close();
  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

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
  check('load state', await ui(), { cur: '0:00.00', max: '0:00.00', btn: 'Play', seekDisabled: true });
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

/* Scribe — a timed notepad.
 * Classic script (no ES modules: they are blocked on file://).
 * Pure core first; DOM wiring only when a document exists.
 * Node self-test:  node -e "process.exit(require('./app.js').selfTest()?0:1)"
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- formatting
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  var FPS = 30;   // fixed frame rate: 1 frame = 1/30 s = 100/3 ms

  /** ms → integer frame, rounded down (docs/features/frame-precision/SPEC.md, AC-1). */
  function toFrame(ms) { return Math.floor(Math.max(ms, 0) * 3 / 100); }

  /** First whole ms inside frame f. Integer maths: toFrame(frameStart(f)) === f. */
  function frameStart(f) { return Math.ceil(Math.max(f, 0) * 100 / 3); }

  /** frame → "M:SS.FF" under an hour, "H:MM:SS.FF" from one hour; FF = 00–29. */
  function formatFrames(f) {
    f = Math.max(Math.floor(f), 0);
    var s = Math.floor(f / FPS), ff = f % FPS;
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h > 0 ? h + ':' + pad2(m) : String(m)) + ':' + pad2(sec) + '.' + pad2(ff);
  }

  /** ms → formatted time, rounded down to the frame. */
  function formatTime(ms) { return formatFrames(toFrame(ms)); }

  // --------------------------------------------------------------------- timer
  /** Wall-clock timer. Every method takes `now` (ms) so it is testable. */
  function createTimer() {
    return {
      running: false,
      base: 0,       // time at last pause/seek/play
      startedAt: 0,  // `now` when it last started running from `base`
      high: 0,       // high-water mark (never decreases)
      rate: 1,       // speed: timer ms per wall-clock ms (0.25…2)
      time: function (now) {
        return this.running ? this.base + (now - this.startedAt) * this.rate : this.base;
      },
      max: function (now) {
        this.high = Math.max(this.high, this.time(now));
        return this.high;
      },
      play: function (now) {
        if (!this.running) { this.startedAt = now; this.running = true; }
      },
      pause: function (now) {
        if (this.running) { this.max(now); this.base = this.time(now); this.running = false; }
      },
      toggle: function (now) { if (this.running) this.pause(now); else this.play(now); },
      seek: function (ms, now) {
        var hi = this.max(now);
        this.base = Math.min(Math.max(ms, 0), hi);
        if (this.running) this.startedAt = now;
      },
      /** Change speed without a jump: rebase at the old rate first (docs/features/keybinds/SPEC.md, AC-3). */
      setRate: function (r, now) {
        if (this.running) { this.max(now); this.base = this.time(now); this.startedAt = now; }
        this.rate = r;
      }
    };
  }

  // --------------------------------------------------------------------- speed
  var RATE_MIN = 0.25, RATE_MAX = 2, RATE_STEP = 0.25;   // all exact in binary

  function stepRate(r, dir) {
    return Math.min(Math.max(r + dir * RATE_STEP, RATE_MIN), RATE_MAX);
  }

  /** 0.25× 0.5× 0.75× 1× 1.25× 1.5× 1.75× 2× */
  function formatRate(r) { return String(r) + '×'; }

  // ---------------------------------------------------------------------- keys
  var SEEK_KEYS = {
    ' ': 'toggle', k: 'toggle',
    j: 'back10', ArrowLeft: 'back10',
    l: 'fwd10', ArrowRight: 'fwd10',
    ',': 'prevFrame', '.': 'nextFrame',
    '<': 'slower', '>': 'faster',
    Tab: 'switch',
    ArrowUp: 'block', ArrowDown: 'block', Home: 'block', End: 'block',
    PageUp: 'block', PageDown: 'block'
  };

  /** Seek-bar keydown → action name, or null to leave the event alone (docs/features/keybinds/SPEC.md). */
  function seekKeyAction(ev) {
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return null;
    var k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    return Object.prototype.hasOwnProperty.call(SEEK_KEYS, k) ? SEEK_KEYS[k] : null;
  }

  /** Apply a seek-bar action to the timer. 'switch' and 'block' do nothing here. */
  function applySeekAction(T, action, now) {
    var f;
    switch (action) {
      case 'toggle': T.toggle(now); break;
      case 'back10': T.seek(T.time(now) - 10000, now); break;
      case 'fwd10': T.seek(T.time(now) + 10000, now); break;
      case 'prevFrame':
        T.pause(now); f = toFrame(T.time(now));
        T.seek(frameStart(Math.max(f - 1, 0)), now); break;
      case 'nextFrame':
        T.pause(now); f = toFrame(T.time(now));
        T.seek(frameStart(Math.min(f + 1, toFrame(T.max(now)))), now); break;
      case 'slower': T.setRate(stepRate(T.rate, -1), now); break;
      case 'faster': T.setRate(stepRate(T.rate, 1), now); break;
    }
  }

  // --------------------------------------------------------------------- lines
  // Line = { text: string, stamp: { f: integer frame (1/30 s), seq: number } | null }

  function joinLines(lines) {
    return lines.map(function (l) { return l.text; }).join('\n');
  }

  /**
   * Re-derive lines + stamps after an edit (docs/features/timed-notepad/SPEC.md, AC-13).
   * Unchanged prefix/suffix lines keep their objects. The first changed line
   * keeps its object and inherits the first stamp found in the old changed range.
   * Mutates reused line objects; returns a new array.
   */
  function reconcile(old, newText, nowMs, seqRef) {
    var texts = newText.split('\n');
    var O = old.length, N = texts.length;
    var p = 0;
    while (p < O && p < N && old[p].text === texts[p]) p++;
    var s = 0;
    while (s < Math.min(O, N) - p && old[O - 1 - s].text === texts[N - 1 - s]) s++;

    var oldMid = old.slice(p, O - s);
    var newMid = texts.slice(p, N - s);
    var result = old.slice(0, p);

    var inherited = null;
    for (var k = 0; k < oldMid.length; k++) {
      if (oldMid[k].stamp) { inherited = oldMid[k].stamp; break; }
    }
    for (var i = 0; i < newMid.length; i++) {
      var line;
      if (i === 0 && oldMid.length) {
        line = oldMid[0];
        line.text = newMid[i];
        line.stamp = inherited;
      } else {
        line = { text: newMid[i], stamp: null };
      }
      result.push(line);
    }
    for (var j = O - s; j < O; j++) result.push(old[j]);

    var f = toFrame(nowMs);   // D6/D13: integer frames
    for (var r = 0; r < result.length; r++) {
      var L = result[r];
      if (L.text === '') L.stamp = null;
      else if (!L.stamp) L.stamp = { f: f, seq: seqRef.next++ };
    }
    return result;
  }

  function byStamp(a, b) { return a.stamp.f - b.stamp.f || a.stamp.seq - b.stamp.seq; }

  /**
   * Sort stamped lines into the slots stamped lines occupy (docs/features/timed-notepad/SPEC.md, AC-34).
   * Empty lines and the active line keep their positions.
   */
  function sortLines(lines, active) {
    var slots = [], movers = [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].stamp && lines[i] !== active) { slots.push(i); movers.push(lines[i]); }
    }
    movers.sort(byStamp);   // Array.prototype.sort is stable; seq breaks ties anyway
    var out = lines.slice();
    for (var k = 0; k < slots.length; k++) out[slots[k]] = movers[k];
    return out;
  }

  // ----------------------------------------------------------------- self-test
  function selfTest() {
    var fails = 0, count = 0;
    function eq(name, got, want) {
      count++;
      var g = JSON.stringify(got), w = JSON.stringify(want);
      if (g !== w) { fails++; console.error('FAIL ' + name + '\n  got:  ' + g + '\n  want: ' + w); }
    }
    var S = 1000;
    // L('abc', 12) → line stamped at 12 s (frame 360); seq auto-assigned in creation order.
    // Seconds may be fractional; they are converted to frames with toFrame.
    var seqRef;
    function fresh() { seqRef = { next: 1 }; }
    function L(text, sec, seq) {
      return { text: text, stamp: sec == null ? null : { f: toFrame(sec * S), seq: seq == null ? seqRef.next++ : seq } };
    }
    // Compact view: "text@M:SS.FF" or "text" for unstamped.
    function view(lines) {
      return lines.map(function (l) { return l.stamp ? l.text + '@' + formatFrames(l.stamp.f) : l.text; });
    }
    function edit(lines, text, sec) { return reconcile(lines, text, sec * S, seqRef); }

    // §1 formatTime
    [[0, 0, '0:00.00'], [33, 0, '0:00.00'], [34, 1, '0:00.01'], [999, 29, '0:00.29'],
     [1000, 30, '0:01.00'], [1500, 45, '0:01.15'], [61000, 1830, '1:01.00'],
     [599999, 17999, '9:59.29'], [3599999, 107999, '59:59.29'], [3600000, 108000, '1:00:00.00'],
     [36061000, 1081830, '10:01:01.00'], [-5, 0, '0:00.00']]
      .forEach(function (c) {
        eq('toFrame ' + c[0], toFrame(c[0]), c[1]);
        eq('formatTime ' + c[0], formatTime(c[0]), c[2]);
      });
    var rt = 0;
    for (var fr = 0; fr <= 400000; fr++) if (toFrame(frameStart(fr)) !== fr) rt++;
    eq('frameStart round-trip 0..400000', rt, 0);
    eq('frameStart values', [frameStart(0), frameStart(1), frameStart(30), frameStart(45)], [0, 34, 1000, 1500]);
    eq('formatFrames 1h-1', formatFrames(108000 - 1), '59:59.29');

    // §2 timer
    var T = createTimer();
    eq('T load', [T.running, T.time(0), T.max(0)], [false, 0, 0]);
    T.play(1000); eq('T running', T.time(3500), 2500);
    T.pause(3000); eq('T paused', [T.running, T.time(9999), T.max(9999)], [false, 2000, 2000]);
    T.seek(500, 10000); eq('T seek paused', [T.running, T.time(20000)], [false, 500]);
    T.seek(99999, 10000); eq('T seek clamps high', T.time(10000), 2000);
    T.seek(-5, 10000); eq('T seek clamps low', T.time(10000), 0);
    T.play(10000); T.seek(1000, 11000);
    eq('T seek running keeps running', [T.running, T.time(12000)], [true, 2000]);
    eq('T high grows', T.max(15000), 5000);
    T.seek(1000, 15000); eq('T high kept after seek back', T.max(15000), 5000);
    T.toggle(16000); eq('T toggle pauses', [T.running, T.time(17000)], [false, 2000]);
    T.toggle(17000); eq('T toggle plays', T.running, true);

    // §2 speed
    T = createTimer(); eq('R load rate 1', T.rate, 1);
    T.setRate(2, 0); eq('R paused setRate no time change', [T.rate, T.time(5000)], [2, 0]);
    T.play(1000); eq('R 2x runs double', T.time(2000), 2000);
    eq('R 2x grows max', T.max(3000), 4000);
    T.setRate(0.5, 3000); eq('R rebase no jump', T.time(3000), 4000);
    eq('R 0.5x after rebase', T.time(5000), 5000);
    T.pause(5000); eq('R pause keeps rate', [T.running, T.rate, T.time(9000)], [false, 0.5, 5000]);
    T.seek(1000, 9000); T.play(9000); eq('R seek+play keep rate', T.time(13000), 3000);
    eq('R max kept through rates', T.max(13000), 5000);
    eq('stepRate', [stepRate(1, -1), stepRate(1, 1), stepRate(0.25, -1), stepRate(2, 1), stepRate(1.75, 1)],
      [0.75, 1.25, 0.25, 2, 2]);
    var r = 1, ups = []; for (var u = 0; u < 5; u++) { r = stepRate(r, 1); ups.push(r); }
    eq('stepRate up from 1 (K10)', ups, [1.25, 1.5, 1.75, 2, 2]);
    r = 1; var downs = []; for (var d = 0; d < 4; d++) { r = stepRate(r, -1); downs.push(r); }
    eq('stepRate down from 1 (K9)', downs, [0.75, 0.5, 0.25, 0.25]);
    eq('formatRate', [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(formatRate),
      ['0.25×', '0.5×', '0.75×', '1×', '1.25×', '1.5×', '1.75×', '2×']);

    // §6 keys
    function K(key, mods) {
      var e = { key: key, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false };
      for (var m in mods) e[m] = mods[m];
      return seekKeyAction(e);
    }
    eq('keys map', [' ', 'k', 'K', 'j', 'J', 'ArrowLeft', 'l', 'L', 'ArrowRight', ',', '.', '<', '>', 'Tab'].map(function (k) { return K(k); }),
      ['toggle', 'toggle', 'toggle', 'back10', 'back10', 'back10', 'fwd10', 'fwd10', 'fwd10', 'prevFrame', 'nextFrame', 'slower', 'faster', 'switch']);
    eq('keys shift allowed', [K('<', { shiftKey: true }), K('Tab', { shiftKey: true }), K('K', { shiftKey: true })], ['slower', 'switch', 'toggle']);
    eq('keys blocked', ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].map(function (k) { return K(k); }),
      ['block', 'block', 'block', 'block', 'block', 'block']);
    eq('keys K14 modifiers ignored', [K('k', { ctrlKey: true }), K('j', { altKey: true }), K('.', { metaKey: true }), K('Tab', { ctrlKey: true })],
      [null, null, null, null]);
    eq('keys unhandled', ['a', 'x', 'Enter', 'Escape', 'Shift', '0', 'Backspace'].map(function (k) { return K(k); }),
      [null, null, null, null, null, null, null]);

    // Fresh paused timer whose max is `hi` ms and time is `at` ms.
    function TT(hi, at) { var t = createTimer(); t.play(0); t.pause(hi); t.seek(at, hi); return t; }
    var A = applySeekAction;
    T = TT(9000, 4000); A(T, 'back10', 0); eq('K2 back10 clamps to 0', T.time(0), 0);
    T = TT(9000, 4000); A(T, 'fwd10', 0); eq('K3 fwd10 clamps to max', T.time(0), 9000);
    T = TT(9000, 9000); A(T, 'fwd10', 0); eq('K1 fwd10 at max', T.time(0), 9000);
    T = TT(30000, 15000); A(T, 'back10', 0); eq('back10', T.time(0), 5000);
    A(T, 'fwd10', 0); eq('fwd10', T.time(0), 15000);
    T = TT(30000, 15000); T.play(100000); A(T, 'fwd10', 100500);
    eq('K4 fwd10 running keeps running', [T.running, T.time(101500)], [true, 26500]);
    T = TT(30000, 15000); T.setRate(0.5, 0); A(T, 'back10', 0); eq('K12 10s not scaled by speed', T.time(0), 5000);
    T = TT(9000, 0); A(T, 'prevFrame', 0); eq('K5 prevFrame at 0', T.time(0), 0);
    T = TT(9000, 1500); A(T, 'prevFrame', 0); eq('prevFrame', [T.running, toFrame(T.time(0))], [false, 44]);
    A(T, 'nextFrame', 0); eq('K8 prev then next', toFrame(T.time(0)), 45);
    T = TT(9000, 9000); A(T, 'nextFrame', 0); eq('K6 nextFrame at last frame', toFrame(T.time(0)), 270);
    T = TT(9000, 0); T.play(0); A(T, 'nextFrame', 5400);   // running behind max: room to step
    eq('K7 nextFrame running pauses then steps', [T.running, formatTime(T.time(9999))], [false, '0:05.13']);
    T = createTimer(); T.play(0); A(T, 'nextFrame', 5400);  // running at the live edge: time == max
    eq('K7b nextFrame at live edge pauses, stays', [T.running, formatTime(T.time(9999))], [false, '0:05.12']);
    T = TT(9000, 0); T.play(0); A(T, 'prevFrame', 5400);
    eq('K7 prevFrame running pauses then steps', [T.running, formatTime(T.time(9999))], [false, '0:05.11']);
    eq('K7 stepped time is a frame start', T.time(9999), frameStart(toFrame(T.time(9999))));
    T = createTimer(); A(T, 'fwd10', 0); A(T, 'nextFrame', 0); A(T, 'back10', 0);
    eq('K11 seek keys before first play', [T.time(0), T.running], [0, false]);
    A(T, 'faster', 0); eq('K11 speed works before play', T.rate, 1.25);
    A(T, 'toggle', 0); eq('K11 toggle starts', T.running, true);
    A(T, 'toggle', 10); eq('toggle pauses', T.running, false);
    T = createTimer(); T.play(0); A(T, 'faster', 1000); A(T, 'faster', 1000);
    eq('faster while running: no jump, then 1.5x', [T.time(1000), T.time(2000), T.rate], [1000, 2500, 1.5]);
    A(T, 'slower', 2000); eq('slower', [T.rate, T.time(2000)], [1.25, 2500]);
    T = TT(9000, 4000); A(T, 'block', 0); A(T, 'switch', 0); A(T, null, 0);
    eq('block/switch/null do nothing', [T.time(0), T.running, T.rate], [4000, false, 1]);

    // §3 stamp assignment
    var a, b;
    fresh(); a = edit([L('')], 'a', 12); eq('S1', view(a), ['a@0:12.00']);
    var s1obj = a[0];
    a = edit(a, 'abc', 20); eq('S2', view(a), ['abc@0:12.00']); eq('S2 identity', a[0] === s1obj, true);
    fresh(); eq('S3', view(edit([L('')], ' ', 30)), [' @0:30.00']);
    fresh(); a = edit([L('abc', 12)], '', 35); eq('S4', view(a), ['']);
    a = edit(a, 'x', 40); eq('S5', view(a), ['x@0:40.00']);
    fresh(); eq('S6', view(edit([L('abc', 12)], 'abc\n', 50)), ['abc@0:12.00', '']);
    fresh(); a = [L('abc', 12)]; b = edit(a, 'ab\nc', 50);
    eq('S7', view(b), ['ab@0:12.00', 'c@0:50.00']); eq('S7 identity', b[0] === a[0], true);
    fresh(); a = [L('abc', 12)]; b = edit(a, '\nabc', 50);
    eq('S8', view(b), ['', 'abc@0:12.00']); eq('S8 identity', b[1] === a[0], true);
    fresh(); eq('S9', view(edit([L('ab', 12), L('c', 50)], 'abc', 60)), ['abc@0:12.00']);
    fresh(); a = [L(''), L('abc', 12)]; b = edit(a, 'abc', 60);
    eq('S10', view(b), ['abc@0:12.00']); eq('S10 identity', b[0] === a[1], true);
    fresh(); eq('S11', view(edit([L('ab', 12), L('c', 50)], 'abc', 60)), ['abc@0:12.00']);
    fresh(); eq('S12', view(edit([L('aXX', 1), L('YY', 2), L('ZZb', 3)], 'ab', 9)), ['ab@0:01.00']);
    fresh(); eq('S13', view(edit([L(''), L('abc', 12)], 'bc', 60)), ['bc@0:12.00']);
    fresh(); a = edit([L('')], 'p\nq\n\nr', 60);
    eq('S14', view(a), ['p@1:00.00', 'q@1:00.00', '', 'r@1:00.00']);
    eq('S14 seq order', [a[0].stamp.seq < a[1].stamp.seq, a[1].stamp.seq < a[3].stamp.seq], [true, true]);
    fresh(); eq('S15', view(edit([L('abcd', 12)], 'abp\nqcd', 60)), ['abp@0:12.00', 'qcd@1:00.00']);
    fresh(); eq('S16', view(edit([L(''), L('m', 5), L('n', 6)], 'z', 120)), ['z@0:05.00']);
    fresh(); eq('S17', view(edit([L('m', 5), L('n', 6)], '', 120)), ['']);
    fresh(); a = [L('a', 1), L('b', 2), L('c', 3)]; b = edit(a, 'a\nc', 9);
    eq('S18', view(b), ['a@0:01.00', 'c@0:03.00']); eq('S18 identity', [b[0] === a[0], b[1] === a[2]], [true, true]);
    fresh(); a = edit([L('')], 'x', 30.9); a = edit(a, 'x\ny', 30.2);
    eq('rounds down to the frame', view(a), ['x@0:30.27', 'y@0:30.06']);
    eq('D13 stored as integer frame', a[0].stamp.f, 927);
    fresh(); a = edit([L('')], 'x', 30.4); a = edit(a, 'x\ny', 30.4);
    eq('S19 same frame ties', view(a), ['x@0:30.12', 'y@0:30.12']);
    eq('S19 tie order by seq', a[0].stamp.seq < a[1].stamp.seq, true);
    fresh(); a = edit([L('')], 'x', 1.000); a = edit(a, 'x\ny', 1.040);
    eq('S21 different frames', view(a), ['x@0:01.00', 'y@0:01.01']);
    fresh(); a = edit([L('')], 'x', 1.000); a = edit(a, 'x\ny', 1.020);
    eq('S22 same frame', view(a), ['x@0:01.00', 'y@0:01.00']);
    fresh(); eq('surrogate: unchanged', view(edit([L('a', 1)], 'a', 9)), ['a@0:01.00']);
    fresh(); a = [L('x', 1), L('x', 2)]; b = edit(a, 'x\nxy', 9);
    eq('dup lines: edit second', view(b), ['x@0:01.00', 'xy@0:02.00']);

    // §4 ordering
    fresh(); a = [L('a', 1), L('b', 2)]; eq('O1', view(sortLines(a, null)), ['a@0:01.00', 'b@0:02.00']);
    fresh(); a = [L('a', 10), L('b', 20), L('x', 5), L('')];
    eq('O2', view(sortLines(a, a[3])), ['x@0:05.00', 'a@0:10.00', 'b@0:20.00', '']);
    eq('O3 active held', view(sortLines(a, a[2])), ['a@0:10.00', 'b@0:20.00', 'x@0:05.00', '']);
    fresh(); a = [L('q', 60, 7), L('p', 60, 6)]; eq('O5 ties by seq', view(sortLines(a, null)), ['p@1:00.00', 'q@1:00.00']);
    eq('O5 order', sortLines(a, null)[0].stamp.seq, 6);
    fresh(); a = [L('a', 3), L(''), L('b', 1)]; eq('O6', view(sortLines(a, null)), ['b@0:01.00', '', 'a@0:03.00']);
    fresh(); a = edit([L('abc', 12)], 'ab\nc', 50);
    eq('O7', view(sortLines(a, a[1])), ['ab@0:12.00', 'c@0:50.00']);
    fresh(); a = [L('late', 90), L('')]; a = edit(a, 'late\np\nq', 30);
    eq('O8 paste sorts non-active', view(sortLines(a, a[2])), ['p@0:30.00', 'late@1:30.00', 'q@0:30.00']);
    eq('O8 then leave', view(sortLines(sortLines(a, a[2]), null)), ['p@0:30.00', 'q@0:30.00', 'late@1:30.00']);
    fresh(); a = [L('a', 1), L('b', 2)]; var b0 = a[0]; a = edit(a, 'aa\nb', 9);
    eq('O10', view(sortLines(a, null)), ['aa@0:01.00', 'b@0:02.00']); eq('O10 identity', a[0] === b0, true);
    fresh(); a = [L('b', 5 + 20 / 30), L('a', 5 + 3.5 / 30)];
    eq('O11 frames order within a second', view(sortLines(a, null)), ['a@0:05.03', 'b@0:05.20']);
    fresh(); a = [L('c', 3), L('a', 1)]; b = sortLines(a, null);
    eq('sortLines pure', view(a), ['c@0:03.00', 'a@0:01.00']); eq('sortLines result', view(b), ['a@0:01.00', 'c@0:03.00']);

    var ok = fails === 0;
    console.log('Scribe.selfTest: ' + (count - fails) + '/' + count + ' passed');
    return ok;
  }

  // ----------------------------------------------------------------------- DOM
  function wire(doc, win) {
    function $(id) { return doc.getElementById(id); }
    var playBtn = $('play'), curEl = $('cur'), maxEl = $('max'), seekEl = $('seek'), rateEl = $('rate');
    var pad = $('pad'), gutter = $('gutter'), mirror = $('mirror'), ta = $('text');
    function now() { return win.performance.now(); }

    var timer = createTimer();
    var seqRef = { next: 1 };
    var lines = [{ text: '', stamp: null }];
    var joined = '';
    var active = null;
    var dragging = false;
    var savedCaret = null;   // { a, b: {line, col}, dir } remembered when Tab leaves the notepad

    // --- timer UI
    // The seek bar's unit is one frame (docs/features/frame-precision/SPEC.md, AC-3); the timer itself stays in ms.
    function renderTimer() {
      var n = now(), t = timer.time(n), m = timer.max(n);
      curEl.textContent = formatTime(t);
      maxEl.textContent = formatTime(m);
      var mf = toFrame(m);
      seekEl.max = String(mf);   // always enabled, even at max 0 (D8)
      if (!dragging) seekEl.value = String(toFrame(t));
      playBtn.textContent = timer.running ? 'Pause' : 'Play';
      rateEl.textContent = formatRate(timer.rate);
    }
    // Refresh every animation frame while running (R21); stop when paused.
    var ticking = false;
    function tick() {
      renderTimer();
      if (timer.running) win.requestAnimationFrame(tick); else ticking = false;
    }
    function startTick() {
      if (timer.running && !ticking) { ticking = true; win.requestAnimationFrame(tick); }
    }
    playBtn.addEventListener('click', function () { timer.toggle(now()); renderTimer(); startTick(); seekEl.focus(); });
    seekEl.addEventListener('pointerdown', function () { dragging = true; });
    win.addEventListener('pointerup', function () { dragging = false; });
    seekEl.addEventListener('input', function () {
      timer.seek(frameStart(Number(seekEl.value)), now());
      renderTimer();
    });
    seekEl.addEventListener('change', function () { dragging = false; renderTimer(); });

    // --- notepad
    function render() {
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < lines.length; i++) {
        var d = doc.createElement('div');
        d.textContent = lines[i].text || '​';
        frag.appendChild(d);
      }
      mirror.replaceChildren(frag);
      ta.style.height = Math.max(mirror.offsetHeight, pad.clientHeight) + 'px';
      var g = doc.createDocumentFragment();
      for (var j = 0; j < lines.length; j++) {
        if (!lines[j].stamp) continue;
        var s = doc.createElement('div');
        s.className = 'stamp';
        s.textContent = formatFrames(lines[j].stamp.f);
        s.style.top = mirror.children[j].offsetTop + 'px';
        g.appendChild(s);
      }
      gutter.replaceChildren(g);
    }

    function sync() {
      if (ta.value === joined) return;
      lines = reconcile(lines, ta.value, timer.time(now()), seqRef);
      joined = ta.value;
      render();
    }

    function lineIndexAt(off) {
      var n = 0, v = ta.value;
      for (var i = 0; i < off; i++) if (v.charCodeAt(i) === 10) n++;
      return n;
    }
    function toLineCol(off) {
      var i = lineIndexAt(off), start = 0;
      for (var k = 0; k < i; k++) start += lines[k].text.length + 1;
      return { line: lines[i], col: off - start };
    }
    function toOffset(lc) {
      var off = 0;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i] === lc.line) return off + Math.min(lc.col, lines[i].text.length);
        off += lines[i].text.length + 1;
      }
      return ta.value.length;
    }

    function resort() {
      var out = sortLines(lines, active);
      var same = true;
      for (var i = 0; i < out.length; i++) if (out[i] !== lines[i]) { same = false; break; }
      if (same) return;
      var focused = doc.activeElement === ta;
      var a, b, dir;
      if (focused) { a = toLineCol(ta.selectionStart); b = toLineCol(ta.selectionEnd); dir = ta.selectionDirection; }
      lines = out;
      joined = joinLines(lines);
      ta.value = joined;
      if (focused) ta.setSelectionRange(toOffset(a), toOffset(b), dir);
      render();
    }

    // Keep the caret's visual row fully inside #pad (the textarea itself never scrolls).
    function reveal() {
      if (doc.activeElement !== ta) return;
      var lc = toLineCol(ta.selectionEnd);
      var idx = lines.indexOf(lc.line), div = mirror.children[idx];
      if (!div) return;
      var rect, node = div.firstChild, len = lc.line.text.length;
      if (len && node) {
        var r = doc.createRange(), at = Math.min(lc.col, len - 1);
        r.setStart(node, at); r.setEnd(node, at + 1);
        var rs = r.getClientRects();
        rect = rs.length ? rs[lc.col >= len ? rs.length - 1 : 0] : div.getBoundingClientRect();
      } else {
        rect = div.getBoundingClientRect();
      }
      var box = pad.getBoundingClientRect(), margin = 8;
      if (rect.bottom + margin > box.bottom) pad.scrollTop += rect.bottom + margin - box.bottom;
      else if (rect.top - margin < box.top) pad.scrollTop -= box.top - (rect.top - margin);
    }

    function checkActive() {
      sync();
      var next = doc.activeElement === ta ? lines[lineIndexAt(ta.selectionEnd)] : null;
      if (next !== active) { active = next; resort(); }
      reveal();
    }

    ta.addEventListener('input', checkActive);
    ['keyup', 'mouseup', 'focus', 'select', 'selectionchange'].forEach(function (ev) {
      ta.addEventListener(ev, checkActive);
    });
    doc.addEventListener('selectionchange', function () { if (doc.activeElement === ta) checkActive(); });
    ta.addEventListener('blur', checkActive);
    win.addEventListener('resize', render);

    // --- keyboard (docs/features/keybinds/SPEC.md)
    seekEl.addEventListener('keydown', function (e) {
      var action = seekKeyAction(e);
      if (action === null) return;
      e.preventDefault();
      if (action === 'switch') {
        ta.focus();
        if (savedCaret) ta.setSelectionRange(toOffset(savedCaret.a), toOffset(savedCaret.b), savedCaret.dir);
        else ta.setSelectionRange(ta.value.length, ta.value.length);
        checkActive();
        return;
      }
      applySeekAction(timer, action, now());
      renderTimer();
      startTick();
    });
    ta.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;
      e.preventDefault();
      savedCaret = { a: toLineCol(ta.selectionStart), b: toLineCol(ta.selectionEnd), dir: ta.selectionDirection };
      seekEl.focus();   // blur → checkActive → sort with no active line (O4)
    });
    // Clicking the empty area beside/below the text focuses the end of the notepad.
    pad.addEventListener('mousedown', function (e) {
      if (e.target === ta) return;
      e.preventDefault();
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      checkActive();
    });

    renderTimer();
    render();
  }

  // -------------------------------------------------------------------- export
  var Scribe = {
    FPS: FPS,
    toFrame: toFrame,
    frameStart: frameStart,
    formatFrames: formatFrames,
    formatTime: formatTime,
    createTimer: createTimer,
    stepRate: stepRate,
    formatRate: formatRate,
    seekKeyAction: seekKeyAction,
    applySeekAction: applySeekAction,
    reconcile: reconcile,
    sortLines: sortLines,
    joinLines: joinLines,
    selfTest: selfTest
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Scribe;
  if (root) root.Scribe = Scribe;
  if (typeof document !== 'undefined' && document.getElementById('text')) {
    wire(document, window);
  }
})(typeof window !== 'undefined' ? window : null);

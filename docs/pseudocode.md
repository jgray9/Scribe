# Pseudocode

## Timer

```
createTimer():
  return { running: false, base: 0, startedAt: 0, high: 0 }

time(T, now):
  return T.running ? T.base + (now - T.startedAt) : T.base

max(T, now):
  T.high = max(T.high, time(T, now))      // high-water mark only grows
  return T.high

play(T, now):   if not T.running: T.startedAt = now; T.running = true
pause(T, now):  if T.running: T.high = max(T, now); T.base = time(T, now); T.running = false
toggle(T, now): T.running ? pause(T, now) : play(T, now)

seek(T, ms, now):
  hi = max(T, now)
  T.base = clamp(ms, 0, hi)
  if T.running: T.startedAt = now        // keep running from the new position
```

## Frames and formatting

```
FPS = 30

toFrame(ms):                       // round down to the frame; integer
  return floor(max(ms, 0) * 3 / 100)

frameStart(f):                     // first whole ms inside frame f
  return ceil(f * 100 / 3)         // integer maths: toFrame(frameStart(f)) == f for all f ≥ 0

formatFrames(f):
  sTotal = floor(f / FPS); ff = f % FPS
  h = floor(sTotal / 3600); m = floor((sTotal % 3600) / 60); sec = sTotal % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(sec)}.${pad2(ff)}`
               : `${m}:${pad2(sec)}.${pad2(ff)}`

formatTime(ms):
  return formatFrames(toFrame(ms))
```

## Seek bar (DOM layer)

```
renderTimer():
  t = timer.time(now); hi = timer.max(now)
  cur.text = formatTime(t); maxLabel.text = formatTime(hi)
  seek.max = toFrame(hi); seek.step = 1
  if not dragging: seek.value = toFrame(t)

onSeekInput():
  timer.seek(frameStart(Number(seek.value)), now)   // seek() still clamps to [0, high]
  renderTimer()

tick():                            // started by play, stopped by pause
  renderTimer()
  if timer.running: requestAnimationFrame(tick)
```

## reconcile — assign stamps after an edit

```
reconcile(old: Line[], newText, nowMs, seqRef):
  newTexts = newText.split("\n")
  O = old.length; N = newTexts.length

  // 1. unchanged prefix
  p = 0
  while p < O and p < N and old[p].text == newTexts[p]: p++

  // 2. unchanged suffix (must not overlap the prefix)
  s = 0
  while s < min(O, N) - p and old[O-1-s].text == newTexts[N-1-s]: s++

  oldMid = old[p .. O-s)
  newMid = newTexts[p .. N-s)

  result = old[0 .. p)                                  // same objects

  inherited = first line in oldMid with stamp ≠ null (or null)
  for i, text in newMid:
    if i == 0 and oldMid not empty:
      line = oldMid[0]                                  // keep identity (caret was here)
      line.text = text
      line.stamp = inherited ? inherited.stamp : null
    else:
      line = { text, stamp: null }
    result.push(line)

  result.push(...old[O-s .. O))                         // same objects

  // 3. normalize, in document order, so seq follows pasted order
  for line in result:
    if line.text == "":            line.stamp = null
    else if line.stamp == null:    line.stamp = { f: toFrame(nowMs), seq: seqRef.next++ }
  return result
```

## sortLines — order on leaving a line

```
sortLines(lines, active):                  // active: Line object or null
  slots  = indices i where lines[i].stamp ≠ null and lines[i] ≠ active
  movers = slots.map(i => lines[i])
  movers.sort((a, b) => a.stamp.f - b.stamp.f || a.stamp.seq - b.stamp.seq)
  out = lines.slice()                      // empty lines and the active line stay put
  for k, i in slots: out[i] = movers[k]
  return out
```

## Active-line check (DOM layer)

```
lineAt(offset): index of the line containing character offset (count "\n" before it)

checkActive():
  if notepad not focused: active = null
  else: active = state.lines[lineAt(textarea.selectionEnd)]
  if active !== state.activeLine:
    state.activeLine = active
    resort()

resort():
  // remember the selection as (line object, column)
  a = toLineCol(selectionStart); b = toLineCol(selectionEnd)
  newLines = sortLines(state.lines, state.activeLine)
  if order unchanged: return
  state.lines = newLines
  textarea.value = join(newLines)
  if focused: textarea.setSelectionRange(toOffset(a), toOffset(b))
  render()

onInput():
  state.lines = reconcile(state.lines, textarea.value, timer.time(now), seqRef)
  render()
  checkActive()
```

## Render (stamp column)

```
render():
  mirror.replaceChildren(lines.map(l => div(l.text || "​")))
  textarea.style.height = mirror.scrollHeight
  column.replaceChildren()
  for i, line in lines:
    if line.stamp: column.add(label(formatFrames(line.stamp.f), top = mirror.children[i].offsetTop))
```

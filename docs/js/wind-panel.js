// Wind controls for scene 1 (pick up). WIND holds the live values the pick-up scene reads every frame;
// the panel edits them. Defaults reproduce study 1's original streaks exactly.
const WIND_DEFAULTS = {
  count: 20,        // streaks spawned per gust
  length: 110,      // px, average streak length
  lengthVar: 45,    // ±% around the average length
  width: 1.5,       // px, stroke width
  color: '#ffffff',
  opacity: 85,      // %, peak opacity
  speed: 530,       // px/s, average travel speed
  speedVar: 21,     // ±% around the average speed
  life: 1.6,        // s, how long one streak lives
  motion: 'linear', // how a streak moves across its life
};
const WIND = Object.assign({}, WIND_DEFAULTS);

// position along the path (0..1 of the distance a linear streak would cover) for progress x (0..1)
const WIND_MOTIONS = {
  linear:    { label: 'Linear',        f: x => x },
  easeIn:    { label: 'Ease In',       f: x => x * x },
  easeOut:   { label: 'Ease Out',      f: x => 1 - (1 - x) * (1 - x) },
  easeInOut: { label: 'Ease In-Out',   f: x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2 },
  spring:    { label: 'Spring/Bounce', f: x => 1 - Math.exp(-5 * x) * Math.cos(4 * Math.PI * x) },
};

(() => {
  const STORE = 'statement-sequence.wind';
  try { Object.assign(WIND, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
  if (!WIND_MOTIONS[WIND.motion]) WIND.motion = WIND_DEFAULTS.motion;
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(WIND)); } catch (e) {} };

  // [key, label, min, max, step, unit]
  const SLIDERS = [
    ['count', 'Number of wind sprites', 0, 60, 1, 'per gust'],
    ['length', 'Length', 20, 400, 5, 'px'],
    ['lengthVar', 'Length variation', 0, 90, 1, '±%'],
    ['width', 'Width', 0.5, 8, 0.5, 'px'],
    ['opacity', 'Opacity', 0, 100, 1, '%'],
    ['speed', 'Speed', 100, 1500, 10, 'px/s'],
    ['speedVar', 'Speed variation', 0, 90, 1, '±%'],
    ['life', 'Lifetime', 0.4, 4, 0.1, 's'],
  ];
  const fmt = (k, v) => k === 'width' || k === 'life' ? Number(v).toFixed(1) : String(Math.round(v));

  const panel = document.createElement('details');
  panel.className = 'panel';
  try { panel.open = localStorage.getItem(STORE + '.open') === '1'; } catch (e) {}
  panel.addEventListener('toggle', () => { try { localStorage.setItem(STORE + '.open', panel.open ? '1' : '0'); } catch (e) {} });
  panel.innerHTML = `<summary>Wind controls <span class="sub">scene 1 · pick up</span></summary>
    <div class="body">
      ${SLIDERS.map(([k, label, min, max, step, unit]) => `
        <label class="row"><span class="name">${label}</span>
          <span class="val"><output data-out="${k}"></output> <span class="unit">${unit}</span></span>
          <input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}">
          <span class="range">${fmt(k, min)}–${fmt(k, max)} ${unit}</span>
        </label>`).join('')}
      <label class="row inline"><span class="name">Color</span><input type="color" data-k="color"></label>
      <fieldset class="row"><legend class="name">Motion</legend>
        ${Object.entries(WIND_MOTIONS).map(([k, m]) => `<label class="opt"><input type="radio" name="wind-motion" value="${k}"> ${m.label}</label>`).join('')}
      </fieldset>
      <div class="buttons">
        <button type="button" data-act="state" title="Back to the sheet on the floor; keeps these values">Reset state</button>
        <button type="button" data-act="defaults" title="Put every value back to study 1's original">Restore defaults</button>
        <button type="button" data-act="copy" class="wide">Copy values as prompt</button>
      </div>
      <textarea class="copybox" readonly hidden aria-label="Prompt text"></textarea>
      <p class="note" aria-live="polite"></p>
    </div>`;
  document.body.appendChild(panel);

  const $ = s => panel.querySelector(s), $$ = s => [...panel.querySelectorAll(s)];
  const note = $('.note');
  function sync() {
    $$('input[type=range]').forEach(el => { el.value = WIND[el.dataset.k]; });
    $$('output').forEach(el => { el.value = fmt(el.dataset.out, WIND[el.dataset.out]); });
    $('input[type=color]').value = WIND.color;
    $$('input[name=wind-motion]').forEach(el => { el.checked = el.value === WIND.motion; });
  }
  panel.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.k) WIND[el.dataset.k] = el.type === 'range' ? Number(el.value) : el.value;
    if (el.name === 'wind-motion') WIND.motion = el.value;
    sync(); save();
  });

  function prompt() {
    const m = WIND_MOTIONS[WIND.motion].label;
    return `In docs/js/wind-panel.js, set WIND_DEFAULTS for the wind streaks in scene 1 (pick up) to these values:
- Number of wind sprites: ${WIND.count} per gust (count: ${WIND.count})
- Length: ${WIND.length} px, variation ±${WIND.lengthVar}% (length: ${WIND.length}, lengthVar: ${WIND.lengthVar})
- Width: ${fmt('width', WIND.width)} px (width: ${WIND.width})
- Color: ${WIND.color} at ${WIND.opacity}% opacity (color: '${WIND.color}', opacity: ${WIND.opacity})
- Speed: ${WIND.speed} px/s, variation ±${WIND.speedVar}% (speed: ${WIND.speed}, speedVar: ${WIND.speedVar})
- Lifetime: ${fmt('life', WIND.life)} s (life: ${WIND.life})
- Motion: ${m} (motion: '${WIND.motion}')`;
  }
  async function copy() {
    const text = prompt(), box = $('.copybox');
    try { await navigator.clipboard.writeText(text); box.hidden = true; note.textContent = 'Copied. Paste it into a request to make these the new defaults.'; }
    catch (e) { box.hidden = false; box.value = text; box.focus(); box.select(); note.textContent = 'Clipboard blocked: the text is selected below, press Ctrl/Cmd+C.'; }
  }
  panel.addEventListener('click', e => {
    const act = e.target.dataset && e.target.dataset.act; if (!act) return;
    if (act === 'state') { if (window.restartSequence) window.restartSequence(); note.textContent = 'Back to the start.'; }
    if (act === 'defaults') { Object.assign(WIND, WIND_DEFAULTS); sync(); save(); note.textContent = 'Defaults restored.'; }
    if (act === 'copy') copy();
  });
  sync();
})();

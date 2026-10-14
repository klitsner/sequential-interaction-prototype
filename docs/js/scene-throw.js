// SCENE 4 — THROW · LIBERATING  (study 4)
// Grab the crumpled statement (it tightens in your fist and trembles), then throw it at the can. The ball leaves
// from your cursor at your speed, then eases toward a cleaner arc into the can. Misses add interest to the debt.
// Sequence changes: it opens by pulling back from the top-down view into the room while the ball drops to the floor,
// the counter starts from the statement's amount, and the scene ends holding on $0.00.
const Throw = (() => {
  const START = { x: 0, z: 0.07 }, G = 2.6, AIM = 0.9, T_FLIGHT = 1.35, EASE_FOR = 0.55;
  const VZK = 0.4, AIMZ = 0.9, ARRIVE = 1.6;
  let rollA = 0;   // accumulated roll angle; frame = floor(rollA / 45deg) % 8
  function drawRollBall(cx, cy, r, rot = 0, alpha = 1, dark = 0) {
    const im = ROLL[((Math.floor(rollA / (Math.PI / 4)) % 8) + 8) % 8];
    if (!im.complete) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rot);
    if (dark > 0) ctx.filter = `brightness(${1 - dark * 0.22})`;
    ctx.drawImage(im, -r * 1.2, -r * 1.2, r * 2.4, r * 2.4);     // svg ball radius is 50 of 120
    ctx.restore();
  }
  let S;
  function reset() {
    if (S && S.voice) S.voice.off();
    rollA = 0;
    S = { state: 'arrive', x: START.x, z: START.z, h: 0, vx: 0, vz: 0, vh: 0, rot: 0, spin: 0, samples: [], hold: null, mouse: null,
          trail: [], motes: [], ripples: [], hopPh: 0, hopAmp: 0.02, doneT: 0, lift: 0, squeeze: 0, voice: S && S.voice,
          debt: SEQ.DEBT, shown: SEQ.DEBT, debtShake: 0, floats: [], digits: [], swell: 0, swellV: 0, phase: null, zeroA: 0, launched: false,
          enterT: now(), landed: false, lastT: now() };
    brighten = 0;
  }
  reset();
  const ballR = s => 30 * s;
  function ballScreen() { const b = worldToScreen(S.x, S.z, S.h + S.lift); return { x: b.x, y: b.y - ballR(b.s) * (1 - 0.2 * S.squeeze), s: b.s }; }
  // screen point -> world (x, h) at the ball's current depth
  function screenToWorld(p, z) {
    const s = zScale(z), r = ballR(s) * (1 - 0.2 * S.squeeze);
    return { x: (p.x - W / 2) / (W * 0.9 * s), h: Math.max(0, (groundY(z) - p.y - r) / (H * 0.45 * s)) };
  }
  // velocity that would carry the ball from where it is now into the can in time T
  function idealFrom(T) {
    T = Math.max(0.35, T);
    return { vx: -S.x / T, vz: (CAN_Z - S.z) / T, vh: (canH() + 0.03 - S.h + G * T * T / 2) / T };
  }

  function move(p) {
    S.mouse = p;
    if (S.state === 'held') { S.hold = S.mouse; S.samples.push({ ...S.mouse, t: now() }); if (S.samples.length > 16) S.samples.shift(); }
  }
  function down(p, e) {
    audio();
    if (S.state !== 'ready') return;
    const b = ballScreen();
    if (Math.hypot(p.x - b.x, p.y - b.y) < 60) {
      cvs.setPointerCapture(e.pointerId); S.state = 'held'; S.hold = p; S.samples = [{ ...p, t: now() }];
      rustle(0.9); burst({ dur: 0.18, freq: 900, q: 0.8, vol: 0.12 });            // a tight scrunch as you grab it
    } else S.ripples.push({ x: p.x, y: p.y, t: now() });
  }
  function up() {
    if (S.state !== 'held') return;
    const t = now(), rec = S.samples.filter(s => t - s.t < 0.09);
    const a = rec[0] || S.samples[0], b = S.samples[S.samples.length - 1], dt = Math.max(0.016, b.t - a.t);
    const vxs = (b.x - a.x) / dt, vys = (b.y - a.y) / dt, s = zScale(S.z);
    // the ball leaves at your speed: choose depth + height velocity so its on-screen motion matches the cursor
    const upv = -vys;
    let vz = clamp(upv / H * VZK, 0, 3.2);
    let vh = (upv - 0.5 * H * vz) / (H * 0.45 * s);
    const vx = vxs / (W * 0.9 * s);
    S.launched = upv > 220;
    if (!S.launched) { vz = 0; vh = Math.max(0, vh); }
    Object.assign(S, { state: 'fly', vx, vz, vh, u0: { vx, vz, vh }, spin: 0.04 + Math.random() * 0.05, trail: [], flyT: t, squeeze0: S.squeeze });
    if (S.launched) { burst({ dur: 0.6, freq: 1600, q: 0.5, vol: 0.06, attack: 0.05 }); if (!S.voice) S.voice = makeVoice('sine'); }
  }

  function update(t) {
    const dt = Math.min(0.05, t - S.lastT); S.lastT = t;
    if (S.state === 'arrive') {
      if (!S.landed && t - S.enterT > ARRIVE * 0.8) { S.landed = true; thud(0.12, 120); rustle(0.3); }
      if (t - S.enterT > ARRIVE) S.state = 'ready';
      if (S.mouse) cvs.style.cursor = 'default';
      return;
    }
    const hoverBall = S.mouse && S.state === 'ready' && Math.hypot(S.mouse.x - ballScreen().x, S.mouse.y - ballScreen().y) < 60;
    S.lift = lerp(S.lift, hoverBall ? 0.05 : 0, 0.15);
    if (S.mouse) cvs.style.cursor = S.state === 'held' ? 'grabbing' : hoverBall ? 'grab' : 'default';
    S.squeeze = lerp(S.squeeze, S.state === 'held' ? 1 : 0, S.state === 'held' ? 0.2 : 0.04);

    if (S.state === 'held' && S.hold) {
      // follows the hand; lifting it off the floor raises it (its shadow stays on the floor and fades)
      const w = screenToWorld(S.hold, S.z);
      S.x = lerp(S.x, clamp(w.x, -0.6, 0.6), 0.5); S.h = lerp(S.h, Math.min(1.2, w.h), 0.5);
      if (Math.random() < 0.06) rustle(0.25);
    } else if (S.state === 'fly') {
      const ph = S.h, age = t - S.flyT;
      // ease from your throw toward a normalised throw at the can (only partly: your aim still counts)
      if (S.launched && age < EASE_FOR) {
        const id = idealFrom(T_FLIGHT - age), u = S.u0;
        const tgt = { vx: lerp(u.vx, id.vx, AIM), vz: lerp(u.vz, id.vz, AIMZ), vh: lerp(u.vh, id.vh, AIMZ) };
        const k = 1 - Math.exp(-dt * 6);
        S.vx += (tgt.vx - S.vx) * k; S.vz += (tgt.vz - S.vz) * k; S.vh += (tgt.vh - S.vh) * k;
      }
      S.x += S.vx * dt; S.z += S.vz * dt; S.h += S.vh * dt; S.vh -= G * dt; S.rot += S.spin;
      if (S.voice && S.launched) S.voice.set(330 + S.h * 400, 0.03, 1800);
      brighten = lerp(brighten, Math.min(0.2, S.h * 0.2), 0.05);
      if (Math.floor(t * 14) !== Math.floor((t - dt) * 14)) S.trail.push({ x: S.x, z: S.z, h: S.h, rot: S.rot, t });
      const ch = canH(), over = Math.abs(S.z - CAN_Z) < 0.12 && Math.abs(S.x) < CAN_R * 1.5;
      if (S.launched && over && S.vh < 0 && ph >= ch && S.h < ch) {
        S.state = 'in'; S.z = CAN_Z; S.x *= 0.4; S.doneT = t; if (S.voice) S.voice.off();
        thud(0.18, 80); startConsume(t);
      } else if (S.launched && Math.abs(S.z - CAN_Z) < 0.05 && Math.abs(S.x) < CAN_R * 1.6 && S.h < ch - 0.02) {
        S.vz = -Math.abs(S.vz) * 0.35; S.z = CAN_Z - 0.06; thud(0.15, 200); S.swellV += 0.4;    // bounced off the can
      } else if (S.h <= 0) {
        S.h = 0; const imp = Math.abs(S.vh);
        thud(clamp(imp * 0.15, 0.04, 0.2), 120); rustle(0.3);
        S.vh = imp * 0.32; S.vz *= 0.5; S.vx *= 0.5;
        if (S.vh < 0.25) { S.rot = 0; S.state = 'rollback'; S.vh = 0; if (S.voice) S.voice.off(); if (S.launched) addInterest(t); }
      }
      S.z = clamp(S.z, 0, 1.25); S.x = clamp(S.x, -0.7, 0.7);
    } else if (S.state === 'rollback') {
      const dz = S.z - START.z, dx = S.x - START.x;
      S.z -= Math.sign(dz) * Math.min(Math.abs(dz), 0.64 * dt); S.x -= Math.sign(dx) * Math.min(Math.abs(dx), 0.4 * dt);
      const p0 = S.hopPh; S.hopPh += dt * 14;
      if (Math.floor(S.hopPh / Math.PI) !== Math.floor(p0 / Math.PI)) { S.hopAmp = 0.01 + Math.random() * 0.025; burst({ dur: 0.03, freq: 800, q: 1.2, vol: 0.05 }); }
      S.h = Math.abs(Math.sin(S.hopPh)) * S.hopAmp; rollA += Math.hypot(Math.min(Math.abs(dz), 0.64 * dt), Math.min(Math.abs(dx), 0.4 * dt)) * 26;
      brighten = lerp(brighten, 0, 0.05);
      if (Math.abs(dz) < 0.002 && Math.abs(dx) < 0.002) { S.state = 'ready'; S.h = 0; }
    } else if (S.state === 'in') {
      S.h = Math.max(canH() - 0.35, S.h - 0.008);
      updateConsume(t, 1 / 60);
    }
    S.shown = lerp(S.shown, S.debt, 0.08); if (Math.abs(S.shown - S.debt) < 0.5) S.shown = S.debt;
    S.debtShake *= 0.9;
  }

  function draw(t) {
    if (S.state === 'arrive') { drawArrive(t); return; }
    drawScene(t);
    softRipple(S.ripples, t);
  }
  function drawScene(t) {
    drawRoom();
    drawFurniture();
    const behind = S.state === 'in' || S.z > CAN_Z;
    for (const tr of S.trail) {
      const age = t - tr.t; if (age > 1.2) continue;
      const b = worldToScreen(tr.x, tr.z, tr.h);
      drawRollBall(b.x, b.y - ballR(b.s), ballR(b.s) * 0.5, tr.rot, (1 - age / 1.2) * 0.22);
    }
    S.trail = S.trail.filter(tr => t - tr.t < 1.2);
    if (behind) drawTheBall();
    drawCanSwell();
    for (const m of S.motes) {
      const age = t - m.t; if (age > 3) continue;
      const hh = m.h + m.vh * age, x = m.x + m.vx * age, b = worldToScreen(x, CAN_Z, hh);
      ctx.fillStyle = `rgba(255,255,255,${(1 - age / 3) * 0.9})`;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(m.a + age * 2);
      ctx.beginPath(); ctx.moveTo(0, -m.r); ctx.lineTo(m.r * 0.8, m.r * 0.6); ctx.lineTo(-m.r * 0.7, m.r * 0.5); ctx.fill(); ctx.restore();
    }
    if (!behind) drawTheBall();

    // CUE once grabbed: white chevrons running from the ball toward the can
    if (S.state === 'held') {
      const b0 = ballScreen(), b1 = worldToScreen(0, CAN_Z, canH() + 0.25);
      const ang = Math.atan2(b1.y - b0.y, b1.x - b0.x), dist = Math.hypot(b1.x - b0.x, b1.y - b0.y);
      for (let i = 0; i < 4; i++) {
        const f = ((t * 1.4 + i / 4) % 1), d = 40 + f * Math.min(260, dist * 0.6), a = Math.sin(f * Math.PI);
        const x = b0.x + Math.cos(ang) * d, y = b0.y + Math.sin(ang) * d;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = `rgba(255,255,255,${a * 0.9})`;
        ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-7, -11); ctx.lineTo(-2, 0); ctx.lineTo(-7, 11); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    drawDebt(t);
  }

  // hand-off from the crumple: the top-down view pulls back into the room; the ball drops onto the floor at the start
  function drawArrive(t) {
    const age = t - S.enterT, e = easeIO(age / (ARRIVE * 0.8));
    const c0 = Crumple.center(), end = ballScreen(), endR = ballR(end.s);
    // the room, zooming out around the ball's resting place
    ctx.save(); ctx.translate(end.x, end.y); const z = lerp(1.6, 1, e); ctx.scale(z, z); ctx.translate(-end.x, -end.y);
    drawRoom(); drawFurniture(); drawCanSwell();
    ctx.restore();
    // the plain top-down ground fading away
    ctx.save(); ctx.globalAlpha = 1 - easeIO(age / (ARRIVE * 0.6)); ctx.fillStyle = SEQ.PLAIN; ctx.fillRect(0, 0, W, H); ctx.restore();
    // ball: falls from the crumple position to the floor, with a small bounce after it lands
    const bounce = age > ARRIVE * 0.8 ? Math.abs(Math.sin((age - ARRIVE * 0.8) * 10)) * 8 * Math.exp(-(age - ARRIVE * 0.8) * 6) : 0;
    const bx = lerp(c0.x, end.x, e), by = lerp(c0.y, end.y, e * e) - bounce, r = lerp(Crumple.BALL_R, endR, e);
    const g = worldToScreen(S.x, S.z, 0);
    ctx.fillStyle = `rgba(0,0,0,${0.16 * e})`; ctx.beginPath(); ctx.ellipse(g.x, g.y, ballR(g.s), 5 * g.s + 2, 0, 0, Math.PI * 2); ctx.fill();
    drawBall(BALL, bx, by, r, 0, 1 - e);
    drawRollBall(bx, by, r, 0, e);
    // the counter fades in
    ctx.save(); ctx.globalAlpha = easeIO((age - ARRIVE * 0.4) / (ARRIVE * 0.6)); drawDebt(t); ctx.restore();
  }

  function drawTheBall() {
    const t = now(), b = ballScreen(), g = worldToScreen(S.x, S.z, 0);
    // shadow stays on the floor: smaller and fainter the higher the ball is
    const lift = S.h + S.lift, sr = ballR(g.s) * clamp(1 - lift * 0.5, 0.35, 1);
    ctx.fillStyle = `rgba(0,0,0,${clamp(0.16 - lift * 0.1, 0.03, 0.16)})`;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, sr, (5 * g.s + 2) * clamp(1 - lift * 0.4, 0.4, 1), 0, 0, Math.PI * 2); ctx.fill();
    // held: crushed tighter, folds darker, trembling like an upset hand
    const q = S.squeeze;
    const fit = Math.abs(Math.sin(t * 3.1) * Math.sin(t * 1.7 + 1));
    const jx = (Math.random() - 0.5) * 5 * q * (0.4 + fit), jy = (Math.random() - 0.5) * 4 * q * (0.4 + fit), jr = (Math.random() - 0.5) * 0.12 * q;
    const breathe = S.state === 'ready' ? Math.sin(t * 2) * 0.03 : 0;
    drawRollBall(b.x + jx, b.y + jy - breathe * 20, ballR(b.s) * (1 + breathe) * (1 - 0.2 * q), S.rot + jr, 1, q);
  }

  // window on the back wall and a couch against it (low-poly, flat facets)
  function drawFurniture() {
    const hz = HORIZON();
    // window
    const wx = W * 0.08, wy = H * 0.125, ww = W * 0.3, wh = H * 0.145;
    ctx.fillStyle = '#c3c2bd'; ctx.fillRect(wx - 7, wy - 7, ww + 14, wh + 14);
    const panes = [[0, 0], [1, 0], [0, 1], [1, 1]], pw = (ww - 6) / 2, phh = (wh - 6) / 2;
    panes.forEach(([i, j]) => {
      const x = wx + i * (pw + 6), y = wy + j * (phh + 6);
      ctx.fillStyle = '#eeedea'; ctx.fillRect(x, y, pw, phh);
      ctx.fillStyle = '#f7f6f3'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + pw * 0.7, y); ctx.lineTo(x, y + phh * 0.85); ctx.fill();
    });
    ctx.fillStyle = '#b7b6b1'; ctx.fillRect(wx - 12, wy + wh + 6, ww + 24, 6);           // sill
    ctx.fillStyle = `rgba(255,255,255,${0.05 + brighten * 0.6})`;                         // light on the wall
    ctx.beginPath(); ctx.moveTo(wx, wy + wh + 12); ctx.lineTo(wx + ww, wy + wh + 12); ctx.lineTo(wx + ww * 1.5, hz); ctx.lineTo(wx + ww * 0.2, hz); ctx.fill();
    // couch: to the right of the can, against the wall
    const z = 1.12, P = (x, h) => worldToScreen(x, z, h);
    const x0 = 0.3, x1 = 1.55;
    const quad = (a, b, c, d, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; const f0 = P(x0, 0), f1 = P(x1, 0); ctx.beginPath(); ctx.ellipse((f0.x + f1.x) / 2, f0.y + 2, (f1.x - f0.x) / 2 + 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    quad(P(x0 + 0.06, 0.35), P(x1 - 0.06, 0.35), P(x1 - 0.06, 0.78), P(x0 + 0.06, 0.78), '#a8a7a2');    // back
    quad(P(x0 + 0.06, 0.78), P(x1 - 0.06, 0.78), P(x1 - 0.1, 0.84), P(x0 + 0.1, 0.84), '#b9b8b3');       // back top
    quad(P(x0, 0), P(x1, 0), P(x1, 0.3), P(x0, 0.3), '#9a9994');                                         // base front
    quad(P(x0 + 0.06, 0.3), P(x1 - 0.06, 0.3), P(x1 - 0.06, 0.42), P(x0 + 0.06, 0.42), '#c4c3be');       // seat
    const mid = (x0 + x1) / 2;
    quad(P(mid - 0.005, 0.42), P(mid + 0.005, 0.42), P(mid + 0.005, 0.74), P(mid - 0.005, 0.74), '#9d9c97'); // cushion split
    quad(P(x0, 0), P(x0 + 0.1, 0), P(x0 + 0.1, 0.62), P(x0, 0.5), '#8f8e89');                         // arms
    quad(P(x1 - 0.1, 0), P(x1, 0), P(x1, 0.5), P(x1 - 0.1, 0.5), '#868580');
    quad(P(x0, 0.5), P(x0 + 0.1, 0.5), P(x0 + 0.08, 0.54), P(x0 + 0.01, 0.54), '#a3a29d');
    quad(P(x1 - 0.1, 0.5), P(x1, 0.5), P(x1 - 0.01, 0.54), P(x1 - 0.08, 0.54), '#9b9a95');
  }

  // ---------- debt ----------
  const money = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const DEBT_Y = 74;
  function addInterest(t) {
    const add = Math.round(S.debt * 0.03 * 100) / 100;
    S.debt = Math.round((S.debt + add) * 100) / 100;
    const g = worldToScreen(S.x, S.z, 0);
    S.floats.push({ text: '+' + money(add), x: g.x, y: g.y - 30, t });
    S.debtShake = 1;
    tone(98, 0.9, 0.09, 0.25); tone(92.5, 1.1, 0.07, 0.3);      // low, sour
    thud(0.12, 60);
  }
  function drawDebt(t) {
    ctx.save(); ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(43,43,42,0.55)'; ctx.font = '600 10px Helvetica, Arial, sans-serif';
    ctx.fillText('TOTAL DEBT', W / 2, DEBT_Y - 34);
    const sx = (Math.random() - 0.5) * 8 * S.debtShake;
    if (S.phase === null || S.phase === 'zero') {
      ctx.font = '700 34px Helvetica, Arial, sans-serif';
      if (S.phase === 'zero') { ctx.globalAlpha *= S.zeroA; ctx.fillStyle = '#2b2b2a'; ctx.fillText('$0.00', W / 2, DEBT_Y); }
      else { ctx.fillStyle = S.debtShake > 0.2 ? '#000' : '#2b2b2a'; ctx.fillText(money(S.shown), W / 2 + sx, DEBT_Y); }
    }
    ctx.restore();
    // floating "+$..." from where the ball landed, drifting up to the counter
    for (const f of S.floats) {
      const age = t - f.t, k = easeIO(age / 1.4);
      if (age > 1.6) continue;
      ctx.save(); ctx.globalAlpha = age < 1.2 ? 1 : 1 - (age - 1.2) / 0.4;
      ctx.fillStyle = '#2b2b2a'; ctx.font = '700 15px Helvetica, Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(f.text, lerp(f.x, W / 2 + 70, k), lerp(f.y, DEBT_Y - 30, k));
      ctx.restore();
    }
    S.floats = S.floats.filter(f => t - f.t < 1.6);
    // digits travelling into the can, or blown apart
    for (const d of S.digits) {
      if (d.a <= 0.01) continue;
      ctx.save(); ctx.globalAlpha = d.a; ctx.translate(d.x, d.y); ctx.rotate(d.r); ctx.scale(d.s, d.s);
      ctx.fillStyle = '#2b2b2a'; ctx.font = '700 34px Helvetica, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(d.ch, 0, 0); ctx.restore();
    }
  }
  // ---------- success: the can eats the debt, swells, then lets it go ----------
  function startConsume(t) {
    S.phase = 'eat'; S.phaseT = t;
    const str = money(S.debt); ctx.font = '700 34px Helvetica, Arial, sans-serif';
    const total = ctx.measureText(str).width; let x = W / 2 - total / 2;
    S.digits = [...str].map((ch, i) => { const w = ctx.measureText(ch).width; const d = { ch, x: x + w / 2, y: DEBT_Y, x0: x + w / 2, y0: DEBT_Y, r: 0, s: 1, a: 1, delay: i * 0.07, eaten: false }; x += w; return d; });
  }
  function updateConsume(t, dt) {
    const age = t - S.phaseT, mouth = worldToScreen(0, CAN_Z, canH());
    // spring for the swell
    S.swellV += (S.swellT || 0) - S.swell; S.swellV *= 0.75; S.swell += S.swellV * 0.25;
    if (S.phase === 'eat') {
      let eaten = 0;
      for (const d of S.digits) {
        const k = clamp((age - d.delay) / 0.55, 0, 1), e = k * k;
        d.x = lerp(d.x0, mouth.x, e); d.y = lerp(d.y0, mouth.y - 4, e) - Math.sin(k * Math.PI) * 30; d.s = lerp(1, 0.25, e); d.r = k * 0.6;
        if (k >= 1) { if (!d.eaten) { d.eaten = true; tone(140 + Math.random() * 20, 0.25, 0.06); burst({ dur: 0.05, freq: 500, q: 1, vol: 0.06 }); } d.a = 0; eaten++; }
      }
      S.swellT = 0.14 * eaten / S.digits.length;                // fills up
      S.wob = Math.sin(t * 30) * 0.015 * (eaten / S.digits.length);
      if (eaten === S.digits.length) { S.phase = 'hold'; S.phaseT = t; }
    } else if (S.phase === 'hold') {
      S.swellT = 0.16; S.wob = Math.sin(t * 40) * 0.02;
      if (age > 0.7) {
        S.phase = 'release'; S.phaseT = t; S.swellT = 0; S.wob = 0;
        // calming woosh, then the digits burst out and drift apart
        burst({ dur: 2.2, freq: 700, q: 0.4, vol: 0.12, attack: 0.25, type: 'lowpass' });
        [261.6, 329.6, 392, 523.3].forEach((f, i) => tone(f, 3.2, 0.05, 0.3 + i * 0.12));
        S.digits.forEach((d, i) => Object.assign(d, { x: mouth.x + (Math.random() - 0.5) * 10, y: mouth.y, a: 1, s: 0.5,
          vx: (i - S.digits.length / 2) * 22 + (Math.random() - 0.5) * 40, vy: -170 - Math.random() * 120, vr: (Math.random() - 0.5) * 4 }));
        for (let i = 0; i < 18; i++) S.motes.push({ x: (Math.random() - 0.5) * 0.06, h: canH(), vh: 0.25 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.1, r: 3 + Math.random() * 4, a: Math.random() * 6, t });
      }
    } else if (S.phase === 'release') {
      for (const d of S.digits) {
        d.vy += 40 * dt; d.vx *= 0.995; d.vx += 30 * dt;                 // a gentle drift to one side, like breath
        d.x += d.vx * dt; d.y += d.vy * dt; d.r += d.vr * dt; d.s = Math.min(1.1, d.s + dt * 0.8); d.a = Math.max(0, 1 - age / 2.4);
      }
      brighten = lerp(brighten, 0.3, 0.02);
      if (age > 1.6) { S.phase = 'zero'; S.phaseT = t; S.debt = 0; S.shown = 0; }
    } else if (S.phase === 'zero') {
      S.zeroA = Math.min(1, age / 1.0);
      for (const d of S.digits) { d.x += d.vx * dt; d.y += d.vy * dt; d.a = Math.max(0, d.a - dt); }
      brighten = lerp(brighten, 0.3, 0.02);
    }
  }
  function drawCanSwell() {
    const b = worldToScreen(0, CAN_Z, 0), sw = 1 + (S.swell || 0);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(S.wob || 0); ctx.scale(sw, 1 + (S.swell || 0) * 0.6); ctx.translate(-b.x, -b.y);
    drawCan(); ctx.restore();
  }

  return {
    reset, update, draw, down, move, up,
    enter(mouse) { S.mouse = mouse; S.enterT = now(); S.lastT = now(); },
    leave() { S.mouse = null; },
    get done() { return S.phase === 'zero' && S.zeroA >= 1; },   // the ending: hold on $0.00
    stop() { if (S.voice) S.voice.off(); },
  };
})();

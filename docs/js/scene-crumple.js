// SCENE 3 — CRUMPLE · CRUSHING  (study 3)
// The statement sits on plain ground. Hover: two open white-glove hands fade in at its sides.
// Press and hold: the hands close in, fingers curl, and they shake harder as the paper is crushed into a low-poly ball.
// Sequence changes: it opens with the flipped sheet being set down (from the held height to the ground, its plain
// face taking on folds), and the sheet keeps the 230×300 size it has had since the start. The folded face is
// front_folded.svg: study 3's fold facets (front.svg) under the statement text the flip revealed (front_plain.svg).
const Crumple = (() => {
  const HW = SEQ.PW / 2, HH = SEQ.PH / 2, M = 22, BALL_R = 50, SETTLE = 0.9;
  const RECT = [], TARGET = [];
  for (let i = 0; i < M; i++) {
    const u = i / M * 4, side = Math.floor(u), f = u - side;
    const p = side === 0 ? [-HW + 2 * HW * f, -HH] : side === 1 ? [HW, -HH + 2 * HH * f] : side === 2 ? [HW - 2 * HW * f, HH] : [-HW, HH - 2 * HH * f];
    RECT.push(p);
    const a = Math.atan2(p[1], p[0]);
    let best = BALL.outer[0], bd = 9; BALL.outer.forEach(o => { const d = Math.abs(Math.atan2(o[1], o[0]) - a); const dd = Math.min(d, 2 * Math.PI - d); if (dd < bd) { bd = dd; best = o; } });
    const r = Math.hypot(...best); TARGET.push([Math.cos(a) * r * BALL_R, Math.sin(a) * r * BALL_R]);
  }
  let S;
  function reset() {
    if (S && S.groan) S.groan.off();
    S = { c: 0, L: 0, held: false, mouse: null, state: 'settle', shake: 0, handA: 0, close: 0, ripples: [], groan: S && S.groan,
          doneT: 0, enterT: now(), landed: false, done: false };
  }
  reset();
  const center = () => ({ x: W / 2, y: H * 0.47 });
  const halfW = k => lerp(HW, BALL_R, k);
  function overPaper(p) { const c = center(), k = easeIO(S.c); return p && Math.abs(p.x - c.x) < halfW(k) + 60 && Math.abs(p.y - c.y) < lerp(HH, BALL_R, k) + 30; }

  function move(p) { S.mouse = p; }
  function down(p, e) {
    audio();
    if (S.state === 'ball' || S.state === 'settle') return;
    if (overPaper(p)) {
      cvs.setPointerCapture(e.pointerId); S.held = true; S.state = 'crush';
      if (!S.groan) S.groan = makeVoice('sawtooth');
      thud(0.1, 80); rustle(0.5);
    } else S.ripples.push({ x: p.x, y: p.y, t: now() });
  }
  function up() {
    if (!S.held) return; S.held = false;
    if (S.groan) S.groan.off();
    if (S.state !== 'ball') { S.L = S.c * 0.85; S.state = 'flat'; }
  }

  function update(t) {
    const dt = 1 / 60;
    if (S.state === 'settle') {
      if (!S.landed && t - S.enterT > SETTLE * 0.85) { S.landed = true; burst({ dur: 0.16, freq: 500, q: 0.6, vol: 0.08, attack: 0.01 }); }
      if (t - S.enterT > SETTLE) S.state = 'flat';
    }
    const hov = S.state !== 'settle' && S.mouse && overPaper(S.mouse);
    if (S.mouse) cvs.style.cursor = S.state === 'ball' || S.state === 'settle' ? 'default' : hov || S.held ? 'none' : 'default';
    S.handA = lerp(S.handA, (hov || S.held) && S.state !== 'ball' ? 1 : 0, S.state === 'ball' ? 0.04 : 0.1);
    if (S.held) {
      S.close = lerp(S.close, 1, 0.2);
      if (S.close > 0.8) {             // hands are on the paper: start crushing; slow at first, then it gives way
        const rate = 0.16 + S.c * 0.75, prev = S.c;
        S.c = Math.min(1, S.c + rate * dt);
        S.shake = 0.6 + S.c * 7;
        if (S.groan) S.groan.set(46 + (1 - S.c) * 20, 0.05 + S.c * 0.05, 180 + S.c * 300);
        if (Math.random() < 0.18 + S.c * 0.5) burst({ dur: 0.05 + Math.random() * 0.06, freq: 300 + Math.random() * 1200, q: 1 + Math.random() * 2, vol: 0.08 + S.c * 0.12 });
        if (S.c >= 1 && prev < 1) { thud(0.45, 55); burst({ dur: 0.25, freq: 600, q: 0.6, vol: 0.2 }); S.state = 'ball'; S.held = false; S.doneT = t; if (S.groan) S.groan.off(); }
      }
    } else {
      S.close = lerp(S.close, 0, 0.08);
      if (S.state === 'flat') S.c = lerp(S.c, S.L, 0.025);
      S.shake *= 0.85;
    }
    // once the ball has bounced and settled, the throw becomes available
    if (S.state === 'ball' && t - S.doneT > 0.9) S.done = true;
  }

  function draw(t) {
    ctx.fillStyle = SEQ.PLAIN; ctx.fillRect(0, 0, W, H);
    if (S.state === 'settle') { drawSettle(t); return; }
    const c0 = center(), k = easeIO(S.c);
    const j = () => (Math.random() - 0.5) * S.shake;
    const cx = c0.x + j(), cy = c0.y + j() + (S.state === 'ball' ? Math.abs(Math.sin((t - S.doneT) * 8)) * 10 * Math.exp(-(t - S.doneT) * 4) : 0);
    const pts = RECT.map((p, i) => [cx + lerp(p[0], TARGET[i][0], k), cy + lerp(p[1], TARGET[i][1], k)]);

    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.ellipse(c0.x, c0.y + lerp(HH, BALL_R, k) + 26, lerp(HW, BALL_R, k), 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.clip();
    ctx.translate(cx, cy); const sc = 1 - k * 0.7; ctx.scale(sc, sc);
    if (IMG.front_folded.complete) ctx.drawImage(IMG.front_folded, -HW, -HH, HW * 2, HH * 2);
    ctx.restore();
    if (k > 0.02) {
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.25);
      for (let i = 0; i < M; i++) {
        const a = pts[i], b = pts[(i + 1) % M];
        const tt = [[(a[0] - cx) / BALL_R, (a[1] - cy) / BALL_R], [(b[0] - cx) / BALL_R, (b[1] - cy) / BALL_R], [-0.1, -0.12]]; tt.j = Math.sin(i * 12.9) * 1.6;
        ctx.fillStyle = triShade(tt, 0);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(cx - 6 * k, cy - 8 * k); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke();
      }
      ctx.restore();
      if (k > 0.6) drawBall(BALL, cx, cy, BALL_R * lerp(1.4, 1, (k - 0.6) / 0.4), 0, (k - 0.6) / 0.4);
    }

    // hands: open and hovering a little outside the sheet; close in onto its edges; fingers curl as it is crushed
    if (S.handA > 0.02) {
      const edge = halfW(k), gap = lerp(20, 0, S.close), bob = Math.sin(t * 2.4) * 3 * (1 - S.close);
      const curl = Math.min(1, S.close * 0.2 + S.c * 1.0);
      glove(cx + edge + gap + j(), cy + bob + j(), 1, curl, S.handA);
      glove(cx - edge - gap + j(), cy - bob + j(), -1, curl, S.handA);
    }
    softRipple(S.ripples, t);
  }

  // hand-off from the flip: the sheet comes down from the held height onto the ground
  function drawSettle(t) {
    const e = easeIO((t - S.enterT) / SETTLE), c0 = center();
    const cy = lerp(H * 0.48, c0.y, e), sc = lerp(Flip.LS, 1, e), h = SEQ.LIFT_H * (1 - e);
    // lifted shadow shrinking under the sheet, ground shadow coming in
    ctx.save(); ctx.filter = `blur(${lerp(15, 3, e)}px)`; ctx.fillStyle = `rgba(30,28,25,${0.26 * (1 - e)})`;
    ctx.fillRect(c0.x - HW - h * 0.04 + h * 0.22 + 2, cy - HH + h * 0.4 + 3, HW * 2 + h * 0.08, HH * 2); ctx.restore();
    ctx.fillStyle = `rgba(0,0,0,${0.08 * e})`; ctx.beginPath(); ctx.ellipse(c0.x, c0.y + HH + 26, HW, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(c0.x, cy); ctx.scale(sc, sc);
    if (IMG.front_folded.complete) ctx.drawImage(IMG.front_folded, -HW, -HH, HW * 2, HH * 2);
    if (IMG.front_plain.complete) { ctx.globalAlpha = 1 - e; ctx.drawImage(IMG.front_plain, -HW, -HH, HW * 2, HH * 2); }
    ctx.restore();
  }

  // low-poly white glove drawn from 5 frames (glove_01..05.svg): open -> fist. side = 1 for the right hand (fingers point left).
  function glove(x, y, side, curl, alpha) {
    const im = GLOVES[Math.max(0, Math.min(4, Math.round(curl * 4)))];
    if (!im.complete) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(-side * 0.82, 0.82);   // local +x points toward the paper
    ctx.drawImage(im, -96 - 22, -60, 176, 124);    // svg viewBox: -96 -60 176 124; knuckles sit ~28px outside the edge
    ctx.restore();
  }

  return {
    reset, update, draw, down, move, up,
    enter(mouse) { S.mouse = mouse; S.enterT = now(); },
    leave() { S.mouse = null; },
    get done() { return S.done; },
    stop() { if (S.groan) S.groan.off(); },
    BALL_R, center,
  };
})();

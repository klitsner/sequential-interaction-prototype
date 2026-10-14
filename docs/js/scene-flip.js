// SCENE 2 — FLIP · CURIOUS  (study 2)
// The sheet is held up, face down. Hover near any edge: a hand fades in gripping that edge and gives it small tugs,
// and an arrow shows which way to drag. Drag across to turn the sheet over around its middle: the debt is revealed.
// Sequence changes: everything is drawn at the height the pick-up left the sheet (scaled about the centre, so the
// study's own geometry, hit areas and drag distances are unchanged), with the pick-up's lifted shadow and back face.
const Flip = (() => {
  const PW = SEQ.PW, PH = SEQ.PH, K = 1 / 700, EDGE = 26;
  const LS = 1 + SEQ.LIFT_H / 650;                 // held scale, matches the end of the pick-up
  let FRONT = null, BACK = null;
  function buildFaces() {
    if (FRONT || !IMG.front_plain.complete) return;
    FRONT = document.createElement('canvas'); FRONT.width = PW * 2; FRONT.height = PH * 2;
    FRONT.getContext('2d').drawImage(IMG.front_plain, 0, 0, PW * 2, PH * 2);
    buildSheetFaces(); BACK = SHEET.BACK;      // the same blank side, faint ink showing through, as in the pick-up
  }
  let S;
  function reset() {
    if (S && S.voice) S.voice.off();
    S = { phi: 0, vel: 0, target: 0, state: 'back', mouse: null, edge: null, grip: 0.5, handA: 0, drag: false, start: null,
          ripples: [], voice: S && S.voice, lastNote: 0, done: false, frontT: 0 };
  }
  reset();
  const C = () => ({ x: W / 2, y: H * 0.48 });
  // screen point -> the study's unscaled sheet space
  const local = p => { if (!p) return null; const c = C(); return { x: c.x + (p.x - c.x) / LS, y: c.y + (p.y - c.y) / LS }; };
  // edges: dir = unit vector pointing from that edge across the sheet (the drag direction)
  const EDGES = {
    left: { axis: 'v', s: -1, dir: [1, 0] }, right: { axis: 'v', s: 1, dir: [-1, 0] },
    top: { axis: 'h', s: -1, dir: [0, 1] }, bottom: { axis: 'h', s: 1, dir: [0, -1] },
  };
  function nearestEdge(p) {
    const c = C(), dx = p.x - c.x, dy = p.y - c.y;
    if (Math.abs(dx) > PW / 2 + EDGE || Math.abs(dy) > PH / 2 + EDGE) return null;
    const cand = [['left', Math.abs(dx + PW / 2)], ['right', Math.abs(dx - PW / 2)], ['top', Math.abs(dy + PH / 2)], ['bottom', Math.abs(dy - PH / 2)]]
      .sort((a, b) => a[1] - b[1])[0];
    return cand[1] < EDGE ? cand[0] : null;
  }

  function move(p) {
    S.mouse = local(p);
    if (S.drag) {
      const E = EDGES[S.edge], v = [S.mouse.x - S.start.x, S.mouse.y - S.start.y];
      const along = v[0] * E.dir[0] + v[1] * E.dir[1];
      S.target = clamp(along / ((E.axis === 'v' ? PW : PH) * 0.95), 0, 1) * Math.PI;
    }
  }
  function down(sp, e) {
    audio();
    const p = local(sp);
    if (S.state !== 'back') return;
    const ed = nearestEdge(p);
    if (ed) { cvs.setPointerCapture(e.pointerId); S.edge = ed; S.drag = true; S.start = p; rustle(0.4); if (!S.voice) S.voice = makeNoiseVoice('highpass'); }
    else S.ripples.push({ x: sp.x, y: sp.y, t: now() });
  }
  function up() {
    if (!S.drag) return; S.drag = false;
    if (S.phi > Math.PI / 2) { S.target = Math.PI; S.state = 'turning'; } else { S.target = 0; }
  }

  function update(t) {
    buildFaces();
    // hover: which edge, where along it
    let hoverEdge = null;
    if (S.state === 'back' && !S.drag && S.mouse) {
      hoverEdge = nearestEdge(S.mouse);
      if (hoverEdge) {
        if (hoverEdge !== S.edge) { S.edge = hoverEdge; S.handA = 0; rustle(0.2); }
        S.grip = 0.5;   // the glove holds the middle of the edge; it does not follow the cursor
      }
    }
    const showHand = (hoverEdge || S.drag) && S.state === 'back';
    S.handA = lerp(S.handA, showHand ? 1 : 0, 0.12);
    if (S.mouse) cvs.style.cursor = showHand ? 'none' : 'default';
    // tug: small lifts of the gripped edge, a couple of times a second
    const tug = hoverEdge ? Math.max(0, Math.sin(t * 7)) * Math.max(0, Math.sin(t * 2.2)) * 0.22 : 0;
    if (!S.drag && S.state === 'back') S.target = tug;
    if (hoverEdge && tug > 0.15 && Math.random() < 0.05) rustle(0.15);

    if (S.drag && S.phi > Math.PI * 0.8) { S.drag = false; S.target = Math.PI; S.state = 'turning'; }   // close enough: it finishes itself
    S.vel += (S.target - S.phi) * (S.drag ? 0.16 : 0.08); S.vel *= S.drag ? 0.72 : 0.8; S.phi += S.vel;
    const spin = Math.abs(S.vel);
    if (S.voice) S.voice.set(3000 + spin * 6000, Math.min(0.08, spin * 0.6), 0.6);
    const step = Math.floor(S.phi / (Math.PI / 6));
    if (S.drag && step > S.lastNote) tone(392 * Math.pow(1.06, step), 0.5, 0.05);    // rising, questioning
    S.lastNote = step;
    if (S.state === 'turning' && Math.abs(S.phi - Math.PI) < 0.02 && spin < 0.003) {
      S.state = 'front'; S.phi = Math.PI; S.vel = 0; S.frontT = t; tone(330, 1.4, 0.06); tone(262, 1.8, 0.05, 0.25);
      if (S.voice) S.voice.off();
    }
    // a beat to read the debt, then the crumple becomes available
    if (S.state === 'front' && t - S.frontT > 1.1) S.done = true;
  }

  function draw(t) {
    ctx.fillStyle = SEQ.PLAIN; ctx.fillRect(0, 0, W, H);
    drawShadow();
    const c = C();
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(LS, LS); ctx.translate(-c.x, -c.y);
    drawCard();
    if (S.handA > 0.02 && S.edge) drawGripAndArrow();
    ctx.restore();
    softRipple(S.ripples, t);
  }

  // the held sheet's shadow, as the pick-up leaves it (offset and blur of a sheet SEQ.LIFT_H above the ground)
  function drawShadow() {
    const c = C(), edge = S.edge || 'right', v = EDGES[edge].axis === 'v', cs = Math.abs(Math.cos(S.phi)), h = SEQ.LIFT_H;
    const sw = (v ? PW * cs : PW) + h * 0.08, sh = v ? PH : PH * cs;
    ctx.save(); ctx.filter = 'blur(15px)'; ctx.fillStyle = 'rgba(30,28,25,0.26)';
    ctx.fillRect(c.x - sw / 2 + h * 0.22 + 2, c.y - sh / 2 + h * 0.4 + 3, sw, sh);
    ctx.restore();
  }

  // rigid turn around the axis through the centre, parallel to the gripped edge; slight flex in the middle
  function sample(edge, u) {     // u: -0.5..0.5 across the sheet, positive = gripped side
    const E = EDGES[edge], L = E.axis === 'v' ? PW : PH, q = u * L, ph = S.phi;
    const flex = Math.sin(ph) * 10 * (1 - 4 * u * u);
    return { along: E.s * q * Math.cos(ph), h: q * Math.sin(ph) + flex };
  }
  function drawCard() {
    if (!FRONT) return;
    const c = C(), edge = S.edge || 'right', E = EDGES[edge], v = E.axis === 'v', Wd = v ? PH : PW;
    const n = 120, cs = Math.cos(S.phi), front = cs < 0;
    const strips = [];
    for (let i = 0; i < n; i++) {
      const u0 = i / n - 0.5, u1 = (i + 1) / n - 0.5;
      const a = sample(edge, u0 * E.s), b = sample(edge, u1 * E.s);
      strips.push({ i, a, b, h: (a.h + b.h) / 2 });
    }
    strips.sort((p, q) => p.h - q.h);
    for (const st of strips) {
      const sc0 = 1 + st.a.h * K, sc1 = 1 + st.b.h * K;
      const p0 = st.a.along * sc0, p1 = st.b.along * sc1;
      const lo = Math.min(p0, p1) - 0.4, len = Math.abs(p1 - p0) + 1.6, wid = Wd * (sc0 + sc1) / 2;
      // source slice: back face in place, front face mirrored so it reads correctly once turned
      const img = front ? FRONT : BACK;
      const slice = (front ? n - 1 - st.i : st.i) / n;
      ctx.save();
      if (v) { ctx.drawImage(img, slice * PW * 2, 0, PW * 2 / n + 0.5, PH * 2, c.x + lo, c.y - wid / 2, len, wid); }
      else { ctx.drawImage(img, 0, slice * PH * 2, PW * 2, PH * 2 / n + 0.5, c.x - wid / 2, c.y + lo, wid, len); }
      // shading by tilt (relative to flat)
      const dl = st.b.along - st.a.along, tilt = Math.atan2(Math.sign(dl || 1) * (st.b.h - st.a.h), Math.abs(dl) || 0.0001);
      const lit = (Math.cos(tilt + 0.45) - Math.cos(0.45)) * 0.6;
      ctx.fillStyle = lit < 0 ? `rgba(30,28,25,${-lit * 0.5})` : `rgba(255,255,255,${lit * 0.5})`;
      if (v) ctx.fillRect(c.x + lo, c.y - wid / 2, len, wid); else ctx.fillRect(c.x - wid / 2, c.y + lo, wid, len);
      ctx.restore();
    }
  }
  function edgePoint() {
    const c = C(), E = EDGES[S.edge], v = E.axis === 'v';
    const s = sample(S.edge, 0.5), sc = 1 + s.h * K;
    const along = s.along * sc;
    const cross = ((S.grip - 0.5) * (v ? PH : PW)) * sc;
    return v ? { x: c.x + along, y: c.y + cross } : { x: c.x + cross, y: c.y + along };
  }
  function drawGripAndArrow() {
    const E = EDGES[S.edge], p = edgePoint(), a = S.handA;
    const ang = Math.atan2(E.dir[1], E.dir[0]);      // local +x points across the sheet
    // low-poly white glove gripping the edge; pulls back a little with each tug
    ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(ang);
    ctx.translate(14 - Math.min(0.3, S.phi) * 40, 0);
    glove(1.12, 0.45);
    ctx.restore();
    // cue: a stemless two-line chevron that slides in the drag direction (hidden while dragging)
    const show = S.drag ? 0 : a;
    if (show > 0.02) {
      const c = C(), L = (E.axis === 'v' ? PW : PH) * 0.5;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ang);
      ctx.strokeStyle = '#3a3834'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 2; i++) {
        const f = (now() * 0.9 + i * 0.5) % 1, x = -L / 2 + f * L;
        ctx.globalAlpha = show * Math.sin(f * Math.PI) * 0.85;
        ctx.beginPath(); ctx.moveTo(x - 12, -16); ctx.lineTo(x + 4, 0); ctx.lineTo(x - 12, 16); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // simple low-poly white glove, fingers pointing along +x toward the sheet; origin = where the fingertips meet the edge
  const GL = ['#ffffff', '#f3f2ee', '#e6e5e0', '#d6d5d0', '#c4c3be'];
  function facet(a, b, c, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.closePath(); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 0.7; ctx.stroke(); }
  function quad(a, b, c, d, c1, c2) { facet(a, b, c, c1); facet(a, c, d, c2); }
  function glove(sc, curl) {
    ctx.save(); ctx.scale(sc, sc);
    ctx.save(); ctx.globalAlpha *= 0.12; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(-30, 30, 42, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    quad([-80, -24], [-62, -28], [-60, 26], [-80, 22], GL[3], GL[4]);                                  // cuff
    const palm = [[-62, -27], [-26, -32], [-6, -24], [-4, 20], [-22, 30], [-60, 25]], pc = [-36, -2];
    palm.forEach((pt, i) => facet(pt, palm[(i + 1) % palm.length], pc, GL[[0, 1, 2, 3, 2, 1][i]]));
    [-21, -8, 5, 17].forEach((ry, i) => {                                                               // fingers over the edge
      const w = 5.8, l1 = [17, 19, 18, 14][i] * (1 - curl * 0.3), l2 = [14, 15, 14, 11][i] * (1 - curl * 0.6);
      const k0 = [-6, ry], k1 = [k0[0] + l1, ry], k2 = [k1[0] + l2, ry];
      quad([k0[0], ry - w], [k1[0], ry - w], [k1[0], ry + w], [k0[0], ry + w], GL[1], GL[2]);
      quad([k1[0], ry - w * 0.9], [k2[0], ry - w * 0.8], [k2[0], ry + w * 0.8], [k1[0], ry + w * 0.9], GL[2], GL[3]);
    });
    const t0 = [-30, 26], t1 = [-8, 34], t2 = [6, 30];                                                  // thumb under
    quad([t0[0], t0[1] - 7], t1, [t1[0], t1[1] + 7], [t0[0] - 4, t0[1] + 7], GL[1], GL[3]);
    facet([t1[0], t1[1] - 6], t2, [t1[0], t1[1] + 7], GL[2]);
    ctx.restore();
  }

  return {
    reset, update, draw, down, move, up,
    enter(mouse) { S.mouse = local(mouse); },
    leave() { S.mouse = null; },
    get done() { return S.done; },
    get edge() { return S.edge || 'right'; },
    stop() { if (S.voice) S.voice.off(); },
    LS,
  };
})();

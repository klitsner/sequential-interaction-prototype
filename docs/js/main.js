// The sequence: one linear path through the four studies. Each scene takes input only while it is current, and the
// next one starts when the current one reports done. After the throw lands on $0.00 the experience holds there,
// and the ↺ button appears; it is the only way back to the start.
const SCENES = [Pickup, Flip, Crumple, Throw];
const resetBtn = document.getElementById('reset');
let idx = 0, mouse = null, ended = false;

function restart() {
  SCENES.forEach(s => { s.stop(); s.reset(); });
  idx = 0; ended = false; brighten = 0;
  SCENES[0].enter(mouse);
  resetBtn.hidden = true;
  cvs.style.cursor = 'default';
}
resetBtn.addEventListener('click', restart);
window.restartSequence = restart;     // the wind panel's "Reset state"

// one set of listeners, routed to the current scene
cvs.addEventListener('pointermove', e => { if (!isMouse(e)) return; mouse = pos(e); SCENES[idx].move(mouse); });
cvs.addEventListener('pointerleave', () => { mouse = null; SCENES[idx].leave(); });
cvs.addEventListener('pointerdown', e => { if (!isMouse(e)) return; mouse = pos(e); SCENES[idx].down(mouse, e); });
const release = () => SCENES[idx].up();
cvs.addEventListener('pointerup', release);
cvs.addEventListener('pointercancel', release);
cvs.addEventListener('lostpointercapture', release);
window.addEventListener('pointerup', release);

function frame() {
  const t = now(), sc = SCENES[idx];
  sc.update(t);
  sc.draw(t);
  if (sc.done) {
    if (idx < SCENES.length - 1) { sc.stop(); idx++; SCENES[idx].reset(); SCENES[idx].enter(mouse); }
    else if (!ended) { ended = true; resetBtn.hidden = false; }
  }
  requestAnimationFrame(frame);
}
restart();
requestAnimationFrame(frame);

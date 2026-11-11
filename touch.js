// 手机：虚拟摇杆 + A/B（按住 B 跑步）
(function () {
  const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (coarse) document.documentElement.classList.add('coarse');
  const joy = document.getElementById('joy'), knob = document.getElementById('knob'); let jid = null;
  function upd(e) {
    const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), m = 40; if (d > m) { dx = dx / d * m; dy = dy / d * m; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    TOUCH.setDir(d < 14 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }
  joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); AUDIO.init(); upd(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === jid) upd(e); });
  const end = e => { if (e.pointerId !== jid) return; jid = null; knob.style.transform = ''; TOUCH.setDir(null); };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  const bind = (id, k) => { const el = document.getElementById(id); el.addEventListener('pointerdown', e => { e.preventDefault(); TOUCH.press(k); }); el.addEventListener('pointerup', () => TOUCH.release(k)); el.addEventListener('pointercancel', () => TOUCH.release(k)); };
  bind('bA', 'A'); bind('bB', 'B'); bind('bM', 'map'); bind('bI', 'bag'); bind('bE', 'menu'); bind('bN', 'mute');
})();

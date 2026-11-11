// WebAudio 合成芯片音效与循环曲（可静音，按 N 或右上角按钮）
(function () {
  let ac = null, master = null, muted = localStorage.getItem('dlfs-muted') === '1';
  let bgmTimer = null, theme = null, step = 0, nextT = 0;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination); } catch (e) { ac = null; }
  }
  function tone(f, d, type = 'square', vol = 0.08, slide = 0, when = 0) {
    if (!ac || muted) return;
    const t = (when || ac.currentTime);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, vol = 0.05, hp = 1200) {
    if (!ac || muted) return;
    const len = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, len, ac.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp; s.buffer = b; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start();
  }
  const SFX = {
    step(kind) { if (kind === 'grass') noise(0.04, 0.025, 2500); else if (kind === 'track') tone(140, 0.03, 'triangle', 0.04); else noise(0.03, 0.03, 600); },
    type() { tone(880 + Math.random() * 60, 0.025, 'square', 0.025); },
    ok() { tone(660, 0.07, 'square', 0.06); tone(990, 0.09, 'square', 0.05, 0, ac ? ac.currentTime + 0.07 : 0); },
    cancel() { tone(440, 0.07, 'square', 0.05, -120); },
    bump() { tone(90, 0.08, 'square', 0.06); },
    door() { tone(330, 0.06, 'triangle', 0.08); tone(220, 0.1, 'triangle', 0.08, 0, ac ? ac.currentTime + 0.06 : 0); },
    stamp() { if (!ac) return; tone(70, 0.25, 'square', 0.12, -30); noise(0.12, 0.08, 300); },
    reveal() { if (!ac) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.05, 0, ac.currentTime + i * 0.07)); },
    item() { if (!ac) return; [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'square', 0.05, 0, ac.currentTime + i * 0.09)); },
    chapter() { if (!ac) return; [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.06, 0, ac.currentTime + i * 0.12)); }
  };
  // 三首循环曲：北区生活区轻快 / 南入口庄重 / 室内安静
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const THEMES = {
    north: { bpm: 132, lead: [72, 0, 76, 79, 76, 0, 74, 72, 74, 0, 77, 81, 79, 0, 76, 74], bass: [48, 48, 55, 55, 53, 53, 55, 55] },
    south: { bpm: 96, lead: [67, 0, 72, 0, 71, 72, 74, 0, 72, 0, 67, 0, 69, 71, 72, 0], bass: [48, 43, 45, 41, 48, 43, 41, 43] },
    inside: { bpm: 88, lead: [76, 0, 0, 79, 0, 0, 77, 76, 74, 0, 0, 72, 0, 0, 74, 0], bass: [45, 45, 41, 41, 43, 43, 48, 48] }
  };
  function sched() {
    if (!ac || !theme) return;
    const th = THEMES[theme], dur = 60 / th.bpm / 2;
    while (nextT < ac.currentTime + 0.25) {
      const l = th.lead[step % 16]; if (l && !muted) tone(N(l), dur * 0.9, 'square', 0.022, 0, nextT);
      if (step % 2 === 0 && !muted) tone(N(th.bass[(step / 2) % 8]), dur * 1.8, 'triangle', 0.05, 0, nextT);
      step++; nextT += dur;
    }
  }
  function setTheme(t) { if (t === theme) return; theme = t; step = 0; if (ac) nextT = ac.currentTime + 0.05; if (!bgmTimer) bgmTimer = setInterval(sched, 90); }
  function toggle() { muted = !muted; localStorage.setItem('dlfs-muted', muted ? '1' : '0'); if (master) master.gain.value = muted ? 0 : 0.5; return muted; }
  window.AUDIO = { init, SFX, setTheme, toggle, get muted() { return muted; } };
})();

(() => {
  'use strict';
  // Keep the destination fixed. Query parameters can never supply a redirect URL.
  const TARGET_URL = 'https://www.tsinghua.edu.cn/';
  const DURATION = 6;
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector) => document.querySelector(selector);
  const mascotReplayButton = $('#replay-mascot');
  const transitionScreen = $('.transition-screen');
  const status = $('#status-text');
  const progress = $('#progress');
  const mascot = $('#mascot');
  let timeline;
  let idle;
  let motionContext;
  let paused = false;
  let complete = false;
  let leaving = false;
  let elapsed = 0;
  let lastTime = null;
  let frame;

  function renderStatus() {
    const text = paused ? '已暂停' : complete ? (preview ? '预览结束' : '正在跳转')
      : preview ? '预览中' : `${Math.max(0, Math.ceil(DURATION - elapsed))} 秒后前往清华大学官网`;
    if (status.textContent !== text) status.textContent = text;
  }

  function updateProgress(value) {
    const percent = String(Math.round(Math.max(0, Math.min(1, value)) * 100));
    if (progress.getAttribute('aria-valuenow') !== percent) progress.setAttribute('aria-valuenow', percent);
    renderStatus();
  }

  function navigate() {
    if (leaving) return;
    leaving = true;
    cancelAnimationFrame(frame);
    timeline?.kill();
    idle?.kill();
    window.location.replace(TARGET_URL);
  }

  function finish() {
    if (complete || leaving) return;
    complete = true;
    updateProgress(1);
    idle?.pause();
    if (preview) {
      // Register restoration with the same context so an immediate replay cancels it.
      motionContext?.add(() => {
        gsap.to('.transition-screen', { autoAlpha: 0, duration: 0.35 });
        gsap.to('.mascot-flight', { xPercent: 0, yPercent: 0, scaleX: 1, scaleY: 1, rotation: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.4)' });
        gsap.to('.mascot-idle', { scaleX: 1, scaleY: 1, rotation: 0, duration: 0.3 });
        gsap.to('.character-shadow', { scale: 1, opacity: 1, duration: 0.4 });
        gsap.to('.portal', { scale: 1, duration: 0.4 });
        gsap.set('.portal-spin', { rotation: 0, svgOrigin: '260 260' });
        gsap.to('.portal-inner', { backgroundColor: 'transparent', duration: 0.4 });
      });
    } else navigate();
  }

  function tick(now) {
    if (leaving || complete) return;
    if (lastTime !== null && !paused && !document.hidden) elapsed += (now - lastTime) / 1000;
    lastTime = now;
    if (!paused && !document.hidden) {
      updateProgress(elapsed / DURATION);
      if (elapsed >= DURATION) { finish(); return; }
    }
    frame = requestAnimationFrame(tick);
  }

  function fitTransition() {
    if (!window.gsap || reducedMotion) return;
    const bounds = $('.portal').getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    transitionScreen.style.setProperty('--wipe-x', `${x}px`);
    transitionScreen.style.setProperty('--wipe-y', `${y}px`);
    transitionScreen.style.setProperty('--wipe-size', `${Math.ceil(radius * 2) + 8}px`);
  }

  function buildMotion() {
    if (!window.gsap || reducedMotion) return;
    motionContext?.revert();
    fitTransition();
    motionContext = gsap.context(() => {
      gsap.set('.transition-screen', { autoAlpha: 0 });
      gsap.set('.transition-orb', { xPercent: -50, yPercent: -50, scale: 0 });
      gsap.set('.transition-copy', { opacity: 0, y: 16 });
      gsap.set('.portal-spin', { rotation: 0, svgOrigin: '260 260' });
      // V9: 1.44s per turn, a subtle 7% speed-up from V8's 1.54s.
      // Both SVG layers use .portal-spin, with the same origin and phase.
      // Mascot and complete seal share pause, replay and background-tab timing.
      idle = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: 'sine.inOut' } })
        .to('.mascot-idle', { scaleX: 1.018, scaleY: 0.981, rotation: -1.5, duration: 0.27 }, 0)
        .to('.mascot-idle', { scaleX: 0.992, scaleY: 1.012, rotation: 1, duration: 0.25 }, 0.27)
        .to('.mascot-idle', { scaleX: 1, scaleY: 1, rotation: 0, duration: 0.25 }, 0.52);
      timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      // Percent translations scale with the illustration, including short landscape screens.
      timeline.addLabel('arrive', 0)
        .from('.portal', { scale: 0.7, opacity: 0, rotation: 4, duration: 1 }, 'arrive')
        .fromTo('.portal-spin', { rotation: -360 }, { rotation: 0, duration: 1.08, ease: 'bounce.out', immediateRender: false }, 0.25)
        .from('.mascot-flight', { yPercent: -11, rotation: -9, scale: 0.88, opacity: 0, duration: 1.08, ease: 'bounce.out' }, 0.25)
        .from('.character-shadow', { scale: 0.3, opacity: 0, duration: 1.08 }, 0.25)
        .call(() => idle.play(), [], 1.4)
        .to('.portal-spin', { rotation: 360 * 2.75 / 1.44, duration: 2.75, ease: 'none' }, 1.4)
        .addLabel('leap', 4.15)
        .call(() => idle.pause(), [], 'leap')
        .to('.portal-spin', { rotation: '+=90', duration: 0.3, ease: 'sine.out' }, 'leap')
        .to('.portal-spin', { rotation: '+=360', duration: 0.37, ease: 'power1.in' }, 'leap+=0.3')
        .to('.portal-spin', { rotation: '+=360', duration: 0.46, ease: 'none' }, 'leap+=0.67')
        .to('.mascot-flight', { yPercent: 3, scaleX: 1.08, scaleY: 0.88, rotation: -4, duration: 0.3, ease: 'power2.in' }, 'leap')
        .to('.character-shadow', { scaleX: 1.1, scaleY: 0.65, duration: 0.3 }, 'leap')
        .to('.mascot-flight', { yPercent: -11, xPercent: 6, scaleX: 0.88, scaleY: 1.02, rotation: 8, duration: 0.37, ease: 'power2.out' }, 'leap+=0.3')
        .to('.character-shadow', { scale: 0.35, opacity: 0.15, duration: 0.37 }, 'leap+=0.3')
        .to('.mascot-flight', { xPercent: 13, yPercent: -5, scale: 0.14, rotation: 26, autoAlpha: 0, duration: 0.46, ease: 'power2.in' }, 'leap+=0.67')
        .to('.portal', { scale: 1.08, duration: 0.45, ease: 'power2.inOut' }, 4.95)
        .to('.portal-inner', { backgroundColor: '#6544d4', duration: 0.55 }, 5.15)
        .set('.transition-screen', { autoAlpha: 1 }, 5.1)
        .to('.transition-orb', { scale: 1, duration: 0.6, ease: 'power3.inOut' }, 5.1)
        .to('.transition-copy', { opacity: 1, y: 0, duration: 0.3 }, 5.48);
    });
  }

  function start() {
    if (leaving) return;
    cancelAnimationFrame(frame);
    timeline?.kill();
    idle?.kill();
    paused = false; complete = false; elapsed = 0; lastTime = null;
    mascotReplayButton.disabled = false;
    document.body.classList.remove('is-paused');
    updateProgress(0);
    buildMotion();
    if (document.hidden) { timeline?.pause(); idle?.pause(); }
    frame = requestAnimationFrame(tick);
  }

  function togglePause() {
    if (complete || leaving) return;
    paused = !paused;
    document.body.classList.toggle('is-paused', paused);
    renderStatus();
    if (paused) { timeline?.pause(); idle?.pause(); }
    else {
      if (!document.hidden) { timeline?.resume(); if (elapsed > 1.4 && elapsed < 4.15) idle?.resume(); }
      lastTime = null;
    }
  }

  mascotReplayButton.addEventListener('click', start);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !event.repeat) togglePause();
  });
  window.addEventListener('resize', fitTransition);
  document.addEventListener('visibilitychange', () => {
    lastTime = null;
    if (document.hidden) { timeline?.pause(); idle?.pause(); }
    else if (!paused && !complete) { timeline?.resume(); if (elapsed > 1.4 && elapsed < 4.15) idle?.resume(); }
  });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); timeline?.pause(); idle?.pause(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { leaving = false; start(); togglePause(); } });

  // Decode first, but never let an image failure block the countdown.
  Promise.race([mascot.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 1800))]).then(start);
})();

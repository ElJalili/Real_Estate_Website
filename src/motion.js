import { useEffect } from 'react';

// Scene, floating cards and pointer tilts share one frame scheduler.
const jobs = new Set();
let frame = 0, previousTime = 0;
function schedule(job) {
  jobs.add(job);
  if (!frame) frame = requestAnimationFrame(tick);
}
function tick(time) {
  frame = 0;
  const dt = Math.min(64, previousTime ? time - previousTime : 16.67);
  previousTime = time;
  for (const job of jobs) if (!job(time, dt)) jobs.delete(job);
  if (jobs.size) frame = requestAnimationFrame(tick);
  else previousTime = 0;
}
function cancel(job) {
  jobs.delete(job);
  if (!jobs.size) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
}
const ease = (current, target, dt, weight = 170) => {
  const next = current + (target - current) * (1 - Math.exp(-dt / weight));
  return Math.abs(target - next) < .001 ? target : next;
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const pointerEnabled = () => !matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(hover: hover) and (pointer: fine)').matches;

export function useSceneMotion(heroRef) {
  useEffect(() => {
    const hero = heroRef.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const images = [...document.querySelectorAll('.intro-visual, .digital-visual, .journal-image, .expert-photo')];
    const visibleImages = new Set(), geometry = new Map(), drift = new Map(), centres = new Map();
    const layers = [['.hero-title','title'],['.hero-intro','support'],['.hero-coordinate','coordinate'],['.nav','nav'],['.stat-one','card-one'],['.stat-two','card-two']];
    let heroVisible = true, dirty = true;
    let viewportWidth = innerWidth, viewportHeight = innerHeight, heroTop = 0, heroHeight = 1;
    let x = 0, y = 0, targetX = 0, targetY = 0, progress = 0;
    const lastWritten = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        else if (entry.isIntersecting) visibleImages.add(entry.target);
        else visibleImages.delete(entry.target);
      });
      dirty = true;
      schedule(render);
    }, { rootMargin: '60px' });
    observer.observe(hero);
    images.forEach(el => observer.observe(el));
    const resizeObserver = new ResizeObserver(() => { dirty = true; schedule(render); });
    resizeObserver.observe(hero);
    images.forEach(el => resizeObserver.observe(el));

    function measure() {
      // Batch geometry reads after resize/intersection changes. Pointer and
      // scroll frames reuse document coordinates without forcing layout.
      viewportWidth = innerWidth; viewportHeight = innerHeight;
      const scrollY = window.scrollY, rect = hero.getBoundingClientRect();
      heroTop = rect.top + scrollY; heroHeight = rect.height;
      const cutout = hero.querySelector('.hero-foreground');
      if (viewportWidth <= 600) {
        // Match the existing portrait photo crop exactly (54% centre).
        const sourceWidth = (rect.width + 24) / (heroHeight + 24) * 1024;
        cutout.setAttribute('viewBox', `${(1536 - sourceWidth) * .54} 0 ${sourceWidth} 1024`);
      } else cutout.setAttribute('viewBox', '0 0 1536 1024');
      layers.forEach(([selector,name]) => {
        const el = hero.querySelector(selector);
        centres.set(name, {x:el.offsetLeft + el.offsetWidth / 2 - rect.width / 2, y:el.offsetTop + el.offsetHeight / 2 - heroHeight / 2});
      });
      images.forEach(el => {
        const r = el.getBoundingClientRect();
        geometry.set(el, { top: r.top + scrollY, height: r.height });
      });
      dirty = false;
    }
    function render(time, dt) {
      // Also check inside the loop: browser media emulation can update matches
      // before delivering a change event. Clear active motion immediately.
      if (reduced.matches || document.hidden) { reset(); return false; }
      if (dirty) measure();
      const isDesktop = fine.matches && viewportWidth > 600;
      const strength = isDesktop ? (viewportWidth <= 1100 ? .55 : 1) : 0;
      const scrollY = window.scrollY, targetProgress = clamp((scrollY - heroTop) / heroHeight, 0, 1);
      x = ease(x, targetX * strength, dt, 210);
      y = ease(y, targetY * strength, dt, 210);
      progress = ease(progress, targetProgress, dt, 190);
      let settling = x !== targetX * strength || y !== targetY * strength || progress !== targetProgress;
      const flatten = clamp((progress - .08) / .8, 0, 1);
      const depth = 1 - flatten * flatten * (3 - 2 * flatten);
      const mx = x * depth, my = y * depth;
      const architectureZ = isDesktop ? -28 * depth : 0;
      // A fixed rear plane: scrolling never brings the title through the house.
      const titleZ = isDesktop ? -56 : 0;
      const cardOneZ = isDesktop ? 64 * depth : 0, cardTwoZ = isDesktop ? 94 * depth : 0;
      const supportZ = isDesktop ? 16 * depth : 0, navZ = isDesktop ? 10 * depth : 0;
      const values = {
        '--mx': `${mx.toFixed(3)}px`, '--my': `${my.toFixed(3)}px`,
        '--scroll': `${(progress * heroHeight * .045).toFixed(3)}px`, '--depth': depth.toFixed(5),
        '--scene-rx': `${(-my * .025).toFixed(4)}deg`, '--scene-ry': `${(mx * .035).toFixed(4)}deg`,
        '--architecture-z': `${architectureZ.toFixed(3)}px`,
        // Inverse perspective scale retains the neutral crop and type/card sizes.
        '--architecture-scale': ((isDesktop ? 1.035 : 1) * (1 - architectureZ / 1800) + progress * (isDesktop ? .012 : .006)).toFixed(6),
        '--architecture-scroll': `${(progress * (isDesktop ? 42 : 9)).toFixed(3)}px`,
        '--sky-x': `${(mx * .26).toFixed(3)}px`, '--sky-y': `${(my * .26 - progress * (isDesktop ? 23 : 0)).toFixed(3)}px`,
        '--title-z': `${titleZ.toFixed(3)}px`,
        '--title-scale': (1 - titleZ / 1800).toFixed(6),
        '--card-one-z': `${cardOneZ.toFixed(3)}px`, '--card-one-scale': (1 - cardOneZ / 1800).toFixed(6),
        '--card-two-z': `${cardTwoZ.toFixed(3)}px`, '--card-two-scale': (1 - cardTwoZ / 1800).toFixed(6),
        '--card-one-scroll': `${(-progress * (isDesktop ? 32 : 5)).toFixed(3)}px`, '--card-two-scroll': `${(-progress * (isDesktop ? 46 : 7)).toFixed(3)}px`,
        '--support-z': `${supportZ.toFixed(3)}px`, '--support-scale': (1 - supportZ / 1800).toFixed(6),
        '--nav-z': `${navZ.toFixed(3)}px`, '--nav-scale': (1 - navZ / 1800).toFixed(6),
        '--float-one': `${(isDesktop && heroVisible ? Math.sin(time / 2800) * 1.1 * depth : 0).toFixed(3)}px`,
        '--float-two': `${(isDesktop && heroVisible ? Math.sin(time / 3200 + .8) * 1.35 * depth : 0).toFixed(3)}px`,
      };
      // Compensate position as well as size: perspective otherwise pushes cards
      // near the edges outward even when the cursor is completely neutral.
      const depths = {title:titleZ,support:supportZ,coordinate:supportZ,nav:navZ,'card-one':cardOneZ,'card-two':cardTwoZ};
      Object.entries(depths).forEach(([name,z]) => {
        const centre = centres.get(name);
        values[`--${name}-origin-x`] = `${(-centre.x * z / 1800).toFixed(4)}px`;
        values[`--${name}-origin-y`] = `${(-centre.y * z / 1800).toFixed(4)}px`;
      });
      if (heroVisible || settling) {
        Object.entries(values).forEach(([name, value]) => {
          if (lastWritten.get(name) !== value) {
            hero.style.setProperty(name, value);
            lastWritten.set(name, value);
          }
        });
      }
      visibleImages.forEach(el => {
        const rect = geometry.get(el), amount = isDesktop ? 26 : 10;
        const target = clamp((viewportHeight / 2 - (rect.top - scrollY) - rect.height / 2) / viewportHeight * amount, -16, 16);
        const next = ease(drift.get(el) || 0, target, dt, 230);
        if (next !== drift.get(el)) {
          el.style.setProperty('--image-drift', `${next.toFixed(3)}px`);
          el.style.setProperty('--image-depth-scale', (1 + Math.abs(next) * 2.1 / rect.height).toFixed(6));
        }
        drift.set(el, next);
        settling ||= next !== target;
      });
      return settling || (isDesktop && heroVisible);
    }
    function move(event) {
      if (!fine.matches || event.pointerType === 'touch' || reduced.matches) return;
      targetX = clamp(event.clientX / viewportWidth - .5, -.5, .5) * 22;
      targetY = clamp(event.clientY / viewportHeight - .5, -.5, .5) * 14;
      schedule(render);
    }
    function leave() { targetX = targetY = 0; schedule(render); }
    function onScroll() { schedule(render); }
    function reset() {
      cancel(render);
      targetX = targetY = x = y = progress = 0;
      lastWritten.forEach((_value, name) => hero.style.removeProperty(name));
      images.forEach(el => {
        el.style.removeProperty('--image-drift');
        el.style.removeProperty('--image-depth-scale');
      });
      drift.clear(); lastWritten.clear(); dirty = true;
      measure();
      clearTilts();
      if (!reduced.matches && !document.hidden) schedule(render);
    }
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', reset, { passive: true });
    reduced.addEventListener('change', reset);
    fine.addEventListener('change', reset);
    document.addEventListener('visibilitychange', reset);
    measure();
    schedule(render);
    return () => {
      cancel(render); observer.disconnect(); resizeObserver.disconnect(); clearTilts();
      hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', reset);
      reduced.removeEventListener('change', reset); fine.removeEventListener('change', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [heroRef]);
}

const tilts = new Map();
function animateTilts(_time, dt) {
  if (!pointerEnabled() || document.hidden) { clearTilts(); return false; }
  let active = false;
  for (const [el, state] of tilts) {
    if (!el.isConnected) { tilts.delete(el); continue; }
    state.x = ease(state.x, state.targetX, dt, 160); state.y = ease(state.y, state.targetY, dt, 160);
    state.z = ease(state.z, state.targetZ, dt, 190);
    el.style.setProperty('--rx', `${state.x.toFixed(4)}deg`); el.style.setProperty('--ry', `${state.y.toFixed(4)}deg`);
    el.style.setProperty('--hover-z', `${state.z.toFixed(3)}px`);
    el.style.setProperty('--card-image-x', `${(-state.y * 2).toFixed(3)}px`); el.style.setProperty('--card-image-y', `${(state.x * 2).toFixed(3)}px`);
    if (state.x !== state.targetX || state.y !== state.targetY || state.z !== state.targetZ) active = true;
    else if (!state.targetZ) { clearTilt(el); tilts.delete(el); }
  }
  return active;
}
function clearTilt(el) {
  ['--rx', '--ry', '--hover-z', '--card-image-x', '--card-image-y'].forEach(name => el.style.removeProperty(name));
}
function clearTilts() {
  tilts.forEach((_state, el) => clearTilt(el)); tilts.clear(); cancel(animateTilts);
}
export function tiltPointer(event) {
  if (event.pointerType === 'touch' || !pointerEnabled()) return;
  const el = event.currentTarget;
  let state = tilts.get(el);
  if (!state) { state = { bounds: el.getBoundingClientRect(), x: 0, y: 0, z: 0 }; tilts.set(el, state); }
  const r = state.bounds, strength = innerWidth <= 1100 ? .55 : 1;
  state.targetX = -clamp((event.clientY - r.top) / r.height - .5, -.5, .5) * 3 * strength;
  state.targetY = clamp((event.clientX - r.left) / r.width - .5, -.5, .5) * 3 * strength;
  state.targetZ = 12 * strength;
  schedule(animateTilts);
}
export function resetTilt(event) {
  const state = tilts.get(event.currentTarget);
  if (state) { state.targetX = state.targetY = state.targetZ = 0; schedule(animateTilts); }
}

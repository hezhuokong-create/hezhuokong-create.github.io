/* ==========================================================================
   common.js —— 主题、显现、数字滚动、Toast、导航
   ========================================================================== */
(function () {
  'use strict';

  const root = document.documentElement;

  /* ---------- 主题 ---------- */
  const KEY = 'fpgg-theme';
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#17140F' : '#FAFAF7');
  }
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('#themeBtn');
    if (!btn) return;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(KEY, next); } catch (e2) {}
    const toast = window.__toast;
    if (toast) toast(next === 'dark' ? '已切换到暗色模式' : '已切换到亮色模式');
  });

  /* ---------- 导航滚动态 ---------- */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 移动端菜单 ---------- */
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      const open = mobileMenu.hasAttribute('hidden');
      if (open) mobileMenu.removeAttribute('hidden');
      else mobileMenu.setAttribute('hidden', '');
    });
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') mobileMenu.setAttribute('hidden', '');
    });
  }

  /* ---------- 滚动显现 ---------- */
  const rvs = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    rvs.forEach((el) => el.classList.add('on'));
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('on');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rvs.forEach((el) => io.observe(el));
  }

  /* ---------- 数字滚动 ---------- */
  function countTo(el) {
    const to = parseFloat(el.getAttribute('data-cnt')) || 0;
    if (reduce) { el.textContent = String(to); return; }
    const dur = 900;
    let t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const nums = Array.prototype.slice.call(document.querySelectorAll('[data-cnt]'));
  if (!reduce && 'IntersectionObserver' in window) {
    const nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          countTo(en.target);
          nio.unobserve(en.target);
        }
      });
    }, { threshold: 0.6 });
    nums.forEach((el) => nio.observe(el));
  } else {
    nums.forEach((el) => { el.textContent = el.getAttribute('data-cnt'); });
  }

  /* ---------- 进度条进入视口后填充 ---------- */
  const bars = Array.prototype.slice.call(document.querySelectorAll('.bar:not(.bar-static)'));
  if (bars.length && 'IntersectionObserver' in window && !reduce) {
    const bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('on'); bio.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    bars.forEach((b) => bio.observe(b));
  } else {
    bars.forEach((b) => b.classList.add('on'));
  }

  /* ---------- Toast ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  window.__toast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2400);
  };

  /* ---------- 平滑锚点（补偿固定导航） ---------- */
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    const top = t.getBoundingClientRect().top + window.scrollY - 78;
    window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
  });
})();

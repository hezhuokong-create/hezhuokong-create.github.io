/* paperdemo 交互：导航态 / 手稿卡改写 / 演示面板 / 滚动显现 / ticker 无缝循环 */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 导航滚动态 ---------- */
  var nav = document.getElementById('nav');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 移动端菜单 ---------- */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        toggle.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
      }
    });
  }

  /* ---------- 手稿卡：改写演示 ---------- */
  var sheet = document.getElementById('msheet');
  var rewriteBtn = document.getElementById('rewriteBtn');
  var clock = document.getElementById('msClock');
  var gauge = document.getElementById('mGauge');
  var barBefore = document.getElementById('barBefore');
  var barAfter = document.getElementById('barAfter');

  if (sheet && rewriteBtn) {
    var busy = false;
    rewriteBtn.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      var on = sheet.classList.toggle('on');

      if (on) {
        gauge.hidden = false;
        clock.textContent = '改写中…';
        rewriteBtn.textContent = '还原原文';
        rewriteBtn.classList.add('done');
        // 仪表从 0 动画到目标值
        var delay = reduceMotion ? 0 : 350;
        setTimeout(function () {
          barBefore.style.width = '87%';
          barAfter.style.width = '12%';
          clock.textContent = '已完成';
        }, delay);
        if (reduceMotion) {
          barBefore.style.width = '87%';
          barAfter.style.width = '12%';
          clock.textContent = '已完成';
        }
      } else {
        clock.textContent = '就绪';
        rewriteBtn.textContent = '改写这一段';
        rewriteBtn.classList.remove('done');
        gauge.hidden = true;
        barBefore.style.width = '0%';
        barAfter.style.width = '0%';
      }
      setTimeout(function () { busy = false; }, 450);
    });
  }

  /* ---------- 演示面板：执行改写 ---------- */
  var demoPanel = document.querySelector('.demo-panel');
  var demoBtn = document.getElementById('demoBtn');
  if (demoPanel && demoBtn) {
    demoBtn.addEventListener('click', function () {
      var done = demoPanel.classList.toggle('done');
      demoBtn.textContent = done ? '还原改写前' : '执行改写';
    });
  }

  /* ---------- 滚动显现 ---------- */
  var targets = document.querySelectorAll(
    '.sec-head, .cap, .flow-step, .scene, .faq-item, .demo-col, .msheet'
  );
  if ('IntersectionObserver' in window && !reduceMotion) {
    targets.forEach(function (el) { el.classList.add('rv'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- ticker 无缝循环：复制一倍内容 ---------- */
  var track = document.getElementById('tickerTrack');
  if (track && track.children.length) {
    track.innerHTML += track.innerHTML;
  }
})();

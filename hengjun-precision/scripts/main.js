/* ============================================================
   交互脚本
   原则：只动 transform / opacity；无 `prefers-reduced-motion` 时才有动效；
        所有交互元素键盘可达。
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 页头滚动状态 ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 2. 移动端抽屉 ---------- */
  var drawer = document.querySelector('.drawer');
  var openBtn = document.querySelector('[data-menu-open]');
  var closeBtn = document.querySelector('[data-menu-close]');

  function setDrawer(open) {
    if (!drawer) return;
    drawer.setAttribute('data-open', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && closeBtn) closeBtn.focus();
    if (!open && openBtn) openBtn.focus();
  }

  if (openBtn) openBtn.addEventListener('click', function () { setDrawer(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setDrawer(false); });
  if (drawer) {
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.getAttribute('data-open') === 'true') setDrawer(false);
    });
  }

  /* ---------- 3. 滚动揭示（错峰由 --d 控制） ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reveals.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in'); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
      reveals.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  /* ---------- 4. 数字滚动（数据带） ---------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (counters.length) {
    var runCounter = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var duration = 1100;
      if (reduceMotion) {
        el.textContent = target.toFixed(decimals);
        return;
      }
      var start = performance.now();
      var tick = function (now) {
        var p = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCounter);
    } else {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* ---------- 5. 表单：前端校验 + 演示态提交 ---------- */
  var form = document.querySelector('[data-demo-form]');
  if (form) {
    var statusBox = form.querySelector('.form-status');

    var setStatus = function (state, msg) {
      if (!statusBox) return;
      statusBox.setAttribute('data-state', state);
      statusBox.textContent = msg;
    };

    var showError = function (field, msg) {
      var box = field.closest('.field').querySelector('.field__error');
      if (box) box.textContent = msg;
      field.setAttribute('aria-invalid', 'true');
    };

    var clearError = function (field) {
      var box = field.closest('.field').querySelector('.field__error');
      if (box) box.textContent = '';
      field.removeAttribute('aria-invalid');
    };

    form.addEventListener('input', function (e) {
      if (e.target.matches('input, textarea, select')) clearError(e.target);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var firstBad = null;

      Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (field) {
        var val = (field.value || '').trim();
        if (!val) {
          showError(field, '请填写这一项');
          ok = false;
          if (!firstBad) firstBad = field;
          return;
        }
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          showError(field, '邮箱格式不对');
          ok = false;
          if (!firstBad) firstBad = field;
        }
      });

      if (!ok) {
        setStatus('error', '有几项没填对，已用红框标出。');
        if (firstBad) firstBad.focus();
        return;
      }

      /* 演示态：不发起真实请求。接后端时把这里换成 fetch(endpoint, {...}) */
      var btn = form.querySelector('button[type="submit"]');
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = '提交中…';
      setStatus('error', '');

      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = label;
        setStatus(
          'success',
          '已收到（演示模板：此处不会真实发送）。真实项目里这一步会写入 CRM 并给你发确认邮件。'
        );
        form.reset();
      }, 650);
    });
  }

  /* ---------- 6. 首屏系统条：实时时钟 ---------- */
  var clock = document.querySelector('[data-clock]');
  if (clock) {
    var pad2 = function (n) { return n < 10 ? '0' + n : String(n); };
    var tickClock = function () {
      var d = new Date();
      clock.textContent =
        d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate()) +
        ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---------- 7. 结构分解：零件表 ↔ 图纸联动 ---------- */
  var partArt = document.querySelector('[data-part-art]');
  var partBtns = Array.prototype.slice.call(document.querySelectorAll('.parts [data-part]'));
  if (partArt && partBtns.length) {
    var setPart = function (name) {
      partArt.setAttribute('data-active', name);
      partBtns.forEach(function (b) {
        if (b.getAttribute('data-part') === name) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    };
    partBtns.forEach(function (btn) {
      var name = btn.getAttribute('data-part');
      btn.addEventListener('mouseenter', function () { setPart(name); });
      btn.addEventListener('focus', function () { setPart(name); });
      btn.addEventListener('click', function () { setPart(name); });
    });
    var partsList = document.querySelector('.parts');
    if (partsList) {
      partsList.addEventListener('mouseleave', function () {
        setPart(partBtns[0].getAttribute('data-part'));
      });
    }
  }

  /* ---------- 8. 检测面板：进入视口后跑背隙曲线 ---------- */
  var inspPanel = document.querySelector('.insp__panel');
  if (inspPanel) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      inspPanel.classList.add('in');
    } else {
      var inspObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            inspPanel.classList.add('in');
            inspObserver.unobserve(inspPanel);
          }
        });
      }, { threshold: 0.25 });
      inspObserver.observe(inspPanel);
    }
  }

  /* ---------- 9. 页脚年份 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();

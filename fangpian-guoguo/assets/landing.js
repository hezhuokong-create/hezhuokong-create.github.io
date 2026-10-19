/* ==========================================================================
   landing.js —— 视差 / 批注联动 / 分数演示 / 模板库 / 定价 / FAQ
   ========================================================================== */
(function () {
  'use strict';

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =====================================================================
     1. 光标视差（照片反向 + 浮动层差速）
     ===================================================================== */
  const stage = document.getElementById('heroVisual');
  const photo = document.getElementById('heroPhoto');
  if (stage && photo && !reduce) {
    const layers = Array.prototype.slice.call(stage.querySelectorAll('.fl'));
    let raf = null;
    let tx = 0, ty = 0;

    function apply() {
      raf = null;
      photo.style.translate = (-tx * 14) + 'px ' + (-ty * 10) + 'px';
      layers.forEach(function (el) {
        const d = parseFloat(el.getAttribute('data-d')) || 0;
        el.style.translate = (tx * d) + 'px ' + (ty * d) + 'px';
      });
    }
    stage.addEventListener('mousemove', function (e) {
      const b = stage.getBoundingClientRect();
      tx = (e.clientX - b.left) / b.width - 0.5;
      ty = (e.clientY - b.top) / b.height - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    stage.addEventListener('mouseleave', function () {
      tx = 0; ty = 0;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      apply();
    });
  }

  /* =====================================================================
     2. 批注演示
     ===================================================================== */
  const paper = document.getElementById('paper');
  const annoSwitch = document.getElementById('annoSwitch');
  if (paper && annoSwitch) {
    paper.classList.add('anno-on');
    annoSwitch.addEventListener('click', function () {
      const on = annoSwitch.getAttribute('aria-checked') === 'true';
      annoSwitch.setAttribute('aria-checked', on ? 'false' : 'true');
      paper.classList.toggle('anno-on', !on);
    });
  }

  const notes = Array.prototype.slice.call(document.querySelectorAll('.note[data-for]'));
  notes.forEach(function (note) {
    const line = paper ? paper.querySelector('.paper-anno[data-n="' + note.getAttribute('data-for') + '"]') : null;
    function hot(on) {
      note.classList.toggle('hot', on);
      if (line) line.classList.toggle('hot', on);
    }
    note.addEventListener('mouseenter', function () { hot(true); });
    note.addEventListener('mouseleave', function () { hot(false); });
    note.addEventListener('focus', function () { hot(true); });
    note.addEventListener('blur', function () { hot(false); });
  });

  /* =====================================================================
     3. 分数演示：82 → 93
     ===================================================================== */
  const fixBtn = document.getElementById('fixBtn');
  const scoreNum = document.getElementById('scoreNum');
  const scorePill = document.getElementById('scorePill');
  const scoreVerdict = document.getElementById('scoreVerdict');
  const kwMiss = document.getElementById('kwMiss');
  const kwHits = document.getElementById('kwHits');
  const dims = Array.prototype.slice.call(document.querySelectorAll('.score-dims .dim'));
  let fixed = false;

  function tweenNumber(el, from, to, dur) {
    const t0 = performance.now();
    function step(ts) {
      const p = Math.min(1, (ts - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setDim(i, pct) {
    const d = dims[i];
    if (!d) return;
    const bar = d.querySelector('.bar');
    const b = d.querySelector('b');
    bar.style.setProperty('--v', pct / 100);
    b.textContent = pct + '%';
  }

  if (fixBtn && scoreNum) {
    fixBtn.addEventListener('click', function () {
      if (fixed) {
        window.__toast('方案已经生成，去工作台勾选后才写入');
        return;
      }
      fixed = true;
      fixBtn.disabled = true;
      fixBtn.textContent = '正在生成方案…';

      setTimeout(function () {
        if (scorePill) {
          scorePill.textContent = '优先投递';
          scorePill.classList.remove('pill-line');
          scorePill.classList.add('pill-accent');
        }
        if (kwMiss && kwHits) {
          Array.prototype.slice.call(kwMiss.querySelectorAll('.kw-chip')).forEach(function (chip) {
            chip.classList.remove('miss');
            chip.classList.add('fixed');
            chip.textContent = '✓ ' + chip.textContent;
            kwHits.appendChild(chip);
          });
        }
        setDim(0, 95);
        setDim(2, 82);
        tweenNumber(scoreNum, 82, 93, 900);
        if (scoreVerdict) {
          scoreVerdict.innerHTML = '已进入 <b>优先投递</b> 区间 —— 技能关键词与行业匹配各补一档。方案在候选区，<b>勾选后才写入</b>。';
        }
        const formula = document.querySelector('.score-formula');
        if (formula) formula.textContent = '93 = 95×55% + 82×25% + 100×12% + 100×8%';
        fixBtn.textContent = '查看补全方案';
        fixBtn.disabled = false;
        window.__toast('方案已生成 · 不会自动改写简历');
      }, 760);
    });
  }

  /* =====================================================================
     4. 模板库
     ===================================================================== */
  const TPL = [
    { name: '清晨单栏', use: '3.2 万', free: true,  cat: 'single',   v: 'single' },
    { name: '双栏经典', use: '2.8 万', free: true,  cat: 'two',      v: 'two' },
    { name: '侧边色块', use: '1.9 万', free: true,  cat: 'side',     v: 'side' },
    { name: '时间线', use: '1.4 万', free: true, cat: 'timeline', v: 'timeline' },
    { name: '头部色带', use: '2.1 万', free: false, cat: 'single',   v: 'band' },
    { name: '大标题块', use: '1.8 万', free: false, cat: 'single',   v: 'big' },
    { name: '头像右置', use: '1.6 万', free: false, cat: 'two',      v: 'photo' },
    { name: '紧凑一页', use: '1.2 万', free: false, cat: 'single',   v: 'compact' }
  ];

  function lines(cls) {
    return '<div class="sheet-l ' + cls + '"></div>';
  }
  function block(n) {
    let s = '<div class="sheet-h"></div>';
    for (let i = 0; i < n; i++) s += lines(['w90', 'w75', 'w90', 'w60'][i % 4]);
    return s;
  }
  function sheet(v) {
    var head = '<div class="sheet-name"></div><div class="sheet-role"></div>';
    if (v === 'two') {
      return head + '<div class="sheet-cols">' +
        '<div class="sheet-col">' + block(4) + block(4) + block(4) + block(4) + block(4) + block(3) + '</div>' +
        '<div class="sheet-col">' + block(3) + block(4) + block(4) + block(4) + block(4) + block(3) + '</div>' +
      '</div>';
    }
    if (v === 'side') {
      return '<div class="sheet-side"><div class="sheet-name"></div><div class="sheet-role"></div>' +
          '<div class="sheet-l w90"></div><div class="sheet-l w75"></div><div class="sheet-l w90"></div>' +
          '<div class="sheet-l w60"></div><div class="sheet-l w75"></div><div class="sheet-l w90"></div>' +
          '<div class="sheet-l w60"></div><div class="sheet-l w75"></div>' +
        '</div>' +
        '<div style="margin-left:35%">' + block(4) + block(4) + block(4) + block(4) + block(4) + block(3) + '</div>';
    }
    if (v === 'band') {
      return '<div class="sheet-band"></div>' +
        '<div style="padding-top:25%">' + head + block(4) + block(4) + block(4) + block(4) + block(3) + '</div>';
    }
    if (v === 'big') {
      return '<div class="sheet-name" style="width:62%;height:8px;margin-bottom:5px"></div>' +
        '<div class="sheet-role" style="width:40%;margin-bottom:10px"></div>' +
        '<div class="sheet-l w90 dark" style="height:3px"></div>' +
        block(4) + block(4) + block(4) + block(4) + block(4) + block(3);
    }
    if (v === 'photo') {
      return '<div class="sheet-photo"></div>' + head +
        block(4) + block(4) + block(4) + block(4) + block(4) + block(3);
    }
    if (v === 'compact') {
      var s = head;
      for (var i = 0; i < 7; i++) s += block(4, i);
      return s;
    }
    if (v === 'timeline') {
      var s2 = head + '<div class="sheet-timeline">';
      for (var j = 0; j < 22; j++) s2 += lines(['w90', 'w75', 'w90', 'w60'][j % 4]);
      return s2 + '</div>';
    }
    /* single */
    return head + block(4) + block(4) + block(4) + block(4) + block(4) + block(3);
  }

  const grid = document.getElementById('tplGrid');
  let activeFilter = 'all';

  function renderTpl() {
    if (!grid) return;
    const list = TPL.filter(function (t) {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'free') return t.free;
      return t.cat === activeFilter;
    });
    if (!list.length) {
      grid.innerHTML = '<div class="tpl-empty">这一类暂时没有可预览的版式，看看「全部」。</div>';
      return;
    }
    grid.innerHTML = list.map(function (t) {
      return '<article class="tpl' + (t.free ? '' : ' is-member') + '" data-name="' + t.name + '">' +
        '<div class="tpl-sheet">' + sheet(t.v) + '</div>' +
        '<div class="tpl-meta">' +
          '<span class="tpl-name">' + t.name + '</span>' +
          (t.free ? '<span class="tpl-tag free">免费</span>' : '') +
          '<span class="tpl-use">' + t.use + '</span>' +
        '</div>' +
      '</article>';
    }).join('');
  }
  renderTpl();

  const filterBox = document.getElementById('tplFilters');
  if (filterBox) {
    filterBox.addEventListener('click', function (e) {
      const btn = e.target.closest('.filter');
      if (!btn) return;
      Array.prototype.slice.call(filterBox.querySelectorAll('.filter')).forEach(function (b) {
        b.classList.toggle('on', b === btn);
      });
      activeFilter = btn.getAttribute('data-f');
      renderTpl();
    });
  }
  if (grid) {
    grid.addEventListener('click', function (e) {
      const card = e.target.closest('.tpl');
      if (!card) return;
      const name = card.getAttribute('data-name');
      window.__toast('已套用「' + name + '」· 去工作台继续编辑');
    });
  }

  /* =====================================================================
     5. 定价：月付 / 年付
     ===================================================================== */
  const billing = document.getElementById('billing');
  const memberPrice = document.getElementById('memberPrice');
  const memberUnit = document.getElementById('memberUnit');
  const memberEq = document.getElementById('memberEq');
  if (billing) {
    billing.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      Array.prototype.slice.call(billing.querySelectorAll('button')).forEach(function (b) {
        b.classList.toggle('on', b === btn);
      });
      const cycle = btn.getAttribute('data-cycle');
      if (cycle === 'year') {
        memberPrice.textContent = '¥11.5';
        memberUnit.textContent = '/ 月';
        memberEq.textContent = '按年付 ¥138 结算 · 比月付省 40%';
      } else {
        memberPrice.textContent = '¥19';
        memberUnit.textContent = '/ 月';
        memberEq.textContent = '年付 ¥138，合 ¥11.5 / 月 · 省 40%';
      }
    });
  }

  /* =====================================================================
     6. FAQ 手风琴
     ===================================================================== */
  Array.prototype.slice.call(document.querySelectorAll('.faq-item')).forEach(function (item) {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', function () {
      const open = item.classList.contains('open');
      Array.prototype.slice.call(document.querySelectorAll('.faq-item.open')).forEach(function (o) {
        o.classList.remove('open');
        o.querySelector('.faq-a').style.maxHeight = '';
      });
      if (!open) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });
})();

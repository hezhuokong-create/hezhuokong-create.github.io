/* ==========================================================================
   app.js —— 路由 / 编辑器实时预览 / AI 建议 / JD 匹配 / 看板拖拽 / 模板库
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toast = (m) => window.__toast && window.__toast(m);

  /* =====================================================================
     路由
     ===================================================================== */
  const VIEWS = {
    dashboard: '工作台',
    editor: '简历编辑器',
    match: '岗位匹配',
    board: '投递看板',
    templates: '模板库',
    account: '账号与积分'
  };

  function setView(name, updateHash) {
    if (!VIEWS[name]) name = 'dashboard';
    $$('.view').forEach(function (v) {
      v.classList.toggle('on', v.getAttribute('data-view-panel') === name);
    });
    $$('.nav-item').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('data-view') === name);
    });
    const crumb = $('#crumb');
    if (crumb) crumb.textContent = VIEWS[name];
    document.title = VIEWS[name] + ' · 方片蝈蝈';
    const content = $('#content');
    if (content) content.scrollTop = 0;
    if (updateHash && location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
  }

  $$('.nav-item[data-view]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      setView(a.getAttribute('data-view'), true);
    });
  });
  document.addEventListener('click', function (e) {
    const go = e.target.closest('[data-go]');
    if (go) {
      e.preventDefault();
      setView(go.getAttribute('data-go'), true);
    }
  });
  window.addEventListener('hashchange', function () {
    setView(location.hash.replace('#', ''), false);
  });
  setView(location.hash.replace('#', '') || 'dashboard', false);

  /* =====================================================================
     问候语
     ===================================================================== */
  const greeting = $('#greeting');
  if (greeting) {
    const h = new Date().getHours();
    const word = h < 6 ? '夜深了' : h < 11 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
    greeting.textContent = word + '，一苇';
  }

  /* =====================================================================
     待跟进的日期：按「今天」倒推，避免日期写死之后「已 N 天」天天算错
     ===================================================================== */
  (function followUpDates() {
    const today = new Date();
    $$('[data-since]').forEach(function (el) {
      const d = parseInt(el.getAttribute('data-since'), 10);
      if (isNaN(d)) return;
      const t = new Date(today.getTime());
      t.setDate(t.getDate() - d);
      const m = t.getMonth() + 1;
      const day = t.getDate();
      const tag = el.querySelector('.tag-red');
      const kd = el.querySelector('.kdate');
      if (tag) tag.textContent = d + ' 天无回音';
      if (kd) kd.textContent = (m < 10 ? '0' + m : m) + ' / ' + (day < 10 ? '0' + day : day);
      if (!tag && !kd) el.textContent = m + ' 月 ' + day + ' 日投递 · 已 ' + d + ' 天无回音';
    });
  })();

  /* =====================================================================
     编辑器：实时预览
     ===================================================================== */
  const BIND = {
    name: 'pvName',
    company: 'pvCompany',
    desc1: 'pvDesc1',
    desc2: 'pvDesc2',
    skills: 'pvSkills',
    edu: 'pvEdu'
  };
  const saveState = $('#saveState');
  let saveTimer = null;

  function syncField(el) {
    const key = el.getAttribute('data-bind');
    const target = key === 'role' ? $('#pvRole') : BIND[key] ? document.getElementById(BIND[key]) : null;
    if (!target) return;
    if (key === 'role') {
      const v = el.textContent.trim() || '产品经理';
      target.textContent = v + ' · 5 年 · 深圳';
    } else {
      target.textContent = el.textContent;
    }
  }

  const editables = $$('.editable[data-bind]');
  editables.forEach(function (el) {
    el.addEventListener('input', function () {
      syncField(el);
      if (saveState) {
        saveState.textContent = '… 编辑中';
        saveState.className = 'tag';
      }
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        if (saveState) {
          saveState.textContent = '✓ 已保存';
          saveState.className = 'tag tag-accent';
        }
      }, 900);
    });
    /* 粘贴时只取纯文本，避免带进外部样式 */
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  });

  /* AI 建议：勾选 / 应用 */
  const aiCards = $$('.ai-card');
  const aiApply = $('#aiApply');

  function pickedCards() {
    return aiCards.filter((c) => c.classList.contains('picked'));
  }
  function refreshAiCount() {
    if (!aiApply) return;
    const n = pickedCards().length;
    aiApply.textContent = n ? '应用选中 ' + n + ' 条' : '先勾选建议';
    aiApply.disabled = n === 0;
  }
  aiCards.forEach(function (card) {
    const box = $('.ai-check', card);
    if (box) {
      box.addEventListener('click', function (e) {
        e.stopPropagation();
        card.classList.toggle('picked');
        refreshAiCount();
      });
    }
    card.addEventListener('click', function (e) {
      if (e.target.closest('.ai-check')) return;
      card.classList.toggle('picked');
      refreshAiCount();
    });
  });
  refreshAiCount();

  if (aiApply) {
    aiApply.addEventListener('click', function () {
      const n = pickedCards().length;
      if (!n) { toast('先勾选一条建议'); return; }

      const d1 = $('#edDesc1');
      const d2 = $('#edDesc2');
      if (d1 && pickedCards().some((c) => /顺序/.test($('.ai-k', c).textContent))) {
        const next = '主导 3 条业务线的需求定义与优先级排序，推动版本按期上线；DAU 从 12 万增长到 28 万，付费转化率提升 3.2 个百分点。';
        d1.textContent = next;
        syncField(d1);
      }
      if (d2 && pickedCards().some((c) => /关键词/.test($('.ai-k', c).textContent))) {
        const next = '搭建会员分层模型，完成 6 个权益包的定价与灰度；用 SQL 独立完成留存与漏斗分析，熟练使用 Excel 与 Tableau。';
        d2.textContent = next;
        syncField(d2);
      }

      aiCards.forEach(function (c) {
        if (c.classList.contains('picked')) {
          c.classList.remove('picked');
          const k = $('.ai-k', c);
          if (k && !k.dataset.done) {
            k.dataset.done = '1';
            k.textContent = '已写入 · 版本 v4';
          }
        }
      });
      refreshAiCount();
      if (saveState) { saveState.textContent = '✓ 已保存'; saveState.className = 'tag tag-accent'; }
      toast('已写入 ' + n + ' 条 · 存成新版本 v4，可回滚');
    });
  }

  /* 批注开关 */
  const annoBtn = $('#annoBtn');
  const a4 = $('#a4');
  if (annoBtn && a4) {
    annoBtn.addEventListener('click', function () {
      const on = a4.classList.toggle('anno-on');
      annoBtn.classList.toggle('on', on);
      annoBtn.textContent = on ? '隐藏批注' : '显示批注';
    });
  }

  /* 缩放 */
  let zoom = 100;
  const zoomVal = $('#zoomVal');
  function applyZoom() {
    if (a4) a4.style.transform = 'scale(' + zoom / 100 + ')';
    if (zoomVal) zoomVal.textContent = zoom + '%';
  }
  const zin = $('#zoomIn');
  const zout = $('#zoomOut');
  if (zin) zin.addEventListener('click', function () { zoom = Math.min(130, zoom + 10); applyZoom(); });
  if (zout) zout.addEventListener('click', function () { zoom = Math.max(70, zoom - 10); applyZoom(); });

  /* =====================================================================
     JD 匹配
     ===================================================================== */
  const runBtn = $('#runMatch');
  const report = $('#matchReport');
  const steps = $$('.step');
  let matching = false;

  function tweenNumber(el, from, to, dur) {
    if (!el) return;
    if (reduce) { el.textContent = String(to); return; }
    const t0 = performance.now();
    function frame(ts) {
      const p = Math.min(1, (ts - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (runBtn && report) {
    runBtn.addEventListener('click', function () {
      if (matching) return;
      const jd = $('#jdText');
      if (jd && jd.value.trim().length < 30) {
        toast('JD 太短了，补到 300–800 字更准');
        return;
      }
      matching = true;
      runBtn.disabled = true;
      runBtn.textContent = '匹配中…';
      report.classList.remove('done');
      steps.forEach(function (s) { s.classList.remove('on', 'done'); });

      const gap = reduce ? 0 : 520;
      steps.forEach(function (s, i) {
        setTimeout(function () {
          s.classList.add('on');
          setTimeout(function () {
            s.classList.remove('on');
            s.classList.add('done');
          }, gap * 0.62);
        }, i * gap);
      });

      setTimeout(function () {
        report.classList.add('done');
        tweenNumber($('#rbScore'), 0, 82, 900);
        matching = false;
        runBtn.disabled = false;
        runBtn.textContent = '重新匹配';
        toast('匹配完成 · 82 分，缺 2 个关键词');
      }, steps.length * gap + 220);
    });
  }

  /* 补全方案（报告内） */
  const fix2 = $('#fixBtn2');
  if (fix2) {
    let fixed = false;
    fix2.addEventListener('click', function () {
      if (fixed) { toast('方案已生成，去编辑器勾选后才写入'); return; }
      fixed = true;
      fix2.disabled = true;
      fix2.textContent = '生成中…';
      setTimeout(function () {
        const miss = $('#rbMiss');
        if (miss) {
          $$('.kw-chip', miss).forEach(function (c) {
            c.classList.remove('miss');
            c.classList.add('fixed');
            c.textContent = '✓ ' + c.textContent;
          });
        }
        const dims = $$('.rb-dim');
        if (dims[0]) {
          $('.bar', dims[0]).style.setProperty('--v', '.95');
          $('b', dims[0]).textContent = '95%';
        }
        if (dims[2]) {
          $('.bar', dims[2]).style.setProperty('--v', '.82');
          $('b', dims[2]).textContent = '82%';
        }
        tweenNumber($('#rbScore'), 82, 93, 900);
        const v = $('#rbVerdict');
        if (v) v.innerHTML = '已进入 <b>优先投递</b> 区间 —— 技能与行业各补一档。方案在编辑器候选区，<b>勾选后才写入</b>。';
        fix2.disabled = false;
        fix2.textContent = '查看补全方案';
        toast('方案已生成 · 93 分，去编辑器勾选');
      }, 760);
    });
  }

  const clearJd = $('#clearJd');
  if (clearJd) {
    clearJd.addEventListener('click', function () {
      const jd = $('#jdText');
      if (jd) { jd.value = ''; jd.focus(); }
      if (report) report.classList.remove('done');
      steps.forEach(function (s) { s.classList.remove('on', 'done'); });
      toast('已清空 · 原文没有扣积分');
    });
  }

  /* =====================================================================
     投递看板：拖拽
     ===================================================================== */
  const board = $('#board');
  if (board) {
    let dragged = null;

    function updateCounts() {
      $$('.kcol').forEach(function (col) {
        const n = $$('.kcard', col).length;
        const c = $('.kh-c', col);
        if (c) c.textContent = String(n);
      });
    }

    board.addEventListener('dragstart', function (e) {
      const card = e.target.closest('.kcard');
      if (!card) return;
      dragged = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', card.querySelector('.kcard-t').textContent); } catch (err) {}
    });

    board.addEventListener('dragend', function () {
      if (dragged) dragged.classList.remove('dragging');
      dragged = null;
      $$('.kcol').forEach(function (c) { c.classList.remove('over'); });
    });

    $$('.kcol').forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('over');
      });
      col.addEventListener('dragleave', function (e) {
        if (!col.contains(e.relatedTarget)) col.classList.remove('over');
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('over');
        if (!dragged) return;
        const body = $('.kcol-body', col);
        if (!body) return;
        body.appendChild(dragged);
        const name = $('.kcard-t', dragged).textContent;
        const label = $('.kh-t', col).textContent;
        updateCounts();
        toast('「' + name + '」已移到「' + label + '」');
      });
    });

    updateCounts();
  }

  /* =====================================================================
     模板库
     ===================================================================== */
  const TPL = [
    { name: '清晨单栏', use: '3.2 万', free: true,  cat: 'single',   v: 'single' },
    { name: '双栏经典', use: '2.8 万', free: true,  cat: 'two',      v: 'two' },
    { name: '头部色带', use: '2.1 万', free: false, cat: 'single',   v: 'band' },
    { name: '侧边色块', use: '1.9 万', free: true,  cat: 'side',     v: 'side' },
    { name: '大标题块', use: '1.8 万', free: true,  cat: 'single',   v: 'big' },
    { name: '头像右置', use: '1.6 万', free: false, cat: 'two',      v: 'photo' },
    { name: '时间线', use: '1.4 万', free: true, cat: 'timeline', v: 'timeline' },
    { name: '紧凑一页', use: '1.2 万', free: false, cat: 'single',   v: 'compact' },
    { name: '中英双语', use: '0.9 万', free: false, cat: 'two',      v: 'two' },
    { name: '论文式', use: '0.42 万', free: true,  cat: 'single',   v: 'plain' },
    { name: '杂志分栏', use: '0.38 万', free: false, cat: 'two',      v: 'photo' },
    { name: '灰度极简', use: '0.28 万', free: false, cat: 'single',  v: 'gray' }
  ];

  function lines(cls) { return '<div class="sheet-l ' + cls + '"></div>'; }
  function block(n, start) {
    let s = '<div class="sheet-h"></div>';
    const order = ['w90', 'w75', 'w90', 'w60'];
    for (let i = 0; i < n; i++) s += lines(order[(i + (start || 0)) % 4]);
    return s;
  }
  function sheet(v) {
    var head = '<div class="sheet-name"></div><div class="sheet-role"></div>';
    if (v === 'two') {
      return head + '<div class="sheet-cols">' +
        '<div class="sheet-col">' + block(4) + block(4) + block(4) + block(4) + block(4) + block(3) + '</div>' +
        '<div class="sheet-col">' + block(3, 1) + block(4) + block(4) + block(4) + block(4) + block(3) + '</div>' +
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
    if (v === 'plain') {
      return '<div class="sheet-name" style="width:46%"></div><div class="sheet-role" style="width:32%"></div>' +
        block(4) + block(4) + block(4) + block(4) + block(4) + block(3);
    }
    if (v === 'gray') {
      return '<div class="sheet-name" style="background:#4A463E"></div><div class="sheet-role"></div>' +
        '<div class="sheet-h" style="background:#4A463E"></div>' + block(4) + block(4) + block(4) +
        '<div class="sheet-h" style="background:#4A463E"></div>' + block(3) + block(3);
    }
    /* single */
    return head + block(4) + block(4) + block(4) + block(4) + block(4) + block(3);
  }

  const tgrid = $('#tplGrid2');
  let filter = 'all';

  function renderTpl() {
    if (!tgrid) return;
    const list = TPL.filter(function (t) {
      if (filter === 'all') return true;
      if (filter === 'free') return t.free;
      return t.cat === filter;
    });
    tgrid.innerHTML = list.map(function (t) {
      return '<article class="tcard" data-name="' + t.name + '">' +
        '<div class="tpl-sheet">' + sheet(t.v) + (t.free ? '' : '<span class="member-flag">会员</span>') + '</div>' +
        '<div class="tcard-meta">' +
          '<div class="tcard-name">' + t.name +
            (t.free ? '<span class="tag tag-accent" style="height:17px;font-size:9px;padding:0 5px">免费</span>' : '') +
          '</div>' +
          '<div class="tcard-sub">使用 ' + t.use + '<span class="dot"></span>' + (t.free ? '可直接导出' : '会员可用') + '</div>' +
        '</div>' +
        '<button class="use-btn">使用这个模板</button>' +
      '</article>';
    }).join('');

    const count = $('#tplCount');
    if (count) count.textContent = filter === 'all' ? '24 款 · 显示 12 款' : list.length + ' 款';
  }
  renderTpl();

  const fbox = $('#tplFilters2');
  if (fbox) {
    fbox.addEventListener('click', function (e) {
      const b = e.target.closest('.filter');
      if (!b) return;
      $$('.filter', fbox).forEach(function (x) { x.classList.toggle('on', x === b); });
      filter = b.getAttribute('data-f');
      renderTpl();
    });
  }
  if (tgrid) {
    tgrid.addEventListener('click', function (e) {
      const card = e.target.closest('.tcard');
      if (!card) return;
      toast('已套用「' + card.getAttribute('data-name') + '」· 去编辑器继续');
      setView('editor', true);
    });
  }

  /* =====================================================================
     零散动作
     ===================================================================== */
  const newBtn = $('#newResume');
  if (newBtn) newBtn.addEventListener('click', function () {
    toast('新建了一份空白简历 · 已放进草稿');
    setView('editor', true);
  });

  const importBtn = $('#importBtn');
  if (importBtn) importBtn.addEventListener('click', function () { toast('选择 PDF / DOCX / 图片 · 解析后原文件即删除'); });

  const exportBtn = $('#exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', function () {
    toast('导出 PDF · 免费版带水印，会员版无水印');
  });

  const recharge = $('#rechargeBtn');
  if (recharge) recharge.addEventListener('click', function () { toast('1 元 = 1 积分 · 失败与超时自动退回'); });

  const upgrade = $('#upgradeBtn');
  if (upgrade) upgrade.addEventListener('click', function () { toast('会员 ¥19/月 · 年付 ¥138，省 40%'); });

  const order = $('#orderBtn');
  if (order) order.addEventListener('click', function () { toast('近 90 天共 3 笔订单'); });

  const creditsChip = $('#creditsChip');
  if (creditsChip) creditsChip.addEventListener('click', function () { setView('account', true); });

  const avatarBtn = $('#avatarBtn');
  if (avatarBtn) avatarBtn.addEventListener('click', function () { setView('account', true); });

  const sbUser = $('#sbUser');
  if (sbUser) sbUser.addEventListener('click', function () { setView('account', true); });

  const addApp = $('#addApp');
  if (addApp) addApp.addEventListener('click', function () { toast('从岗位库选一个岗位，或直接粘贴 JD'); setView('match', true); });

  /* 表单折叠 */
  $$('.form-head').forEach(function (h) {
    h.addEventListener('click', function () {
      h.closest('.form-card').classList.toggle('closed');
    });
  });
})();

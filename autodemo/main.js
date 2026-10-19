/* ============================================================
   自动档 demo · 工作流画布引擎
   - 两个 demo 共用一套渲染器与运行引擎，各自一份图数据（GRAPH）
   - 节点/连线按设计坐标（1040 宽）绘制，随容器宽度等比缩放
   - 每个 demo 有 2–3 套运行剧本（正常 / 出错重试 / 无变动跳过）
   - 执行历史可点，回放那一次的真实日志
   兼容：合集页 index.html、单页 demo1.html / demo2.html
   ?noauto 禁用滚动自动执行（验证/截图脚本用）
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); }
  function $(id) { return document.getElementById(id); }
  function p2(n) { return String(n).padStart(2, '0'); }
  function nowHMS() {
    var d = new Date();
    return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
  }

  /* ---------- 日期注入：演示里的日期不能写死，否则隔一天就"过期" ---------- */
  function fillDates() {
    var d = new Date();
    var md = p2(d.getMonth() + 1) + '-' + p2(d.getDate());
    var ymd = d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate());
    document.querySelectorAll('[data-today-md]').forEach(function (el) { el.textContent = md; });
    document.querySelectorAll('[data-today-ymd]').forEach(function (el) { el.textContent = ymd; });
    var hm = p2(d.getHours()) + ':' + p2(d.getMinutes());
    document.querySelectorAll('[data-now-hm]').forEach(function (el) { el.textContent = hm; });
    document.querySelectorAll('[data-daysago]').forEach(function (el) {
      var n = parseInt(el.getAttribute('data-daysago'), 10) || 0;
      var t = new Date(d.getTime() - n * 86400000);
      el.textContent = p2(t.getMonth() + 1) + '-' + p2(t.getDate());
    });
    return ymd;
  }
  var TODAY_YMD = fillDates();

  /* ============================================================
     图标（24×24 线性，统一 1.6 描边）
     ============================================================ */
  var IC = {
    clock: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.6V12l3.2 2"/>',
    down: '<path d="M12 3.5v10.5m0 0 3.8-3.8M12 14l-3.8-3.8"/><path d="M4.5 17.5v1.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-1.5"/>',
    parse: '<path d="M4 5.5h16l-6 7v5.2a1 1 0 0 1-1.6.8l-2-1.6a1 1 0 0 1-.4-.8v-3.6l-6-7z"/>',
    merge: '<path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5z"/><path d="M3 12.5 12 17l9-4.5"/><path d="M3 16.5 12 21l9-4.5"/>',
    split: '<path d="M5 4.5v4.2c0 1.6 1.3 2.8 2.8 2.8h8.4c1.6 0 2.8 1.3 2.8 2.8v5.2"/><path d="M15.6 16.8 19 20l3.4-3.2"/><path d="M5 19.5v-3.2"/>',
    ai: '<path d="M11 3.5l1.7 4.6 4.6 1.7-4.6 1.7L11 16.1 9.3 11.5 4.7 9.8l4.6-1.7L11 3.5z"/><path d="M18 14.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"/>',
    send: '<path d="M20.5 3.5 10.8 13.2m0 0H15m-4.2 0H8.5L3.5 20.5"/><path d="M20.5 3.5 13 11"/>',
    chat: '<path d="M20.5 12.2c0 3.9-3.8 7-8.5 7-1 0-2-.1-2.9-.4L4 20.5l1.3-3.7c-1.2-1.3-1.8-2.9-1.8-4.6 0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7z"/>',
    db: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6"/><path d="M4.5 12v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6"/>',
    flag: '<path d="M6 21V4.2"/><path d="M6 4.5h11.5l-2 4 2 4H6"/>',
    alert: '<path d="M12 4.2 21 19.5H3L12 4.2z"/><path d="M12 10v4.4"/><path d="M12 17.2v.1"/>',
    skip: '<path d="M5 5.5 13 12l-8 6.5v-13z"/><path d="M18.5 5.5v13"/>',
    form: '<rect x="4.5" y="3.5" width="15" height="17" rx="1.8"/><path d="M8.5 9h7M8.5 13h7M8.5 17h4"/>',
    shield: '<path d="M12 3.2 20 6v5.6c0 4.3-3.4 7.5-8 9.2-4.6-1.7-8-4.9-8-9.2V6l8-2.8z"/><path d="M8.6 12.2 11 14.6l4.4-4.4"/>',
    bell: '<path d="M18 9.2c0-3.3-2.7-6-6-6s-6 2.7-6 6c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5z"/><path d="M13.7 19.5a2 2 0 0 1-3.4 0"/>',
    tag: '<path d="M11.2 3.6H20v8.8l-8.5 8.5a1.6 1.6 0 0 1-2.3 0L3.6 15a1.6 1.6 0 0 1 0-2.3l7.6-7.6z"/><circle cx="16.4" cy="7.6" r="1.2"/>',
    timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.2 1.4"/><path d="M9.5 3.5h5"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.8"/><path d="M3.8 7l8.2 6 8.2-6"/>',
    check: '<path d="M4.5 12.5 9.5 17.5 19.5 7"/>'
  };

  /* ============================================================
     图数据
     画布设计宽 1040；节点 132×50；六列 x = 16 / 194 / 372 / 550 / 728 / 906
     三条泳道：L1 y=20、分支带 y=96、L2 y=166、L3 y=262
     ============================================================ */
  var COL = [16, 194, 372, 550, 728, 906];

  var GRAPH = {
    d1: {
      w: 1040, h: 336, mk: 'arw1',
      nodes: [
        { id: 'a1', x: COL[0], y: 20, w: 132, h: 50, ic: 'clock', t: '定时触发', s: 'cron 0 9 * * *', s0: 'cron 0 9 * * *' },
        { id: 'a2', x: COL[1], y: 20, w: 132, h: 50, ic: 'down', t: '抓取竞品 A', s: '200 OK · 1.2s', s0: '200 OK · 1.2s' },
        { id: 'a3', x: COL[2], y: 20, w: 132, h: 50, ic: 'parse', t: '解析价格', s: '8 items', s0: '8 items' },
        { id: 'a4', x: COL[3], y: 20, w: 132, h: 50, ic: 'down', t: '抓取竞品 B', s: '200 OK · 0.9s', s0: '200 OK · 0.9s' },
        { id: 'a5', x: COL[4], y: 20, w: 132, h: 50, ic: 'parse', t: '解析价格', s: '6 items', s0: '6 items' },
        { id: 'a6', x: COL[5], y: 20, w: 132, h: 50, ic: 'merge', t: '合并去重', s: '14 → 10 SKU', s0: '14 → 10 SKU' },
        { id: 'e1', x: COL[3], y: 96, w: 132, h: 46, ic: 'alert', t: '超时重试', s: '重试 1/3 · 30s', s0: '重试 1/3 · 30s', kind: 'err' },
        { id: 'a7', x: COL[5], y: 166, w: 132, h: 50, ic: 'split', t: 'IF 变动 ≥ ¥5', s: '3 / 10 命中', s0: '3 / 10 命中', kind: 'if' },
        { id: 'a8', x: COL[4], y: 166, w: 132, h: 50, ic: 'ai', t: 'AI 生成日报', s: '引用 3 处变动', s0: '引用 3 处变动' },
        { id: 'a9', x: COL[3], y: 166, w: 132, h: 50, ic: 'send', t: '推送企微群', s: '运营小分队', s0: '运营小分队' },
        { id: 'a10', x: COL[2], y: 166, w: 132, h: 50, ic: 'db', t: '写入执行记录', s: 'run_0900', s0: 'run_0900' },
        { id: 's1', x: COL[5], y: 262, w: 132, h: 50, ic: 'skip', t: '跳过推送', s: '0 条变动', s0: '0 条变动', kind: 'skip' },
        { id: 'end', x: COL[0], y: 262, w: 132, h: 50, ic: 'flag', t: '完成', s: '3.8s · 人工 0 分', s0: '3.8s · 人工 0 分', kind: 'end' }
      ],
      wires: [
        { id: 'w1', from: 'a1:r', to: 'a2:l' },
        { id: 'w2', from: 'a2:r', to: 'a3:l', label: '8 items', lx: 349, ly: 29 },
        { id: 'w3', from: 'a3:r', to: 'a4:l', label: '8 → 6', lx: 527, ly: 29 },
        { id: 'w4', from: 'a4:r', to: 'a5:l', label: '6 items', lx: 705, ly: 29 },
        { id: 'w5', from: 'a5:r', to: 'a6:l', label: '14 → 10', lx: 883, ly: 29 },
        { id: 'w6', from: 'a6:b', to: 'a7:t', label: '10 SKU', lx: 1000, ly: 118 },
        { id: 'w7', from: 'a7:l', to: 'a8:r' },
        { id: 'w8', from: 'a8:l', to: 'a9:r' },
        { id: 'w9', from: 'a9:l', to: 'a10:r' },
        { id: 'w10', from: 'a4:b', to: 'e1:t', kind: 'err' },
        { id: 'w11', from: 'e1:r', via: [[794, 119]], to: 'a5:b', kind: 'err' },
        { id: 'w12', from: 'a7:b', to: 's1:t', kind: 'skip' },
        { id: 'w13', from: 'a10:b', via: [[438, 240], [82, 240]], to: 'end:t' },
        { id: 'w14', from: 's1:l', to: 'end:r', kind: 'skip', label: '跳过推送', lx: 527, ly: 274 }
      ]
    },
    d2: {
      w: 1040, h: 336, mk: 'arw2',
      nodes: [
        { id: 'b1', x: COL[0], y: 20, w: 132, h: 50, ic: 'form', t: '表单提交', s: 'webhook 实时', s0: 'webhook 实时' },
        { id: 'b2', x: COL[1], y: 20, w: 132, h: 50, ic: 'shield', t: '校验字段', s: '手机 / 邮箱', s0: '手机 / 邮箱' },
        { id: 'b3', x: COL[2], y: 20, w: 132, h: 50, ic: 'db', t: '查重', s: '线索库 · 3s', s0: '线索库 · 3s' },
        { id: 'b4', x: COL[3], y: 20, w: 132, h: 50, ic: 'split', t: 'IF 新线索', s: '命中 0 / 1', s0: '命中 0 / 1', kind: 'if' },
        { id: 'b5', x: COL[4], y: 20, w: 132, h: 50, ic: 'ai', t: 'AI 生成回复', s: '引用报价单', s0: '引用报价单' },
        { id: 'b6', x: COL[5], y: 20, w: 132, h: 50, ic: 'mail', t: '发送邮件', s: '客户邮箱', s0: '客户邮箱' },
        { id: 'd1', x: COL[3], y: 96, w: 132, h: 46, ic: 'merge', t: '合并线索', s: '不重复回复', s0: '不重复回复', kind: 'skip' },
        { id: 'b7', x: COL[5], y: 166, w: 132, h: 50, ic: 'chat', t: '企微通知你', s: '摘要 · 可跟进', s0: '摘要 · 可跟进' },
        { id: 'b8', x: COL[4], y: 166, w: 132, h: 50, ic: 'db', t: '写入 CRM', s: '线索库', s0: '线索库' },
        { id: 'b9', x: COL[3], y: 166, w: 132, h: 50, ic: 'tag', t: '标记待跟进', s: '负责人：你', s0: '负责人：你' },
        { id: 'b10', x: COL[2], y: 166, w: 132, h: 50, ic: 'timer', t: '记录耗时', s: '2.7s', s0: '2.7s' },
        { id: 'end', x: COL[0], y: 262, w: 132, h: 50, ic: 'flag', t: '完成', s: '2.7s · 人工 0 分', s0: '2.7s · 人工 0 分', kind: 'end' }
      ],
      wires: [
        { id: 'v1', from: 'b1:r', to: 'b2:l' },
        { id: 'v2', from: 'b2:r', to: 'b3:l', label: '3 字段', lx: 349, ly: 29 },
        { id: 'v3', from: 'b3:r', to: 'b4:l', label: '0 命中', lx: 527, ly: 29 },
        { id: 'v4', from: 'b4:r', to: 'b5:l', label: '新线索', lx: 705, ly: 29 },
        { id: 'v5', from: 'b5:r', to: 'b6:l' },
        { id: 'v6', from: 'b6:b', to: 'b7:t', label: '1 封', lx: 1000, ly: 118 },
        { id: 'v7', from: 'b7:l', to: 'b8:r' },
        { id: 'v8', from: 'b8:l', to: 'b9:r' },
        { id: 'v9', from: 'b9:l', to: 'b10:r' },
        { id: 'v10', from: 'b4:b', to: 'd1:t', kind: 'skip' },
        { id: 'v11', from: 'b10:b', via: [[438, 240], [82, 240]], to: 'end:t' },
        { id: 'v12', from: 'd1:l', via: [[320, 119], [320, 287]], to: 'end:r', kind: 'skip', label: '重复 · 合并', lx: 320, ly: 172 }
      ]
    }
  };

  /* ============================================================
     画布渲染
     ============================================================ */
  var registry = {};

  function anchorOf(rects, ref) {
    var p = ref.split(':'), n = rects[p[0]], s = p[1];
    if (!n) return [0, 0];
    if (s === 'l') return [n.x, n.y + n.h / 2];
    if (s === 'r') return [n.x + n.w, n.y + n.h / 2];
    if (s === 't') return [n.x + n.w / 2, n.y];
    return [n.x + n.w / 2, n.y + n.h];
  }

  function renderCanvas(key) {
    var host = $('canvas-' + key);
    if (!host) return null;
    var G = GRAPH[key];
    var rects = {};
    G.nodes.forEach(function (n) { rects[n.id] = n; });

    var html = '<div class="cnv-inner" style="width:' + G.w + 'px;height:' + G.h + 'px">';

    html += '<svg class="cnv-wires" width="' + G.w + '" height="' + G.h + '" viewBox="0 0 ' + G.w + ' ' + G.h + '" aria-hidden="true">' +
      '<defs><marker id="' + G.mk + '" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">' +
      '<path d="M1.2 1.2 L6.8 4 L1.2 6.8" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>';
    G.wires.forEach(function (w) {
      var pts = [anchorOf(rects, w.from)];
      (w.via || []).forEach(function (p) { pts.push(p); });
      pts.push(anchorOf(rects, w.to));
      var d = 'M' + pts[0][0] + ' ' + pts[0][1] + pts.slice(1).map(function (p) { return ' L' + p[0] + ' ' + p[1]; }).join('');
      html += '<path class="cw' + (w.kind ? ' cw-' + w.kind : '') + '" data-w="' + w.id + '" d="' + d + '" marker-end="url(#' + G.mk + ')"/>';
    });
    html += '</svg>';

    G.wires.forEach(function (w) {
      if (!w.label) return;
      html += '<span class="wchip' + (w.kind ? ' wchip-' + w.kind : '') + '" style="left:' + w.lx + 'px;top:' + w.ly + 'px">' + w.label + '</span>';
    });

    G.nodes.forEach(function (n) {
      html += '<div class="cnode' + (n.kind ? ' cn-' + n.kind : '') + '" data-n="' + n.id + '"' +
        ' style="left:' + n.x + 'px;top:' + n.y + 'px;width:' + n.w + 'px;height:' + n.h + 'px">' +
        '<span class="cn-ic"><svg viewBox="0 0 24 24">' + IC[n.ic] + '</svg></span>' +
        '<span class="cn-tx"><b>' + n.t + '</b><i>' + n.s + '</i></span>' +
        '<span class="cn-tick"><svg viewBox="0 0 24 24">' + IC.check + '</svg></span>' +
        '</div>';
    });

    html += '</div>';
    host.innerHTML = html;
    registry[key] = { G: G, host: host, rects: rects };
    return registry[key];
  }

  /* 等比缩放：设计宽 1040 → 容器宽。手机上最小 0.8，可横向滑动看全图 */
  function fitCanvases() {
    Object.keys(registry).forEach(function (key) {
      var sc = document.querySelector('.cnv-scroll[data-cnv="' + key + '"]');
      var cnv = document.querySelector('.cnv[data-cnv="' + key + '"]');
      if (!sc || !cnv) return;
      var G = registry[key].G;
      var avail = sc.clientWidth || 1040;
      var s = avail / G.w;
      if (s > 1) s = 1;
      if (s < 0.8) s = 0.8;
      cnv.style.zoom = s;
      sc.classList.toggle('is-scrollable', s < 1);
      sc.style.height = Math.round(G.h * s) + 'px';
    });
  }

  /* ============================================================
     运行引擎
     ============================================================ */
  var HOOKS = {};

  function makeDemo(cfg) {
    var reg = renderCanvas(cfg.key);
    if (!reg) return null;
    var G = reg.G;
    var host = reg.host;
    var btnEl = $(cfg.btn), clog = $(cfg.log), stateEl = $(cfg.state), clockEl = cfg.clock ? $(cfg.clock) : null;

    function nodeEl(id) { return host.querySelector('.cnode[data-n="' + id + '"]'); }

    function setNode(id, st) {
      var el = nodeEl(id);
      if (!el) return;
      el.classList.remove('is-run', 'is-done', 'is-err', 'is-skip');
      if (st && st !== 'idle') el.classList.add('is-' + st);
    }
    function setWire(id, st) {
      var el = host.querySelector('.cw[data-w="' + id + '"]');
      if (!el) return;
      el.classList.remove('is-flow', 'is-done', 'is-err', 'is-skip');
      if (st && st !== 'idle') el.classList.add('is-' + st);
    }
    function setSub(id, text) {
      var el = nodeEl(id);
      if (!el) return;
      var i = el.querySelector('.cn-tx i');
      if (i) i.textContent = text;
    }

    function markScrolled(box) {
      box.scrollTop = box.scrollHeight;
      if (box.scrollTop > 0) box.classList.add('is-scrolled');
      else box.classList.remove('is-scrolled');
    }
    function logLine(box, ts, level, text) {
      var dim = box.querySelector('.log-dim');
      if (dim) dim.remove();
      var line = document.createElement('div');
      line.className = 'log-line' + (level === 'done' ? ' log-final' : '');
      line.innerHTML = '<span class="ts">' + ts + '</span><span class="lv lv-' + level + '">' + level + '</span>' + text;
      box.appendChild(line);
      markScrolled(box);
    }

    function showResult(kind) {
      (cfg.resultIds || []).forEach(function (id) { var e = $(id); if (e) e.style.display = 'none'; });
      var id = (cfg.resultMap || {})[kind];
      if (id && $(id)) $(id).style.display = '';
      if (cfg.speedup) $(cfg.speedup).style.display = (kind === 'normal' ? '' : 'none');
    }

    function reset() {
      G.nodes.forEach(function (n) { setNode(n.id, null); setSub(n.id, n.s0); });
      G.wires.forEach(function (w) { setWire(w.id, null); });
      (cfg.resultIds || []).forEach(function (id) { var e = $(id); if (e) e.style.display = 'none'; });
      /* 空态必须单独放回来：它也在 resultIds 里，上面那行会把它一起藏掉，
         结果就是未运行时面板一片空白（而不是"运行后日报会推送到这里"） */
      if (cfg.empty && $(cfg.empty)) $(cfg.empty).style.display = '';
      if (cfg.speedup) $(cfg.speedup).style.display = 'none';
      clog.innerHTML = '<div class="log-line log-dim">等待运行 · 点击下方按钮，或滚动到此处自动执行</div>';
      clog.classList.remove('is-scrolled');
      (cfg.scanRows || []).forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (r) { r.classList.remove('scanned'); });
      });
      stateEl.textContent = 'IDLE';
      stateEl.className = 'console-state';
      if (clockEl) clockEl.textContent = cfg.idleClock || '未运行';
      if (cfg.onReset) cfg.onReset();
    }

    var busy = false, nextIdx = 0;

    function labelBtn(text) {
      btnEl.innerHTML = '<svg viewBox="0 0 24 24" class="rb-ic"><path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11.2-7.2c.6-.4.6-1.4 0-1.8L8.6 3.9c-.7-.4-1.6.1-1.6.9z"/></svg>' + text;
    }

    function markHistory(i) {
      if (!cfg.hist) return;
      var done = false;
      document.querySelectorAll('#' + cfg.hist + ' .rh-row').forEach(function (r) {
        var match = +r.getAttribute('data-run') === i;
        r.classList.toggle('is-sel', match && !done);
        if (match) done = true;
      });
    }

    async function play(i, instant) {
      var sc = cfg.scen[i];
      reset();
      stateEl.textContent = 'RUNNING';
      stateEl.className = 'console-state is-run';
      if (clockEl) clockEl.textContent = '运行中…';
      if (cfg.onStart) cfg.onStart(sc);

      for (var k = 0; k < sc.steps.length; k++) {
        var s = sc.steps[k];
        if (s.w) setWire(s.w, s.st || 'flow');
        if (s.n) setNode(s.n, s.st || 'run');
        if (s.sub) setSub(s.n, s.sub);
        if (s.log) logLine(clog, s.log[0], s.log[1], s.log[2]);
        if (s.scan) document.querySelectorAll(s.scan).forEach(function (r) { r.classList.add('scanned'); });
        if (s.res) showResult(s.res);
        if (s.hook && HOOKS[s.hook]) HOOKS[s.hook]();
        await sleep(instant ? 0 : (s.ms || 0));
      }

      stateEl.textContent = sc.state || 'DONE';
      stateEl.className = 'console-state ' + (sc.state === 'SKIPPED' ? 'is-skip' : 'is-done');
      if (clockEl) clockEl.textContent = sc.clock;
      nextIdx = (i + 1) % cfg.scen.length;
      labelBtn(cfg.scen[nextIdx].btn);
      if (cfg.onDone) cfg.onDone(sc);
      markHistory(i);
    }

    function runNext() {
      if (busy) return;
      busy = true;
      btnEl.disabled = true;
      var playing = nextIdx;
      btnEl.innerHTML = '<svg viewBox="0 0 24 24" class="rb-ic"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="40 20"/></svg>' + (cfg.busyLabel || '运行中…');
      return play(playing, false).then(function () {
        btnEl.disabled = false;
        busy = false;
      });
    }

    btnEl.addEventListener('click', runNext);

    if (cfg.hist && $(cfg.hist)) {
      $(cfg.hist).querySelectorAll('.rh-row').forEach(function (row) {
        row.addEventListener('click', function () {
          if (busy) return;
          busy = true;
          btnEl.disabled = true;
          play(+row.getAttribute('data-run'), true).then(function () {
            busy = false;
            btnEl.disabled = false;
          });
        });
      });
    }

    reset();
    labelBtn(cfg.scen[0].btn);
    return { run: runNext, reset: reset };
  }

  /* ============================================================
     DEMO 01 · 竞品价格监控日报
     剧本 0 正常 / 1 竞品 B 超时重试 / 2 无变动跳过
     ============================================================ */
  var SCAN1_13 = '#priceTable tbody tr[data-row="1"], #priceTable tbody tr[data-row="3"]';

  var D1_SCEN = [
    {
      key: 0, name: '正常日', btn: '模拟 B 超时', clock: '本次运行 3.8s', state: 'DONE',
      steps: [
        { n: 'a1', st: 'run', ms: 360, log: ['09:00:00', 'trigger', '定时任务触发 · cron 0 9 * * *'] },
        { w: 'w1', ms: 110 },
        { n: 'a1', st: 'done', sub: '已触发 09:00', ms: 50 },
        { n: 'a2', st: 'run', ms: 400, log: ['09:00:01', 'fetch', '抓取竞品 A 商品页 → 200 OK · 1.2s'] },
        { n: 'a2', st: 'done', sub: '8 条 · 1.2s', ms: 30 }, { w: 'w1', st: 'done', ms: 0 }, { w: 'w2', ms: 110 },
        { n: 'a3', st: 'run', ms: 340, log: ['09:00:02', 'parse', '解析价格字段 · 8 条记录'], scan: SCAN1_13 },
        { n: 'a3', st: 'done', sub: '8 条已解析', ms: 30 }, { w: 'w2', st: 'done', ms: 0 }, { w: 'w3', ms: 110 },
        { n: 'a4', st: 'run', ms: 360, log: ['09:00:02', 'fetch', '抓取竞品 B 商品页 → 200 OK · 0.9s'], scan: '#priceTable tbody tr[data-row="2"]' },
        { n: 'a4', st: 'done', sub: '6 条 · 0.9s', ms: 30 }, { w: 'w3', st: 'done', ms: 0 }, { w: 'w4', ms: 110 },
        { n: 'a5', st: 'run', ms: 340, log: ['09:00:03', 'parse', '解析价格字段 · 6 条记录'], scan: '#priceTable tbody tr[data-row="4"]' },
        { n: 'a5', st: 'done', sub: '6 条已解析', ms: 30 }, { w: 'w4', st: 'done', ms: 0 }, { w: 'w5', ms: 110 },
        { n: 'a6', st: 'run', ms: 400, log: ['09:00:03', 'clean', '对齐 SKU · 去重 4 条 · 合并 14 → 10'] },
        { n: 'a6', st: 'done', sub: '10 SKU', ms: 30 }, { w: 'w5', st: 'done', ms: 0 }, { w: 'w6', ms: 130 },
        { n: 'a7', st: 'run', ms: 400, log: ['09:00:03', 'diff', '判定变动 ≥ ¥5 → 3 条命中 / 10 SKU'] },
        { n: 'a7', st: 'done', sub: '是 → 3 条', ms: 30 }, { w: 'w6', st: 'done', ms: 0 }, { w: 'w7', ms: 120 },
        { n: 'a8', st: 'run', ms: 560, log: ['09:00:04', 'ai', '生成日报 · 引用 3 处变动 · 0.6s'] },
        { n: 'a8', st: 'done', sub: '已生成', ms: 30 }, { w: 'w7', st: 'done', ms: 0 }, { w: 'w8', ms: 120 },
        { n: 'a9', st: 'run', ms: 360, log: ['09:00:04', 'push', '日报已推送 · 企微群「运营小分队」'], res: 'normal' },
        { n: 'a9', st: 'done', sub: '已送达', ms: 30 }, { w: 'w8', st: 'done', ms: 0 }, { w: 'w9', ms: 120 },
        { n: 'a10', st: 'run', ms: 300, log: ['09:00:04', 'save', '写入执行记录 · run_' + TODAY_YMD + '_0900'] },
        { n: 'a10', st: 'done', sub: '已存档', ms: 30 }, { w: 'w9', st: 'done', ms: 0 }, { w: 'w13', ms: 150 }, { w: 'w13', st: 'done', ms: 0 },
        { n: 'end', st: 'done', sub: '3.8s · 人工 0 分', ms: 110, log: ['09:00:04', 'done', '完成 · 耗时 3.8s · 人工 0 分钟'] }
      ]
    },
    {
      key: 1, name: '超时重试', btn: '模拟无变动日', clock: '本次运行 6.2s · 重试 1 次', state: 'DONE',
      steps: [
        { n: 'a1', st: 'run', ms: 300, log: ['09:00:00', 'trigger', '定时任务触发 · cron 0 9 * * *'] },
        { w: 'w1', ms: 100 },
        { n: 'a1', st: 'done', sub: '已触发 09:00', ms: 40 },
        { n: 'a2', st: 'run', ms: 340, log: ['09:00:01', 'fetch', '抓取竞品 A 商品页 → 200 OK · 1.2s'] },
        { n: 'a2', st: 'done', sub: '8 条 · 1.2s', ms: 30 }, { w: 'w1', st: 'done', ms: 0 }, { w: 'w2', ms: 100 },
        { n: 'a3', st: 'run', ms: 320, log: ['09:00:02', 'parse', '解析价格字段 · 8 条记录'], scan: SCAN1_13 },
        { n: 'a3', st: 'done', sub: '8 条已解析', ms: 30 }, { w: 'w2', st: 'done', ms: 0 }, { w: 'w3', ms: 100 },
        { n: 'a4', st: 'run', ms: 480, sub: '请求中…', log: ['09:00:02', 'fetch', '抓取竞品 B 商品页 · 请求已发出'] },
        { n: 'a4', st: 'err', ms: 220, sub: '超时 8s', log: ['09:00:02', 'error', '竞品 B 响应超时 8s · TimeoutError'] },
        { w: 'w10', st: 'err', ms: 150 },
        { n: 'e1', st: 'err', ms: 620, log: ['09:00:02', 'retry', '进入错误分支 · 重试 1/3 · 退避 30s'] },
        { n: 'e1', st: 'run', sub: '重试 1/3 · 成功', ms: 260, log: ['09:00:02', 'retry', '重试 1/3 成功 · 200 OK · 2.4s'] },
        { n: 'a4', st: 'done', sub: '6 条 · 重试后', ms: 30 }, { w: 'w3', st: 'done', ms: 0 }, { w: 'w10', st: 'err', ms: 0 }, { w: 'w11', st: 'err', ms: 150 },
        { n: 'e1', st: 'err', sub: '重试 1/3 · 30s', ms: 0 },
        { n: 'a5', st: 'run', ms: 320, log: ['09:00:03', 'parse', '解析价格字段 · 6 条记录'], scan: '#priceTable tbody tr[data-row="2"]' },
        { n: 'a5', st: 'done', sub: '6 条已解析', ms: 30 }, { w: 'w11', st: 'err', ms: 0 }, { w: 'w5', ms: 100 },
        { n: 'a6', st: 'run', ms: 340, log: ['09:00:03', 'clean', '对齐 SKU · 去重 4 条 · 合并 14 → 10'] },
        { n: 'a6', st: 'done', sub: '10 SKU', ms: 30 }, { w: 'w5', st: 'done', ms: 0 }, { w: 'w6', ms: 110 },
        { n: 'a7', st: 'run', ms: 360, log: ['09:00:04', 'diff', '判定变动 ≥ ¥5 → 3 条命中 / 10 SKU'] },
        { n: 'a7', st: 'done', sub: '是 → 3 条', ms: 30 }, { w: 'w6', st: 'done', ms: 0 }, { w: 'w7', ms: 110 },
        { n: 'a8', st: 'run', ms: 520, log: ['09:00:04', 'ai', '生成日报 · 引用 3 处变动 · 0.6s'] },
        { n: 'a8', st: 'done', sub: '已生成', ms: 30 }, { w: 'w7', st: 'done', ms: 0 }, { w: 'w8', ms: 110 },
        { n: 'a9', st: 'run', ms: 320, log: ['09:00:04', 'push', '日报已推送 · 企微群「运营小分队」'], res: 'normal' },
        { n: 'a9', st: 'done', sub: '已送达', ms: 30 }, { w: 'w8', st: 'done', ms: 0 }, { w: 'w9', ms: 110 },
        { n: 'a10', st: 'run', ms: 280, log: ['09:00:04', 'save', '写入执行记录 · run_' + TODAY_YMD + '_0900 · 重试 1 次'] },
        { n: 'a10', st: 'done', sub: '已存档', ms: 30 }, { w: 'w9', st: 'done', ms: 0 }, { w: 'w13', ms: 130 }, { w: 'w13', st: 'done', ms: 0 },
        { n: 'end', st: 'done', sub: '6.2s · 重试 1 次', ms: 100, log: ['09:00:05', 'done', '完成 · 耗时 6.2s · 重试 1 次 · 人工 0 分钟'] }
      ]
    },
    {
      key: 2, name: '无变动跳过', btn: '再跑一遍（正常日）', clock: '本次运行 1.9s · 已跳过', state: 'SKIPPED',
      steps: [
        { n: 'a1', st: 'run', ms: 280, log: ['09:00:00', 'trigger', '定时任务触发 · cron 0 9 * * *'] },
        { w: 'w1', ms: 90 },
        { n: 'a1', st: 'done', sub: '已触发 09:00', ms: 30 },
        { n: 'a2', st: 'run', ms: 320, log: ['09:00:01', 'fetch', '抓取竞品 A 商品页 → 200 OK · 1.1s'] },
        { n: 'a2', st: 'done', sub: '8 条 · 1.1s', ms: 30 }, { w: 'w1', st: 'done', ms: 0 }, { w: 'w2', ms: 90 },
        { n: 'a3', st: 'run', ms: 300, log: ['09:00:01', 'parse', '解析价格字段 · 8 条记录'], scan: SCAN1_13 },
        { n: 'a3', st: 'done', sub: '8 条已解析', ms: 30 }, { w: 'w2', st: 'done', ms: 0 }, { w: 'w3', ms: 90 },
        { n: 'a4', st: 'run', ms: 300, log: ['09:00:02', 'fetch', '抓取竞品 B 商品页 → 200 OK · 0.8s'], scan: '#priceTable tbody tr[data-row="2"]' },
        { n: 'a4', st: 'done', sub: '6 条 · 0.8s', ms: 30 }, { w: 'w3', st: 'done', ms: 0 }, { w: 'w4', ms: 90 },
        { n: 'a5', st: 'run', ms: 300, log: ['09:00:02', 'parse', '解析价格字段 · 6 条记录'], scan: '#priceTable tbody tr[data-row="4"]' },
        { n: 'a5', st: 'done', sub: '6 条已解析', ms: 30 }, { w: 'w4', st: 'done', ms: 0 }, { w: 'w5', ms: 90 },
        { n: 'a6', st: 'run', ms: 320, log: ['09:00:02', 'clean', '对齐 SKU · 去重 4 条 · 合并 14 → 10'] },
        { n: 'a6', st: 'done', sub: '10 SKU', ms: 30 }, { w: 'w5', st: 'done', ms: 0 }, { w: 'w6', ms: 100 },
        { n: 'a7', st: 'run', ms: 360, log: ['09:00:02', 'diff', '判定变动 ≥ ¥5 → 0 条命中 / 4 SKU'] },
        { n: 'a7', st: 'done', sub: '否 → 0 条', ms: 30 }, { w: 'w6', st: 'done', ms: 0 }, { w: 'w12', st: 'skip', ms: 150 },
        { n: 's1', st: 'skip', ms: 480, log: ['09:00:02', 'skip', '全部持平（< ¥5）· 跳过推送'], res: 'silent' },
        { w: 'w14', st: 'skip', ms: 150 }, { w: 'w14', st: 'skip', ms: 0 },
        { n: 'end', st: 'done', sub: '1.9s · 未推送', ms: 110, log: ['09:00:02', 'done', '完成 · 耗时 1.9s · 未推送 · 0 条打扰'] }
      ]
    }
  ];

  /* ============================================================
     DEMO 02 · 表单自动回复
     剧本 0 正常回复 / 1 命中重复线索
     ============================================================ */
  var D2_SCEN = [
    {
      key: 0, name: '正常回复', btn: '模拟重复线索', clock: '2.7s · 已发送', state: 'DONE',
      steps: [
        { n: 'b1', st: 'run', ms: 320, log: [nowHMS(), 'trigger', '表单提交 · 官网咨询页 · webhook'] },
        { w: 'v1', ms: 100 },
        { n: 'b1', st: 'done', sub: '已接收', ms: 40 },
        { n: 'b2', st: 'run', ms: 300, log: [nowHMS(), 'guard', '校验通过 · 手机号 / 邮箱 / 必填项'], hook: 'fillForm' },
        { n: 'b2', st: 'done', sub: '3 项通过', ms: 40 }, { w: 'v1', st: 'done', ms: 0 }, { w: 'v2', ms: 100 },
        { n: 'b3', st: 'run', ms: 360, log: [nowHMS(), 'db', '线索库查重 · 命中 0 条'] },
        { n: 'b3', st: 'done', sub: '0 命中', ms: 40 }, { w: 'v2', st: 'done', ms: 0 }, { w: 'v3', ms: 100 },
        { n: 'b4', st: 'run', ms: 300, log: [nowHMS(), 'branch', 'IF 新线索 → 是'] },
        { n: 'b4', st: 'done', sub: '是 → 新线索', ms: 40 }, { w: 'v3', st: 'done', ms: 0 }, { w: 'v4', ms: 100 },
        { n: 'b5', st: 'run', ms: 640, log: [nowHMS(), 'ai', '生成回复 · 引用报价单 #' + TODAY_YMD + ' · 0.6s'] },
        { n: 'b5', st: 'done', sub: '引用 3 行', ms: 40 }, { w: 'v4', st: 'done', ms: 0 }, { w: 'v5', ms: 100 },
        { n: 'b6', st: 'run', ms: 360, res: 'normal', hook: 'typeMail', log: [nowHMS(), 'send', '邮件已发送 · wang***@qq.com'] },
        { n: 'b6', st: 'done', sub: '1 封已发', ms: 40 }, { w: 'v5', st: 'done', ms: 0 }, { w: 'v6', ms: 110 },
        { n: 'b7', st: 'run', ms: 340, log: [nowHMS(), 'notify', '企微通知你 · 客户 3 秒内收到回复'] },
        { n: 'b7', st: 'done', sub: '已通知', ms: 40 }, { w: 'v6', st: 'done', ms: 0 }, { w: 'v7', ms: 100 },
        { n: 'b8', st: 'run', ms: 300, log: [nowHMS(), 'db', '写入 CRM · LEAD-' + TODAY_YMD.slice(4) + '-0412'], hook: 'fillStore' },
        { n: 'b8', st: 'done', sub: '已入库', ms: 40 }, { w: 'v7', st: 'done', ms: 0 }, { w: 'v8', ms: 100 },
        { n: 'b9', st: 'run', ms: 280, log: [nowHMS(), 'tag', '标记待跟进 · 负责人：你'] },
        { n: 'b9', st: 'done', sub: '待跟进', ms: 40 }, { w: 'v8', st: 'done', ms: 0 }, { w: 'v9', ms: 100 },
        { n: 'b10', st: 'run', ms: 260, log: [nowHMS(), 'save', '记录耗时 · 2.7s'] },
        { n: 'b10', st: 'done', sub: '2.7s', ms: 40 }, { w: 'v9', st: 'done', ms: 0 }, { w: 'v11', ms: 130 }, { w: 'v11', st: 'done', ms: 0 },
        { n: 'end', st: 'done', sub: '2.7s · 人工 0 分', ms: 110, log: [nowHMS(), 'done', '完成 · 耗时 2.7s · 人工平均 4 小时'] }
      ]
    },
    {
      key: 1, name: '重复线索', btn: '再跑一遍（正常）', clock: '0.9s · 已合并', state: 'SKIPPED',
      steps: [
        { n: 'b1', st: 'run', ms: 280, log: [nowHMS(), 'trigger', '表单提交 · 官网咨询页 · webhook'] },
        { w: 'v1', ms: 90 },
        { n: 'b1', st: 'done', sub: '已接收', ms: 30 },
        { n: 'b2', st: 'run', ms: 280, log: [nowHMS(), 'guard', '校验通过 · 手机号 / 邮箱 / 必填项'], hook: 'fillForm' },
        { n: 'b2', st: 'done', sub: '3 项通过', ms: 30 }, { w: 'v1', st: 'done', ms: 0 }, { w: 'v2', ms: 90 },
        { n: 'b3', st: 'run', ms: 340, log: [nowHMS(), 'db', '线索库查重 · 命中 1 条（3 天前同一手机号）'] },
        { n: 'b3', st: 'done', sub: '1 命中', ms: 30 }, { w: 'v2', st: 'done', ms: 0 }, { w: 'v3', ms: 90 },
        { n: 'b4', st: 'run', ms: 280, log: [nowHMS(), 'branch', 'IF 新线索 → 否'] },
        { n: 'b4', st: 'done', sub: '否 → 重复', ms: 30 }, { w: 'v3', st: 'done', ms: 0 }, { w: 'v10', st: 'skip', ms: 140 },
        { n: 'd1', st: 'skip', ms: 400, log: [nowHMS(), 'skip', '合并到已有线索 · 不再重复回复'], res: 'silent', hook: 'mergeStore' },
        { w: 'v12', st: 'skip', ms: 150 }, { w: 'v12', st: 'skip', ms: 0 },
        { n: 'end', st: 'done', sub: '0.9s · 已合并', ms: 110, log: [nowHMS(), 'done', '完成 · 未发邮件 · 已合并到 3 天前的线索'] }
      ]
    }
  ];

  /* ============================================================
     剧本 hook（表单填充 / 线索入库 / 合并）
     ============================================================ */
  HOOKS.fillForm = function () {
    var set = function (id, v) {
      var el = $(id);
      if (!el) return;
      el.textContent = v;
      el.classList.remove('filled');
      void el.offsetWidth;
      el.classList.add('filled');
    };
    set('fName', '王女士');
    set('fPhone', '138****6621');
    set('fMsg', '想咨询便携榨汁杯的批发价，500 个起批是什么价？');
    set('fTime', nowHMS());
    set('mailTo', 'wang***@qq.com');
  };
  HOOKS.fillStore = function () {
    var ls = $('leadStore'); if (ls) ls.classList.add('is-filled');
    var id = $('lsId'); if (id) id.textContent = 'LEAD-' + TODAY_YMD.slice(4) + '-0412';
  };
  HOOKS.mergeStore = function () {
    var ls = $('leadStore'); if (ls) ls.classList.remove('is-filled');
    var id = $('lsId'); if (id) id.textContent = '已合并 · 3 天前';
  };

  /* 邮件正文：内容必须逐条对得上左面板的「AI 依据 · 引用报价单」，
     买家最怕的就是 AI 随口报价——正文里的每个数字都要能在报价单里找到出处 */
  var MAIL_TEXT = [
    '王女士，您好：',
    '',
    '感谢咨询便携榨汁杯批发。按您问的 500 个起批，报价如下：',
    '· 500 个：¥89 / 个（含基础包装）',
    '· 1,000 个以上：¥82 / 个',
    '· 样品：免费寄送，顺丰到付，3 个工作日出货',
    '',
    '如果数量还能再定，我可以按 1,000 档重新算一次总价。要不要先寄一个样品给您确认手感？',
    '—— 报价来自《便携榨汁杯批发报价单 #' + TODAY_YMD + '》'
  ].join('\n');

  /* 逐字打出来：发送那一刻正文是"正在生成"的，比直接贴一段成品更像真的在跑 */
  HOOKS.typeMail = function () {
    var box = $('mailBody');
    if (!box || box.dataset.typing === '1') return;
    box.dataset.typing = '1';
    box.textContent = '';
    var cur = document.createElement('span');
    cur.className = 'cursor';
    box.appendChild(cur);
    var i = 0;
    (function tick() {
      if (i >= MAIL_TEXT.length) {
        box.textContent = MAIL_TEXT;
        box.dataset.typing = '0';
        return;
      }
      i = Math.min(MAIL_TEXT.length, i + 3);
      box.textContent = MAIL_TEXT.slice(0, i);
      box.appendChild(cur);
      setTimeout(tick, 16);
    })();
  };

  /* ============================================================
     接线
     ============================================================ */
  var demo1 = null, demo2 = null;

  if ($('canvas-d1')) {
    demo1 = makeDemo({
      key: 'd1', btn: 'runBtn1', log: 'clog1', state: 'cstate1', clock: 'clock1',
      hist: 'hist1', scen: D1_SCEN,
      resultIds: ['chatCard1', 'silent1', 'empty1'], resultMap: { normal: 'chatCard1', silent: 'silent1' }, empty: 'empty1',
      speedup: 'speedup1',
      scanRows: ['#priceTable tbody tr'],
      idleClock: '未运行'
    });
  }

  if ($('canvas-d2')) {
    demo2 = makeDemo({
      key: 'd2', btn: 'runBtn2', log: 'clog2', state: 'cstate2', clock: 'replyClock',
      hist: 'hist2', scen: D2_SCEN,
      resultIds: ['mailCard', 'silent2', 'empty2'], resultMap: { normal: 'mailCard', silent: 'silent2' }, empty: 'empty2',
      speedup: 'speedup',
      idleClock: '未发送',
      onReset: function () {
        var ls = $('leadStore'); if (ls) ls.classList.remove('is-filled');
        var id = $('lsId'); if (id) id.textContent = '—';
        ['fName', 'fPhone', 'fMsg', 'fTime', 'mailTo'].forEach(function (x) {
          var e = $(x); if (e) e.textContent = '—';
        });
        var mb = $('mailBody'); if (mb) { mb.innerHTML = ''; mb.dataset.typing = '0'; }
        var fc = $('formClock'); if (fc) fc.textContent = '等待提交';
      },
      onStart: function () {
        var fc = $('formClock'); if (fc) fc.textContent = '已提交';
      }
    });
  }

  /* AI 依据开关（demo2 左面板） */
  (function () {
    var sw = $('gateSwitch');
    if (!sw) return;
    sw.addEventListener('click', function () {
      sw.classList.toggle('is-on');
      var on = sw.classList.contains('is-on');
      sw.setAttribute('aria-checked', on ? 'true' : 'false');
      var note = $('gateNote');
      if (note) note.textContent = on ? '已开启 · 大额询价先转人工，AI 不直接回价' : '已关闭 · AI 会直接回复，请自行承担价格风险';
    });
  })();

  fitCanvases();
  window.addEventListener('resize', function () {
    clearTimeout(window.__cnvT);
    window.__cnvT = setTimeout(fitCanvases, 120);
  });

  /* ---------- 滚动进入视口自动跑一次场景 0 ---------- */
  var noAuto = /[?&]noauto/.test(location.search);
  var sections = [];
  if ($('demo1') && demo1) sections.push({ id: 'demo1', fn: demo1.run });
  if ($('demo2') && demo2) sections.push({ id: 'demo2', fn: demo2.run });
  var ran = {};
  if (sections.length && 'IntersectionObserver' in window && !noAuto) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var s = sections.filter(function (x) { return x.id === en.target.id; })[0];
        if (s && !ran[s.id]) { ran[s.id] = true; s.fn(); }
      });
    }, { threshold: 0.25 });
    sections.forEach(function (s) { io.observe($(s.id)); });
  }
})();

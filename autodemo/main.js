/* 自动档 demo 交互：两条工作流的运行动画
   每个 demo：节点依次点亮 → 连线数据包流动 → 结果卡出现 → 执行日志流式输出
   滚动进入视口自动执行一次
   兼容三种页面：合集页（index.html，两个 demo 都在）、单页 demo1.html / demo2.html
   ?noauto 参数禁用滚动自动执行（验证/截图脚本用）
*/
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); }
  function $(id) { return document.getElementById(id); }
  function nowHMS() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /* 日志行：ts + 分级标签 + 内容 */
  function logLine(box, ts, level, text) {
    var dim = box.querySelector('.log-dim');
    if (dim) dim.remove();
    var line = document.createElement('div');
    line.className = 'log-line' + (level === 'done' ? ' log-final' : '');
    line.innerHTML = '<span class="ts">' + ts + '</span><span class="lv lv-' + level + '">' + level + '</span>' + text;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
    return line;
  }

  var PLAY_SVG = '<svg viewBox="0 0 24 24" class="rb-ic"><path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11.2-7.2c.6-.4.6-1.4 0-1.8L8.6 3.9c-.7-.4-1.6.1-1.6.9z"/></svg>';
  var SPIN_SVG = '<svg viewBox="0 0 24 24" class="rb-ic"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="40 20"/></svg>';

  /* ============ DEMO 01 · 竞品价格监控日报 ============ */
  function wireDemo1() {
    var runBtn1 = $('runBtn1'), pipe1 = $('pipe1'), busy1 = false;

    function resetDemo1() {
      pipe1.querySelectorAll('.node').forEach(function (n) { n.classList.remove('is-run', 'is-done'); });
      pipe1.querySelectorAll('.wire').forEach(function (w) { w.classList.remove('flow'); });
      pipe1.querySelectorAll('.n-read').forEach(function (r) { r.textContent = '待命'; });
      document.querySelectorAll('#priceTable tbody tr').forEach(function (r) { r.classList.remove('scanned'); });
      $('chatCard1').style.display = 'none';
      $('empty1').style.display = '';
      $('clog1').innerHTML = '<div class="log-line log-dim">等待运行 · 点击下方按钮或滚动到此处自动执行</div>';
      $('cstate1').textContent = 'IDLE';
      $('cstate1').className = 'console-state';
      $('clock1').textContent = '未运行';
    }

    async function runDemo1() {
      if (busy1) return;
      busy1 = true;
      runBtn1.disabled = true;
      runBtn1.innerHTML = SPIN_SVG + '运行中…';
      resetDemo1();
      var clog = $('clog1');
      $('cstate1').textContent = 'RUNNING';
      $('cstate1').className = 'console-state is-run';
      $('clock1').textContent = '运行中…';

      var nodes = pipe1.querySelectorAll('.node');
      var wires = pipe1.querySelectorAll('.wire');
      var reads = pipe1.querySelectorAll('.n-read');
      var rows = document.querySelectorAll('#priceTable tbody tr');

      await sleep(300);
      nodes[0].classList.add('is-run');
      logLine(clog, '09:00:00', 'trigger', '定时任务触发 · cron 0 9 * * *');
      await sleep(700);
      nodes[0].classList.replace('is-run', 'is-done');
      reads[0].textContent = '已触发';
      wires[0].classList.add('flow');

      await sleep(250);
      nodes[1].classList.add('is-run');
      logLine(clog, '09:00:01', 'fetch', '抓取竞品 A 商品页 → 200 OK · 1.2s');
      await sleep(650);
      rows[0].classList.add('scanned');
      logLine(clog, '09:00:02', 'fetch', '抓取竞品 B 商品页 → 200 OK · 0.9s');
      await sleep(650);
      rows[1].classList.add('scanned');
      logLine(clog, '09:00:02', 'fetch', '解析价格字段 · 8 条记录');
      await sleep(500);
      rows[2].classList.add('scanned');
      await sleep(260);
      rows[3].classList.add('scanned');
      await sleep(350);
      nodes[1].classList.replace('is-run', 'is-done');
      reads[1].textContent = '8 条';
      wires[1].classList.add('flow');

      await sleep(250);
      nodes[2].classList.add('is-run');
      logLine(clog, '09:00:03', 'clean', '对齐 SKU · 去重 2 条 · 补全缺失字段');
      await sleep(750);
      nodes[2].classList.replace('is-run', 'is-done');
      reads[2].textContent = '4 SKU';
      wires[2].classList.add('flow');
      logLine(clog, '09:00:03', 'diff', '检出 3 处价格变动 · 1 涨 2 降');

      await sleep(300);
      nodes[3].classList.add('is-run');
      await sleep(450);
      $('empty1').style.display = 'none';
      $('chatCard1').style.display = '';
      logLine(clog, '09:00:04', 'push', '日报已推送 · 企微群「运营小分队」');
      await sleep(800);
      nodes[3].classList.replace('is-run', 'is-done');
      reads[3].textContent = '已推送';
      logLine(clog, '09:00:04', 'done', '完成 · 耗时 3.8s · 人工 0 分钟');

      $('cstate1').textContent = 'DONE';
      $('cstate1').className = 'console-state is-done';
      $('clock1').textContent = '本次运行 3.8s';
      runBtn1.innerHTML = PLAY_SVG + '再跑一遍';
      runBtn1.disabled = false;
      busy1 = false;
    }
    runBtn1.addEventListener('click', runDemo1);
    return runDemo1;
  }

  /* ============ DEMO 02 · 表单自动回复 ============ */
  function wireDemo2() {
    var runBtn2 = $('runBtn2'), pipe2 = $('pipe2'), busy2 = false;

    var REPLY =
      '王女士您好！\n' +
      '\n' +
      '收到您的咨询。便携榨汁杯 500 个起批的批发价是 ¥89/个（含基础包装），1,000 个以上可到 ¥82/个。\n' +
      '\n' +
      '样品可以免费寄送，顺丰到付；确认样式后 3 个工作日内出货。\n' +
      '\n' +
      '需要的话，我把完整报价单和色卡发给您。\n' +
      '\n' +
      '——您的 shop 团队';

    function resetDemo2() {
      pipe2.querySelectorAll('.node').forEach(function (n) { n.classList.remove('is-run', 'is-done'); });
      pipe2.querySelectorAll('.wire').forEach(function (w) { w.classList.remove('flow'); });
      pipe2.querySelectorAll('.n-read').forEach(function (r) { r.textContent = '待命'; });
      ['fName', 'fPhone', 'fMsg', 'fTime', 'mailTo'].forEach(function (id) { $(id).textContent = '—'; });
      $('mailBody').innerHTML = '';
      $('mailCard').style.display = 'none';
      $('empty2').style.display = '';
      $('speedup').style.display = 'none';
      $('clog2').innerHTML = '<div class="log-line log-dim">等待运行 · 点击下方按钮或滚动到此处自动执行</div>';
      $('cstate2').textContent = 'IDLE';
      $('cstate2').className = 'console-state';
      $('formClock').textContent = '等待提交';
      $('replyClock').textContent = '未发送';
    }

    function fill(el, text) {
      el.textContent = text;
      el.classList.remove('filled');
      void el.offsetWidth;
      el.classList.add('filled');
    }

    async function typeMail() {
      var box = $('mailBody');
      box.innerHTML = '';
      var cur = document.createElement('span');
      cur.className = 'cursor';
      box.appendChild(cur);
      for (var i = 0; i < REPLY.length; i++) {
        var ch = REPLY[i];
        if (ch === '\n') { cur.insertAdjacentHTML('beforebegin', '<br>'); }
        else { cur.insertAdjacentText('beforebegin', ch); }
        if (i % 3 === 0) await sleep(16);
      }
      await sleep(400);
      cur.remove();
    }

    async function runDemo2() {
      if (busy2) return;
      busy2 = true;
      runBtn2.disabled = true;
      runBtn2.innerHTML = SPIN_SVG + '处理中…';
      resetDemo2();
      var clog = $('clog2');
      $('cstate2').textContent = 'RUNNING';
      $('cstate2').className = 'console-state is-run';

      var nodes = pipe2.querySelectorAll('.node');
      var wires = pipe2.querySelectorAll('.wire');
      var reads = pipe2.querySelectorAll('.n-read');

      await sleep(300);
      $('formClock').textContent = '已提交';
      fill($('fName'), '王女士');
      logLine(clog, nowHMS(), 'trigger', '表单提交 · 官网咨询页 · webhook');
      await sleep(330);
      fill($('fPhone'), '138****6621');
      await sleep(330);
      fill($('fMsg'), '想咨询便携榨汁杯的批发价，500 个起批是什么价？');
      await sleep(330);
      fill($('fTime'), nowHMS());
      fill($('mailTo'), 'wang***@qq.com');
      await sleep(250);
      nodes[0].classList.add('is-run');
      await sleep(550);
      nodes[0].classList.replace('is-run', 'is-done');
      reads[0].textContent = '已接收';
      wires[0].classList.add('flow');

      await sleep(250);
      nodes[1].classList.add('is-run');
      logLine(clog, nowHMS(), 'clean', '手机号脱敏 · 补全渠道字段 · 写入线索库');
      await sleep(800);
      nodes[1].classList.replace('is-run', 'is-done');
      reads[1].textContent = '已入库';
      wires[1].classList.add('flow');

      await sleep(250);
      nodes[2].classList.add('is-run');
      logLine(clog, nowHMS(), 'ai', '生成回复 · 引用报价单 #2026-1018 · 0.6s');
      await sleep(850);
      nodes[2].classList.replace('is-run', 'is-done');
      reads[2].textContent = '0.6s';
      wires[2].classList.add('flow');

      await sleep(250);
      nodes[3].classList.add('is-run');
      $('empty2').style.display = 'none';
      $('mailCard').style.display = '';
      $('replyClock').textContent = '发送中…';
      await sleep(350);
      await typeMail();
      logLine(clog, nowHMS(), 'send', '邮件已发送 · 王女士 138****6621');
      await sleep(450);
      nodes[3].classList.replace('is-run', 'is-done');
      reads[3].textContent = '已发送';
      logLine(clog, nowHMS(), 'notify', '企微通知你跟进 · 线索已标「待跟进」');
      await sleep(400);
      logLine(clog, nowHMS(), 'done', '完成 · 耗时 2.7s · 人工平均 4 小时');

      $('cstate2').textContent = 'DONE';
      $('cstate2').className = 'console-state is-done';
      $('replyClock').textContent = '已发送';
      $('speedup').style.display = '';
      $('spAuto').textContent = '3 分钟';
      runBtn2.innerHTML = PLAY_SVG + '再模拟一次';
      runBtn2.disabled = false;
      busy2 = false;
    }
    runBtn2.addEventListener('click', runDemo2);
    return runDemo2;
  }

  /* ---------- 按页面存在的元素接线 ---------- */
  var run1 = $('runBtn1') ? wireDemo1() : null;
  var run2 = $('runBtn2') ? wireDemo2() : null;

  /* ---------- 滚动进入视口自动执行一次 ---------- */
  var noAuto = /[?&]noauto/.test(location.search);
  var sections = [];
  if ($('demo1')) sections.push({ id: 'demo1', run: run1 });
  if ($('demo2')) sections.push({ id: 'demo2', run: run2 });
  var ran = {};
  if (sections.length && 'IntersectionObserver' in window && !noAuto) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var s = sections.filter(function (x) { return x.id === en.target.id; })[0];
        if (s && s.run && !ran[s.id]) { ran[s.id] = true; s.run(); }
      });
    }, { threshold: 0.3 });
    sections.forEach(function (s) { io.observe($(s.id)); });
  }
})();

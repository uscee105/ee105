// Draws the grades page from window.EE105_GRADES (assets/grades/grades-data.js). No libraries.
(function () {
  var G = window.EE105_GRADES, NS = 'http://www.w3.org/2000/svg', ACCENT = '#7253ed', INK = '#27262b';
  if (!G) return;
  function el(name, attrs, parent, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function html(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  var f1 = function (v) { return v.toFixed(1); };
  function fill(id, text) { var e = document.getElementById(id); if (e) e.textContent = text; }

  // ---- frame shared by both charts: axis, percent ticks, mean and median lines, tooltip
  function frame(box, W, H, label, stat) {
    box.textContent = '';
    var m = { t: 18, r: 6, b: 22, l: 6 };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': label }, box);
    var x = function (v) { return m.l + (W - m.l - m.r) * v / 100; };
    el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: '#d1d0d4' }, svg);
    [0, 20, 40, 60, 80, 100].forEach(function (t) {
      el('text', { x: x(t), y: H - 6, 'text-anchor': t === 0 ? 'start' : t === 100 ? 'end' : 'middle' }, svg, t + '%');
    });
    var tip = html('div', 'gr-tip', box); tip.hidden = true;
    function place(px, text) {
      tip.hidden = false; tip.textContent = text;
      var scale = box.clientWidth / W, tw = tip.offsetWidth;
      tip.style.left = Math.max(0, Math.min(box.clientWidth - tw, px * scale - tw / 2)) + 'px';
    }
    function lines() {
      [['mean', null], ['median', '5 4']].forEach(function (k) {
        var a = { x1: x(stat[k[0]]), x2: x(stat[k[0]]), y1: 2, y2: H - m.b, stroke: INK, 'stroke-width': 2 };
        if (k[1]) a['stroke-dasharray'] = k[1];
        el('line', a, svg);
      });
    }
    return { svg: svg, x: x, m: m, tip: tip, place: place, lines: lines };
  }

  function histogram(box, p) {
    var W = 420, H = 230, f = frame(box, W, H, 'Histogram of ' + p.name + ' percentage scores in 10-point bands, ' + p.n + ' students', p);
    var top = Math.max.apply(null, p.bins) || 1, base = H - f.m.b;
    var y = function (c) { return base - (base - f.m.t) * c / top; };
    p.bins.forEach(function (c, i) {
      el('rect', { x: f.x(i * 10) + 1, width: f.x(i * 10 + 10) - f.x(i * 10) - 2, y: y(c), height: base - y(c), rx: 2, fill: ACCENT }, f.svg);
      if (c) el('text', { class: 'gr-count', x: f.x(i * 10 + 5), y: y(c) - 4, 'text-anchor': 'middle' }, f.svg, c);
    });
    f.lines();
    p.bins.forEach(function (c, i) {
      var hit = el('rect', { x: f.x(i * 10), width: f.x(i * 10 + 10) - f.x(i * 10), y: 0, height: base, fill: 'transparent' }, f.svg);
      var show = function () { f.place(f.x(i * 10 + 5), i * 10 + '–' + (i * 10 + 10) + '%: ' + c + (c === 1 ? ' student' : ' students')); };
      hit.addEventListener('pointerenter', show); hit.addEventListener('pointerdown', show);
      hit.addEventListener('pointerleave', function () { f.tip.hidden = true; });
    });
  }

  function curve(box, o) {
    var W = 860, H = 260, f = frame(box, W, H, 'Smoothed distribution of overall percentage scores, ' + o.students + ' students', o);
    var base = H - f.m.b, y = function (d) { return base - (base - f.m.t) * d; };
    var pts = o.curve.map(function (d, g) { return f.x(g) + ',' + y(d); });
    el('polygon', { points: f.x(0) + ',' + base + ' ' + pts.join(' ') + ' ' + f.x(100) + ',' + base, fill: ACCENT, 'fill-opacity': 0.25 }, f.svg);
    el('polyline', { points: pts.join(' '), fill: 'none', stroke: ACCENT, 'stroke-width': 2, 'stroke-linejoin': 'round' }, f.svg);
    f.lines();
    var dot = el('circle', { r: 4, fill: ACCENT, visibility: 'hidden' }, f.svg);
    var hit = el('rect', { x: f.m.l, width: W - f.m.l - f.m.r, y: 0, height: base, fill: 'transparent' }, f.svg);
    var move = function (ev) {
      var r = f.svg.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width;
      var s = Math.max(0, Math.min(100, Math.round((px - f.m.l) * 100 / (W - f.m.l - f.m.r))));
      dot.setAttribute('visibility', 'visible'); dot.setAttribute('cx', f.x(s)); dot.setAttribute('cy', y(o.curve[s]));
      f.place(f.x(s), s + '%: ' + o.atOrBelow[s] + ' of ' + o.students + ' students at or below');
    };
    ['pointerenter', 'pointermove', 'pointerdown'].forEach(function (n) { hit.addEventListener(n, move); });
    hit.addEventListener('pointerleave', function () { f.tip.hidden = true; dot.setAttribute('visibility', 'hidden'); });
  }

  // ---- fill the page
  var o = G.overall;
  fill('gr-students', o.students); fill('gr-mean', f1(o.mean)); fill('gr-median', f1(o.median));
  fill('gr-hardest', G.hardest.name); fill('gr-hardest-mean', f1(G.hardest.mean));
  fill('gr-easiest', G.easiest.name); fill('gr-easiest-mean', f1(G.easiest.mean));
  fill('gr-roster', o.roster); fill('gr-noscores', o.noScores);
  var tiles = document.getElementById('gr-tiles');
  [['Students', o.students], ['Mean (%)', f1(o.mean)], ['Median (%)', f1(o.median)], ['Std deviation', f1(o.sd)], ['Lowest (%)', f1(o.min)], ['Highest (%)', f1(o.max)]]
    .forEach(function (t) { var d = html('div', '', tiles); html('div', 'gr-tile-label', d, t[0]); html('div', 'gr-tile-value', d, t[1]); });
  curve(document.getElementById('gr-overall'), o);

  var grid = document.getElementById('gr-grid'), body = document.getElementById('gr-rows');
  G.papers.forEach(function (p) {
    var card = html('div', 'gr-card', grid);
    html('h3', '', card, p.name);
    var s = html('p', 'gr-stats', card);
    [['n', p.n], ['mean', f1(p.mean)], ['median', f1(p.median)], ['SD', f1(p.sd)]].forEach(function (k) {
      var sp = html('span', '', s, k[0] + ' '); html('b', '', sp, k[1]);
    });
    histogram(html('div', 'gr-chart', card), p);
    var tr = html('tr', '', body);
    [p.name, p.n, f1(p.mean), f1(p.median), f1(p.sd), f1(p.min), f1(p.max)].forEach(function (v) { html('td', '', tr, v); });
  });
})();

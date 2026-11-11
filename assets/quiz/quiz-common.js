/* EE 105 course portal: shared helpers for the student page and the admin page. */
(function () {
  'use strict';
  var C = window.EE105_QUIZ || {};
  var Q = (window.QZ = {});
  Q.cfg = C;
  Q.tz = C.timezone || 'America/Los_Angeles';

  // ------------------------------------------------------------- storage (never throws)
  function wrap(kind) {
    return {
      get: function (k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window[kind].setItem(k, v); } catch (e) { /* private mode */ } },
      del: function (k) { try { window[kind].removeItem(k); } catch (e) { /* private mode */ } },
    };
  }
  Q.session = wrap('sessionStorage');
  Q.local = wrap('localStorage');

  Q.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // ------------------------------------------------------------- server calls
  Q.configured = function () {
    return !!C.api && /^https?:\/\//.test(C.api);
  };

  /**
   * POST {action, ...data} to the Apps Script web app. The body is sent as text/plain (no
   * Content-Type header is set), which keeps it a "simple" CORS request: Apps Script cannot
   * answer a CORS preflight. Retries network failures and "busy" replies `tries` times.
   */
  Q.api = function (action, data, opts) {
    var tries = (opts && opts.tries) || 1;
    var body = JSON.stringify(Object.assign({}, data || {}, { action: action }));
    var attempt = 0;
    function once() {
      attempt++;
      return fetch(C.api, { method: 'POST', body: body, redirect: 'follow', cache: 'no-store', credentials: 'omit' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (out) {
          if (!out || !out.ok) {
            var e = new Error((out && out.error) || 'Something went wrong.');
            e.user = true;
            e.code = (out && out.code) || '';
            throw e;
          }
          return out;
        })
        .catch(function (e) {
          var retry = !e.user || e.code === 'busy' || e.code === 'server';
          if (retry && attempt < tries) {
            return Q.sleep(800 * attempt + Math.random() * 800).then(once);
          }
          if (!e.user) {
            var n = new Error('Could not reach the quiz server. Check your connection and try again.');
            n.network = true;
            throw n;
          }
          throw e;
        });
    }
    if (!Q.configured()) {
      return Promise.reject(Object.assign(new Error('The quiz server address is not set yet (assets/quiz/config.js).'),
                                          { user: true, code: 'config' }));
    }
    return once();
  };

  // ------------------------------------------------------------- text rendering
  Q.esc = function (s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function renderTex(tex, display) {
    if (window.katex) {
      try {
        return window.katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'htmlAndMathml' });
      } catch (e) { /* fall through */ }
    }
    return '<span class="qz-tex">' + Q.esc(display ? '$$' + tex + '$$' : '$' + tex + '$') + '</span>';
  }

  function inline(s) {
    return s.split(/(`[^`\n]+`)/g).map(function (part, i) {
      if (i % 2) return '<code>' + Q.esc(part.slice(1, -1)) + '</code>';
      return Q.esc(part).replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');
    }).join('');
  }

  /**
   * Small markdown subset used by the question text: $inline$ and $$display$$ math (KaTeX),
   * `code`, **bold**, line breaks, blank-line paragraphs, ``` fenced code blocks, and runs of
   * lines that are each one `code` span (shown as a code block).
   */
  Q.md = function (src) {
    var math = [];
    var s = String(src === undefined || src === null ? '' : src).replace(/\r/g, '');
    var fences = [];
    s = s.replace(/```[A-Za-z0-9_+-]*\n?([\s\S]*?)\n?```/g, function (_, code) {
      fences.push(code);
      return '\n\u0001F' + (fences.length - 1) + '\u0001\n';
    });
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, function (_, t) { math.push([t, true]); return '\u0002' + (math.length - 1) + '\u0002'; });
    s = s.replace(/\$([^$\n]+?)\$/g, function (_, t) { math.push([t, false]); return '\u0002' + (math.length - 1) + '\u0002'; });
    var blocks = [], para = [], code = [];
    function flushPara() { if (para.length) { blocks.push('<p>' + para.join('<br>') + '</p>'); para = []; } }
    function flushCode() { if (code.length) { blocks.push('<pre class="qz-code"><code>' + code.join('\n') + '</code></pre>'); code = []; } }
    s.split('\n').forEach(function (line) {
      var f = /^\u0001F(\d+)\u0001$/.exec(line.trim());
      if (f) { flushPara(); flushCode(); blocks.push('<pre class="qz-code"><code>' + Q.esc(fences[+f[1]]) + '</code></pre>'); return; }
      var c = /^\s*`([^`]*)`\s*$/.exec(line);
      if (c) { flushPara(); code.push(Q.esc(c[1])); return; }
      flushCode();
      if (!line.trim()) { flushPara(); return; }
      para.push(inline(line));
    });
    flushPara();
    flushCode();
    var html = blocks.join('');
    // math placeholders inside code blocks go back to plain $...$ text
    html = html.replace(/(<pre class="qz-code"><code>)([\s\S]*?)(<\/code><\/pre>)/g, function (_, a, body, b) {
      return a + body.replace(/\u0002(\d+)\u0002/g, function (_, k) {
        var m = math[+k];
        return Q.esc(m[1] ? '$$' + m[0] + '$$' : '$' + m[0] + '$');
      }) + b;
    });
    html = html.replace(/<code>([^<]*?)<\/code>/g, function (all, body) {
      return '<code>' + body.replace(/\u0002(\d+)\u0002/g, function (_, k) {
        var m = math[+k];
        return Q.esc(m[1] ? '$$' + m[0] + '$$' : '$' + m[0] + '$');
      }) + '</code>';
    });
    return html.replace(/\u0002(\d+)\u0002/g, function (_, k) { return renderTex(math[+k][0], math[+k][1]); });
  };

  /** Same as md() but without block elements (for choices, units and table cells). */
  Q.mdInline = function (src) {
    var html = Q.md(src);
    if (/^<p>[\s\S]*<\/p>$/.test(html) && html.indexOf('</p><p>') < 0) return html.slice(3, -4);
    return html;
  };

  /** Parse an SVG string and drop anything that could run code. Returns a node or null. */
  Q.svgNode = function (svg) {
    if (!svg || !/<svg[\s>]/i.test(svg)) return null;
    try {
      var doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      var el = doc.documentElement;
      if (!el || el.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
      Array.prototype.slice.call(el.querySelectorAll('script, foreignObject')).forEach(function (n) { n.remove(); });
      Array.prototype.slice.call(el.querySelectorAll('*')).concat([el]).forEach(function (n) {
        Array.prototype.slice.call(n.attributes).forEach(function (a) {
          if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) n.removeAttribute(a.name);
        });
      });
      el.removeAttribute('width');
      el.removeAttribute('height');
      el.setAttribute('role', 'img');
      return document.importNode(el, true);
    } catch (e) {
      return null;
    }
  };

  // ------------------------------------------------------------- numbers (same rules as the server)
  Q.parseNumber = function (s, units) {
    if (s === null || s === undefined) return NaN;
    var t = String(s).trim();
    var u = String(units || '').trim();
    if (u && u !== 'none' && t.length > u.length && t.slice(-u.length) === u) t = t.slice(0, -u.length);  // "2.2 V"
    t = t.trim().replace(/%$/, '').replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '');
    t = t.replace(/^([-+]?(?:\d+\.?\d*|\.\d+))(?:\*|x|×)10\^\(?([-+]?\d+)\)?$/i, '$1e$2');
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
    return Number(t);
  };

  Q.fmtNum = function (x) {
    if (!isFinite(x)) return '';
    var a = Math.abs(x);
    if (a !== 0 && (a < 1e-3 || a >= 1e6)) return x.toExponential(4).replace(/\.?0+e/, 'e');
    return String(Number(x.toPrecision(6)));
  };

  // ------------------------------------------------------------- dates and times
  Q.fmtDate = function (iso, withDay) {
    if (!iso) return '';
    var d = new Date(iso);
    var o = { timeZone: Q.tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
    if (withDay !== false) o.weekday = 'short';
    try { return new Intl.DateTimeFormat('en-US', o).format(d); } catch (e) { return d.toLocaleString(); }
  };

  Q.fmtClock = function (ms) {
    ms = Math.max(0, ms);
    var s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return (h ? h + ':' + pad(m) : m) + ':' + pad(r);
  };

  // ------------------------------------------------------------- small UI helpers
  Q.$ = function (sel, el) { return (el || document).querySelector(sel); };
  Q.$$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  /** A modal dialog. buttons: [{label, value, primary}]. Resolves with the value of the button. */
  Q.dialog = function (title, html, buttons) {
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'qz qz-modal-wrap';
      wrap.innerHTML = '<div class="qz-modal" role="dialog" aria-modal="true" aria-labelledby="qz-modal-title">' +
        '<h2 id="qz-modal-title">' + Q.esc(title) + '</h2><div class="qz-modal-body">' + html + '</div>' +
        '<div class="qz-modal-buttons"></div></div>';
      var bar = wrap.querySelector('.qz-modal-buttons');
      (buttons || [{ label: 'OK', value: true, primary: true }]).forEach(function (b) {
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'btn ' + (b.primary ? 'btn-primary' : 'btn-outline');
        el.textContent = b.label;
        el.addEventListener('click', function () { wrap.remove(); resolve(b.value); });
        bar.appendChild(el);
      });
      wrap.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { wrap.remove(); resolve(null); }
      });
      document.body.appendChild(wrap);
      var first = bar.querySelector('.btn-primary') || bar.querySelector('button');
      if (first) first.focus();
    });
  };

  // ------------------------------------------------------------- review of a graded attempt
  /** Review of one attempt (also used by the admin page). */
  Q.reviewHtml = function (a, showNo) {
    return '<div class="qz-attempt"><h3>' + (showNo ? 'Attempt ' + a.attempt_no + ': ' : 'Score: ') + a.score + ' / ' + a.max +
      (a.submitted_at ? ' <span class="qz-fine">(submitted ' + Q.esc(Q.fmtDate(a.submitted_at)) +
        (a.status === 'auto' ? ', time ran out' : '') + ')</span>' : '') + '</h3>' +
      a.questions.map(function (q) {
        var ans = '';
        if (q.type === 'numeric') {
          ans = '<div class="qz-rev-row"><span class="qz-rev-label">Your answer</span><span>' +
            (q.given === null || q.given === undefined ? '<i>blank</i>' : Q.esc(q.given) + (q.units ? ' ' + Q.mdInline(q.units) : '')) + '</span></div>' +
            '<div class="qz-rev-row"><span class="qz-rev-label">Correct answer</span><span>' +
            Q.esc(Q.fmtNum(Number(q.correct_answer))) + (q.units ? ' ' + Q.mdInline(q.units) : '') + '</span></div>';
        } else if (q.choices) {
          var given = q.given === null || q.given === undefined ? [] : (Array.isArray(q.given) ? q.given : [q.given]).map(Number);
          var right = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
          ans = '<ul class="qz-rev-choices">' + q.choices.map(function (c, k) {
            var mine = given.indexOf(k) >= 0, ok = right.indexOf(k) >= 0;
            return '<li class="' + (ok ? 'qz-right' : '') + (mine && !ok ? ' qz-wrong' : '') + '">' +
              '<span class="qz-letter">' + String.fromCharCode(65 + k) + '</span><span class="qz-choice-text">' + Q.mdInline(c) + '</span>' +
              (mine ? '<span class="qz-tag">your answer</span>' : '') + (ok ? '<span class="qz-tag qz-tag-ok">correct</span>' : '') + '</li>';
          }).join('') + '</ul>' + (given.length ? '' : '<p class="qz-fine">You left this blank.</p>');
        }
        return '<section class="qz-card qz-q qz-rev ' + (q.is_correct ? 'qz-rev-ok' : 'qz-rev-bad') + '" data-n="' + q.n + '">' +
          '<div class="qz-qhead">Question ' + q.n + '<span class="qz-mark">' + (q.is_correct ? 'Correct' : 'Incorrect') + '</span></div>' +
          '<div class="qz-prompt">' + Q.md(q.prompt) + '</div>' + (q.figure_svg ? '<div class="qz-fig"></div>' : '') + ans +
          (q.explanation ? '<div class="qz-expl"><b>Explanation.</b> ' + Q.mdInline(q.explanation) + '</div>' : '') + '</section>';
      }).join('') + '</div>';
  };

  Q.reviewFigures = function (box, attempts) {
    Q.$$('.qz-attempt', box).forEach(function (el, i) {
      attempts[i].questions.forEach(function (q) {
        if (!q.figure_svg) return;
        var slot = Q.$('.qz-q[data-n="' + q.n + '"] .qz-fig', el);
        var node = Q.svgNode(q.figure_svg);
        if (slot && node) slot.appendChild(node);
      });
    });
  };

  Q.confirm = function (title, html, yes, no) {
    return Q.dialog(title, html, [{ label: no || 'Cancel', value: false }, { label: yes || 'OK', value: true, primary: true }]);
  };
})();

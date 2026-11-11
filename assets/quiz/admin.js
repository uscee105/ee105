/* EE 105 course portal: admin page (quiz settings, scores, attempts, questions, roster). */
(function () {
  'use strict';
  var Q = window.QZ;
  var root = document.getElementById('quiz-admin');
  if (!root || !Q) return;
  root.classList.add('qz', 'qz-admin');

  var KEY = 'ee105q_admin';
  var A = { token: Q.session.get(KEY), tab: Q.session.get(KEY + '_tab') || 'quizzes', overview: null, roster: null,
            scores: null, upload: null, showPins: false };
  var TABS = [['quizzes', 'Quizzes'], ['labs', 'Labs'], ['scores', 'Scores'], ['attempts', 'Quiz attempts'], ['questions', 'Questions'],
              ['roster', 'Roster']];
  if ((window.EE105_QUIZ || {}).labsOnly) {       // labs-only term: no quiz tabs
    TABS = TABS.filter(function (t) { return ['labs', 'scores', 'roster'].indexOf(t[0]) >= 0; });
    if (['labs', 'scores', 'roster'].indexOf(A.tab) < 0) A.tab = 'labs';
  }

  function call(action, data, tries) {
    return Q.api(action, Object.assign({ token: A.token }, data || {}), { tries: tries || 2 }).catch(function (e) {
      if (e.code === 'auth') { logout(e.message); }
      throw e;
    });
  }

  function msg(text, kind) {
    var box = Q.$('#qa-msg', root);
    if (!box) return;
    box.innerHTML = text ? '<div class="qz-alert ' + (kind === 'error' ? 'qz-alert-error' : 'qz-alert-ok') + '" role="status">' +
      Q.esc(text) + '</div>' : '';
    if (text) box.scrollIntoView({ block: 'nearest' });
  }

  function fail(e) { msg(e.message || String(e), 'error'); }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Working...'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }

  function logout(text) {
    Q.session.del(KEY);
    A.token = null;
    showLogin(text);
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function csvCell(v) {
    var s = String(v === undefined || v === null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(rows) {
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false;
    text = String(text).replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',' || c === '\t') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell);
    if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row);
    return rows;
  }

  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function toLocalInput(iso) {
    if (!iso) return '';
    var d = new Date(iso), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function fromLocalInput(v) {
    return v ? new Date(v).toISOString() : '';
  }

  function localZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'local time'; }
  }

  // =========================================================== login and frame
  function showLogin(text) {
    root.innerHTML = '<div class="qz-card qz-login"><h2>Admin log in</h2>' +
      (text ? '<div class="qz-alert">' + Q.esc(text) + '</div>' : '') +
      '<form id="qa-login"><label for="qa-pw">Admin password</label>' +
      '<input id="qa-pw" type="password" autocomplete="current-password" required>' +
      '<button class="btn btn-primary" type="submit">Log in</button><div id="qa-msg"></div></form>' +
      '<p class="qz-fine">The password is set in the Google Sheet: EE 105 Quiz &gt; Set admin password.</p></div>';
    if (!Q.configured()) msg('The quiz server address is not set yet (assets/quiz/config.js).', 'error');
    Q.$('#qa-pw', root).focus();
    Q.$('#qa-login', root).addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = Q.$('#qa-login button', root);
      busy(btn, true, 'Logging in...');
      Q.api('admin_login', { password: Q.$('#qa-pw', root).value }, { tries: 2 }).then(function (r) {
        A.token = r.token;
        Q.session.set(KEY, r.token);
        showFrame();
      }).catch(function (err) { busy(btn, false); fail(err); });
    });
  }

  function showFrame() {
    root.innerHTML = '<div class="qz-userbar"><span>Logged in as course staff</span>' +
      '<button type="button" class="btn btn-outline qz-small" id="qa-logout">Log out</button></div>' +
      '<nav class="qa-tabs" role="tablist">' + TABS.map(function (t) {
        return '<button type="button" role="tab" class="qa-tab" data-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</nav><div id="qa-msg"></div><div id="qa-body"></div>';
    Q.$('#qa-logout', root).addEventListener('click', function () { logout(); });
    Q.$$('.qa-tab', root).forEach(function (b) {
      b.addEventListener('click', function () { openTab(b.getAttribute('data-tab')); });
    });
    openTab(A.tab);
  }

  function openTab(tab) {
    A.tab = tab;
    Q.session.set(KEY + '_tab', tab);
    Q.$$('.qa-tab', root).forEach(function (b) {
      var on = b.getAttribute('data-tab') === tab;
      b.classList.toggle('qa-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    msg('');
    var body = Q.$('#qa-body', root);
    body.innerHTML = '<p class="qz-loading">Loading...</p>';
    ({ quizzes: tabQuizzes, labs: tabLabs, scores: tabScores, attempts: tabAttempts, questions: tabQuestions, roster: tabRoster })[tab](body);
  }

  function quizOptions(selected, withAll) {
    var qs = (A.overview && A.overview.quizzes) || [];
    return (withAll ? '<option value="">All quizzes</option>' : '') + qs.map(function (q) {
      return '<option value="' + q.quiz_id + '"' + (String(selected) === String(q.quiz_id) ? ' selected' : '') + '>' +
        Q.esc(q.title) + '</option>';
    }).join('');
  }

  function ensureOverview() {
    return A.overview ? Promise.resolve(A.overview) : call('admin_overview').then(function (r) { A.overview = r; return r; });
  }

  // =========================================================== quizzes tab
  var STATE = { open: 'Open now', upcoming: 'Scheduled', closed: 'Closed', unavailable: 'Not published' };

  function tabQuizzes(body) {
    A.overview = null;
    ensureOverview().then(function (r) {
      var warn = [];
      if (!r.roster_size) warn.push('The roster is empty. Add students on the Roster tab.');
      else if (r.pins_missing) warn.push(r.pins_missing + ' student(s) have no PIN yet (Roster tab).');
      r.quizzes.forEach(function (q) { if (!q.bank_size) warn.push(q.title + ' has no questions (Questions tab).'); });
      body.innerHTML = (warn.length ? '<div class="qz-alert">' + warn.map(Q.esc).join('<br>') + '</div>' : '') +
        '<p class="qz-fine">Times are in your computer\'s time zone (' + Q.esc(localZone()) + '); students see them in ' +
        Q.esc(Q.tz) + '. Students see a quiz when <b>Published</b> is on, and can take it between its open and close times.</p>' +
        r.quizzes.map(function (q) {
          return '<div class="qz-card qa-quiz" data-quiz="' + q.quiz_id + '">' +
            '<div class="qz-quiz-head"><input class="qa-title" value="' + Q.esc(q.title) + '" aria-label="Title">' +
              '<span class="label ' + (q.state === 'open' ? 'label-green' : q.state === 'upcoming' ? 'label-blue' : 'qz-label-grey') + '">' +
              (q.state === 'unavailable' ? (q.published ? 'No dates set' : 'Not published') : STATE[q.state]) + '</span></div>' +
            '<p class="qz-fine">' + q.bank_size + ' questions in the bank. ' + q.submitted + ' submitted, ' + q.in_progress + ' in progress.</p>' +
            '<div class="qa-fields">' +
            '<label class="qa-check"><input type="checkbox" class="qa-pub"' + (q.published ? ' checked' : '') + '> Published</label>' +
            '<label>Opens<input type="datetime-local" class="qa-open" value="' + toLocalInput(q.open_at) + '"></label>' +
            '<label>Closes<input type="datetime-local" class="qa-close" value="' + toLocalInput(q.close_at) + '"></label>' +
            '<label>Questions per attempt<input type="number" min="1" max="' + Math.max(1, q.bank_size || 600) + '" class="qa-n" value="' + q.n_questions + '"></label>' +
            '<label>Timer (minutes)<input type="number" min="1" max="600" class="qa-min" value="' + q.time_limit_min + '"></label>' +
            '<label>Attempts allowed<input type="number" min="1" max="20" class="qa-att" value="' + q.attempts + '"></label>' +
            '<label>Answers shown<select class="qa-review">' +
              [['after_close', 'after the quiz closes'], ['after_submit', 'right after submitting'], ['never', 'never']].map(function (o) {
                return '<option value="' + o[0] + '"' + (q.review === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
              }).join('') + '</select></label>' +
            '<label class="qa-wide">Only for these student IDs (leave empty for everyone)<input type="text" class="qa-students" value="' + Q.esc(q.students || '') + '" placeholder="for a make-up quiz: 1234567890, 2345678901"></label></div>' +
            '<div class="qz-buttons"><button type="button" class="btn btn-primary qz-small qa-save">Save</button>' +
              '<button type="button" class="btn btn-outline qz-small qa-regrade">Re-grade</button></div></div>';
        }).join('') +
        '<div class="qz-buttons"><button type="button" class="btn btn-outline" id="qa-finalize">Grade expired attempts now</button></div>' +
        '<p class="qz-fine">Attempts whose timer ran out are graded automatically every 5 minutes with the answers saved at that time. ' +
        'Re-grade applies the current answer key to every submitted attempt of that quiz (use it after fixing a question).</p>';
      Q.$$('.qa-save', body).forEach(function (b) { b.addEventListener('click', function () { saveQuiz(b.closest('.qa-quiz'), b); }); });
      Q.$$('.qa-regrade', body).forEach(function (b) { b.addEventListener('click', function () { regrade(b.closest('.qa-quiz'), b); }); });
      Q.$('#qa-finalize', body).addEventListener('click', function (e) {
        var b = e.currentTarget;
        busy(b, true);
        call('admin_finalize').then(function (x) { busy(b, false); msg(x.graded + ' expired attempt(s) graded.'); })
          .catch(function (err) { busy(b, false); fail(err); });
      });
    }).catch(function (e) { body.innerHTML = ''; fail(e); });
  }

  function saveQuiz(tr, btn) {
    var id = tr.getAttribute('data-quiz');
    var f = {
      title: Q.$('.qa-title', tr).value.trim(),
      published: Q.$('.qa-pub', tr).checked,
      open_at: fromLocalInput(Q.$('.qa-open', tr).value),
      close_at: fromLocalInput(Q.$('.qa-close', tr).value),
      n_questions: Number(Q.$('.qa-n', tr).value),
      time_limit_min: Number(Q.$('.qa-min', tr).value),
      attempts: Number(Q.$('.qa-att', tr).value),
      review: Q.$('.qa-review', tr).value,
      students: Q.$('.qa-students', tr).value,
    };
    if (f.published && (!f.open_at || !f.close_at)) return msg('Set the open and close times before publishing.', 'error');
    busy(btn, true, 'Saving...');
    call('admin_update_quiz', { quiz_id: id, fields: f }).then(function () {
      msg('Saved ' + f.title + '.');
      tabQuizzes(Q.$('#qa-body', root));
      setTimeout(function () { msg('Saved ' + f.title + '.'); }, 50);
    }).catch(function (e) { busy(btn, false); fail(e); });
  }

  function regrade(tr, btn) {
    var id = tr.getAttribute('data-quiz'), title = Q.$('.qa-title', tr).value;
    Q.confirm('Re-grade ' + title + '?', '<p>Every submitted attempt of this quiz will be graded again with the current answer key ' +
      'in the Questions sheet. Scores can go up or down.</p>', 'Re-grade').then(function (ok) {
      if (!ok) return;
      busy(btn, true);
      call('admin_regrade', { quiz_id: id }, 1).then(function (r) {
        busy(btn, false);
        msg('Re-graded ' + r.regraded + ' attempt(s); ' + r.changed + ' score(s) changed.');
      }).catch(function (e) { busy(btn, false); fail(e); });
    });
  }

  // =========================================================== scores tab
  function tabScores(body) {
    call('admin_scores').then(function (r) {
      A.scores = r;
      var cols = r.quizzes.map(function (q) { return { kind: 'quiz', id: q.quiz_id, head: 'Q' + q.quiz_id, title: q.title }; })
        .concat((r.labs || []).map(function (l) { return { kind: 'lab', id: l.lab_id, head: 'L' + l.lab_id, title: l.title }; }));
      var cell = function (s, c) { return c.kind === 'quiz' ? s.scores[c.id] : (s.labs || {})[c.id]; };
      var stats = cols.map(function (c) {
        var vals = r.students.map(function (s) { return cell(s, c); }).filter(Boolean)
          .map(function (x) { return x.max ? x.score / x.max : 0; }).sort(function (a, b) { return a - b; });
        var mean = vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
        var med = vals.length ? (vals.length % 2 ? vals[(vals.length - 1) / 2] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2) : null;
        return { n: vals.length, mean: mean, med: med };
      });
      var pct = function (x) { return x === null ? '' : Math.round(x * 100) + '%'; };
      var tot = function (s, kind) {
        var t = 0, m = 0;
        cols.forEach(function (c) { var x = cell(s, c); if (c.kind === kind && x) { t += x.score; m += x.max; } });
        return m ? (Math.round(t * 100) / 100) + '/' + m : '';
      };
      body.innerHTML = '<div class="qa-tools"><input type="search" id="qa-filter" placeholder="Filter by name, ID or section" aria-label="Filter">' +
        '<button type="button" class="btn btn-outline qz-small" id="qa-csv">Download CSV</button></div>' +
        '<p class="qz-fine">Q = quiz (best attempt), L = lab (best upload, after any late penalty). Blank means nothing submitted. ' +
        'The number in brackets is the number of attempts or uploads.</p>' +
        '<div class="qa-scroll"><table class="qa-table qa-scores"><thead><tr><th data-sort="name">Name</th><th data-sort="id">ID</th><th data-sort="section">Section</th>' +
        cols.map(function (c, i) { return '<th data-sort="c' + i + '" title="' + Q.esc(c.title) + '">' + Q.esc(c.head) + '</th>'; }).join('') +
        '<th data-sort="tq">Quizzes</th><th data-sort="tl">Labs</th></tr>' +
        '<tr class="qa-stats"><td colspan="3">Submitted / mean / median</td>' +
        stats.map(function (st) { return '<td>' + st.n + '<br>' + pct(st.mean) + '<br>' + pct(st.med) + '</td>'; }).join('') + '<td></td><td></td></tr></thead>' +
        '<tbody>' + r.students.map(function (s) {
          var cells = cols.map(function (c) {
            var x = cell(s, c);
            if (!x) return '<td class="qa-blank"></td>';
            var n = c.kind === 'quiz' ? x.attempts : x.uploads;
            return '<td>' + x.score + '/' + x.max + (n > 1 ? '<span class="qz-fine"> (' + n + ')</span>' : '') + '</td>';
          }).join('');
          return '<tr data-search="' + Q.esc((s.name + ' ' + s.student_id + ' ' + s.section).toLowerCase()) + '">' +
            '<td>' + Q.esc(s.name) + '</td><td>' + Q.esc(s.student_id) + '</td><td>' + Q.esc(s.section) + '</td>' + cells +
            '<td><b>' + tot(s, 'quiz') + '</b></td><td><b>' + tot(s, 'lab') + '</b></td></tr>';
        }).join('') + '</tbody></table></div>';
      Q.$('#qa-filter', body).addEventListener('input', function (e) {
        var t = e.target.value.trim().toLowerCase();
        Q.$$('.qa-scores tbody tr', body).forEach(function (tr) {
          tr.style.display = !t || tr.getAttribute('data-search').indexOf(t) >= 0 ? '' : 'none';
        });
      });
      Q.$('#qa-csv', body).addEventListener('click', function () {
        var head = ['student_id', 'name', 'email', 'section'];
        cols.forEach(function (c) { head.push(c.title + ' score', c.title + ' out of'); });
        var rows = [head].concat(r.students.map(function (s) {
          var row = [s.student_id, s.name, s.email, s.section];
          cols.forEach(function (c) { var x = cell(s, c); row.push(x ? x.score : '', x ? x.max : ''); });
          return row;
        }));
        download('ee105-scores-' + stamp() + '.csv', toCSV(rows));
      });
      sortable(Q.$('.qa-scores', body));
    }).catch(function (e) { body.innerHTML = ''; fail(e); });
  }

  // =========================================================== labs tab
  var LSTATE = { open: 'Open', late: 'Late period', upcoming: 'Scheduled', closed: 'Closed', unavailable: 'Not published' };

  function tabLabs(body) {
    call('admin_labs').then(function (r) {
      A.labs = r.labs;
      body.innerHTML = '<p class="qz-fine">Times are in your computer\'s time zone (' + Q.esc(localZone()) + '). Students upload the ' +
        '<code>labN.k_submission.json</code> file their notebook saves; it is graded at once and the best score counts. ' +
        'Uploads after the due time and before the late deadline lose the late penalty (0.2 = 20%).</p>' +
        r.labs.map(function (l) {
          return '<div class="qz-card qa-quiz qa-lab" data-lab="' + Q.esc(l.lab_id) + '">' +
            '<div class="qz-quiz-head"><input class="qa-title" value="' + Q.esc(l.title) + '" aria-label="Title">' +
            '<span class="label ' + (l.state === 'open' ? 'label-green' : l.state === 'late' ? 'label-yellow' : l.state === 'upcoming' ? 'label-blue' : 'qz-label-grey') + '">' +
            LSTATE[l.state] + '</span></div>' +
            '<p class="qz-fine">' + l.uploads + ' upload' + (l.uploads === 1 ? '' : 's') + ' from ' + l.submitters +
              ' student' + (l.submitters === 1 ? '' : 's') + '. ' +
              (l.needs_board ? 'Needs the demo board: a practice run from the simulator scores 0.' : 'No demo board needed.') +
              (l.graded ? '' : ' <b>No grader for this lab yet.</b>') + '</p>' +
            '<div class="qa-fields">' +
            '<label class="qa-check"><input type="checkbox" class="qa-pub"' + (l.published ? ' checked' : '') + '> Published</label>' +
            '<label>Opens<input type="datetime-local" class="qa-open" value="' + toLocalInput(l.open_at) + '"></label>' +
            '<label>Due<input type="datetime-local" class="qa-due" value="' + toLocalInput(l.due_at) + '"></label>' +
            '<label>Late uploads until (optional)<input type="datetime-local" class="qa-late" value="' + toLocalInput(l.late_until) + '"></label>' +
            '<label>Late penalty (fraction)<input type="number" step="0.05" min="0" max="1" class="qa-pen" value="' + l.late_penalty + '"></label>' +
            '<label>Uploads allowed<input type="number" min="1" max="50" class="qa-max" value="' + l.max_uploads + '"></label>' +
            '<label class="qa-wide">Only for these student IDs (leave empty for everyone)<input type="text" class="qa-students" value="' + Q.esc(l.students || '') + '"></label></div>' +
            '<div class="qz-buttons"><button type="button" class="btn btn-primary qz-small qa-lsave">Save</button>' +
            '<button type="button" class="btn btn-outline qz-small qa-lsubs">Uploads</button>' +
            '<button type="button" class="btn btn-outline qz-small qa-lregrade">Re-grade</button></div><div class="qa-lsublist"></div></div>';
        }).join('');
      Q.$$('.qa-lsave', body).forEach(function (b) { b.addEventListener('click', function () { saveLab(b.closest('.qa-lab'), b); }); });
      Q.$$('.qa-lsubs', body).forEach(function (b) { b.addEventListener('click', function () { labSubs(b.closest('.qa-lab')); }); });
      Q.$$('.qa-lregrade', body).forEach(function (b) {
        b.addEventListener('click', function () {
          var card = b.closest('.qa-lab'), id = card.getAttribute('data-lab');
          Q.confirm('Re-grade Lab ' + id + '?', '<p>Every stored upload of this lab is graded again with the current rules.</p>', 'Re-grade').then(function (ok) {
            if (!ok) return;
            busy(b, true);
            call('admin_regrade_lab', { lab_id: id }, 1).then(function (x) { busy(b, false); msg('Re-graded ' + x.regraded + ' upload(s); ' + x.changed + ' score(s) changed.'); })
              .catch(function (e) { busy(b, false); fail(e); });
          });
        });
      });
    }).catch(function (e) { body.innerHTML = ''; fail(e); });
  }

  function saveLab(card, btn) {
    var id = card.getAttribute('data-lab');
    var f = {
      title: Q.$('.qa-title', card).value.trim(), published: Q.$('.qa-pub', card).checked,
      open_at: fromLocalInput(Q.$('.qa-open', card).value), due_at: fromLocalInput(Q.$('.qa-due', card).value),
      late_until: fromLocalInput(Q.$('.qa-late', card).value), late_penalty: Number(Q.$('.qa-pen', card).value),
      max_uploads: Number(Q.$('.qa-max', card).value), students: Q.$('.qa-students', card).value,
    };
    if (f.published && !f.due_at) return msg('Set a due time before publishing the lab.', 'error');
    busy(btn, true, 'Saving...');
    call('admin_update_lab', { lab_id: id, fields: f }).then(function () {
      msg('Saved ' + f.title + '.');
      tabLabs(Q.$('#qa-body', root));
    }).catch(function (e) { busy(btn, false); fail(e); });
  }

  function labSubs(card) {
    var id = card.getAttribute('data-lab'), box = Q.$('.qa-lsublist', card);
    box.innerHTML = '<p class="qz-loading">Loading...</p>';
    call('admin_submissions', { lab_id: id }).then(function (r) {
      var list = r.submissions.sort(function (a, b) { return String(b.submitted_at).localeCompare(String(a.submitted_at)); });
      box.innerHTML = '<div class="qa-scroll"><table class="qa-table"><thead><tr><th>Name</th><th>ID</th><th>Uploaded</th><th>Score</th>' +
        '<th>Counted</th><th>Board</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (s) {
          return '<tr><td>' + Q.esc(s.name) + '</td><td>' + Q.esc(s.student_id) + '</td><td>' + Q.esc(Q.fmtDate(s.submitted_at, false)) +
            (s.late ? ' <span class="qz-fine">late</span>' : '') + '</td><td>' + s.score + '/' + s.max + '</td><td>' + s.counted + '</td>' +
            '<td>' + (s.simulated ? 'simulator' : Q.esc(s.device_id || '')) + '</td><td>' + Q.esc(s.status) +
            (s.same_file_as.length ? '<div class="qa-dup">same results as ' + Q.esc(s.same_file_as.join(', ')) + '</div>' : '') + '</td>' +
            '<td class="qa-actions"><button type="button" class="btn btn-outline qz-small" data-sview="' + Q.esc(s.sub_id) + '">View</button>' +
            (s.status !== 'reset' ? '<button type="button" class="btn btn-outline qz-small" data-sreset="' + Q.esc(s.sub_id) + '">Reset</button>' : '') +
            '</td></tr>';
        }).join('') + '</tbody></table></div><div class="qa-sdetail"></div>';
      Q.$$('[data-sview]', box).forEach(function (b) {
        b.addEventListener('click', function () {
          var d = Q.$('.qa-sdetail', box);
          d.innerHTML = '<p class="qz-loading">Loading...</p>';
          call('admin_submission', { sub_id: b.getAttribute('data-sview') }).then(function (x) {
            var pretty = x.file;
            try { pretty = JSON.stringify(JSON.parse(x.file), null, 1); } catch (e) { /* show as is */ }
            d.innerHTML = '<h4>' + Q.esc(x.name) + ' (' + Q.esc(x.student_id) + '), Lab ' + Q.esc(x.lab_id) + ': ' + x.score + '/' + x.max + '</h4>' +
              '<ul class="qz-feedback">' + x.items.map(function (it) {
                return '<li class="' + (it.ok ? 'qz-fb-ok' : 'qz-fb-bad') + '"><span class="qz-fb-mark">' + (it.ok ? '&#10003;' : '&#10007;') + '</span>' +
                  '<span class="qz-fb-rule">' + Q.esc(it.rule) + '</span><span class="qz-fb-pts">' + it.points + ' / ' + it.max + '</span>' +
                  (it.msg ? '<div class="qz-fb-msg">' + Q.esc(it.msg) + '</div>' : '') + '</li>';
              }).join('') + '</ul><p class="qz-fine">Uploaded file:</p><pre class="qa-json">' + Q.esc(pretty.slice(0, 60000)) + '</pre>';
          }).catch(function (e) { d.innerHTML = ''; fail(e); });
        });
      });
      Q.$$('[data-sreset]', box).forEach(function (b) {
        b.addEventListener('click', function () {
          Q.confirm('Reset this upload?', '<p>It stops counting, and the student gets the upload back.</p>', 'Reset').then(function (ok) {
            if (!ok) return;
            call('admin_reset_submission', { sub_id: b.getAttribute('data-sreset') }).then(function () { msg('Upload reset.'); labSubs(card); })
              .catch(function (e) { fail(e); });
          });
        });
      });
    }).catch(function (e) { box.innerHTML = ''; fail(e); });
  }

  function sortable(table) {
    Q.$$('th[data-sort]', table).forEach(function (th, col) {
      th.classList.add('qa-sortable');
      th.addEventListener('click', function () {
        var tbody = table.tBodies[0];
        var dir = th.dataset.dir === 'asc' ? -1 : 1;
        th.dataset.dir = dir === 1 ? 'asc' : 'desc';
        var rows = Array.prototype.slice.call(tbody.rows);
        rows.sort(function (a, b) {
          var x = a.cells[col].textContent.trim(), y = b.cells[col].textContent.trim();
          var nx = parseFloat(x), ny = parseFloat(y);
          if (x === '' && y !== '') return 1;
          if (y === '' && x !== '') return -1;
          if (!isNaN(nx) && !isNaN(ny)) return (nx - ny) * dir;
          return x.localeCompare(y) * dir;
        });
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
  }

  // =========================================================== attempts tab
  function tabAttempts(body) {
    ensureOverview().then(function () {
      body.innerHTML = '<div class="qa-tools"><select id="qa-aquiz" aria-label="Quiz">' + quizOptions(A.aquiz || '', true) + '</select>' +
        '<select id="qa-astatus" aria-label="Status"><option value="">Any status</option><option value="open">In progress</option>' +
        '<option value="submitted">Submitted</option><option value="auto">Time ran out</option><option value="reset">Reset</option></select>' +
        '<input type="search" id="qa-afilter" placeholder="Filter by name or ID" aria-label="Filter">' +
        '<button type="button" class="btn btn-outline qz-small" id="qa-areload">Reload</button></div>' +
        '<div id="qa-alist"><p class="qz-loading">Loading...</p></div><div id="qa-adetail"></div>';
      var load = function () {
        A.aquiz = Q.$('#qa-aquiz', body).value;
        Q.$('#qa-alist', body).innerHTML = '<p class="qz-loading">Loading...</p>';
        call('admin_attempts', { quiz_id: A.aquiz }).then(function (r) { A.attempts = r.attempts; drawAttempts(body); })
          .catch(function (e) { Q.$('#qa-alist', body).innerHTML = ''; fail(e); });
      };
      Q.$('#qa-aquiz', body).addEventListener('change', load);
      Q.$('#qa-astatus', body).addEventListener('change', function () { drawAttempts(body); });
      Q.$('#qa-afilter', body).addEventListener('input', function () { drawAttempts(body); });
      Q.$('#qa-areload', body).addEventListener('click', load);
      load();
    }).catch(function (e) { body.innerHTML = ''; fail(e); });
  }

  var STATUS = { open: 'In progress', submitted: 'Submitted', auto: 'Time ran out', reset: 'Reset', dup: 'Duplicate' };

  function drawAttempts(body) {
    var st = Q.$('#qa-astatus', body).value, t = Q.$('#qa-afilter', body).value.trim().toLowerCase();
    var titles = {};
    (A.overview.quizzes || []).forEach(function (q) { titles[q.quiz_id] = q.title; });
    var list = (A.attempts || []).filter(function (a) {
      if (a.status === 'dup') return false;
      if (st && a.status !== st) return false;
      return !t || (a.name + ' ' + a.student_id).toLowerCase().indexOf(t) >= 0;
    }).sort(function (a, b) { return String(b.started_at).localeCompare(String(a.started_at)); });
    Q.$('#qa-alist', body).innerHTML = '<p class="qz-fine">' + list.length + ' attempt(s)</p>' +
      '<div class="qa-scroll"><table class="qa-table"><thead><tr><th>Name</th><th>ID</th><th>Quiz</th><th>#</th><th>Started</th>' +
      '<th>Submitted</th><th>Status</th><th>Score</th><th></th></tr></thead><tbody>' +
      list.map(function (a) {
        return '<tr><td>' + Q.esc(a.name) + '</td><td>' + Q.esc(a.student_id) + '</td><td>' + Q.esc(titles[a.quiz_id] || a.quiz_id) + '</td>' +
          '<td>' + a.attempt_no + '</td><td>' + Q.esc(Q.fmtDate(a.started_at, false)) + '</td><td>' + Q.esc(Q.fmtDate(a.submitted_at, false)) + '</td>' +
          '<td>' + Q.esc(STATUS[a.status] || a.status) + '</td><td>' + (a.score === null ? '' : a.score + '/' + a.max) + '</td>' +
          '<td class="qa-actions"><button type="button" class="btn btn-outline qz-small" data-view="' + Q.esc(a.attempt_id) + '">View</button>' +
          (a.status !== 'reset' ? '<button type="button" class="btn btn-outline qz-small" data-reset="' + Q.esc(a.attempt_id) + '">Reset</button>' : '') +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';
    Q.$$('[data-view]', body).forEach(function (b) {
      b.addEventListener('click', function () {
        var box = Q.$('#qa-adetail', body);
        box.innerHTML = '<p class="qz-loading">Loading...</p>';
        call('admin_attempt', { attempt_id: b.getAttribute('data-view') }).then(function (r) {
          box.innerHTML = '<div class="qz-review-head"><h3>' + Q.esc(r.name) + ' (' + Q.esc(r.student_id) + '), ' +
            Q.esc(titles[r.quiz_id] || '') + '</h3><button type="button" class="btn btn-outline qz-small" id="qa-close-detail">Close</button></div>' +
            Q.reviewHtml(r, true);
          Q.reviewFigures(box, [r]);
          Q.$('#qa-close-detail', box).addEventListener('click', function () { box.innerHTML = ''; });
          box.scrollIntoView({ behavior: 'smooth' });
        }).catch(function (e) { box.innerHTML = ''; fail(e); });
      });
    });
    Q.$$('[data-reset]', body).forEach(function (b) {
      b.addEventListener('click', function () {
        Q.confirm('Reset this attempt?', '<p>The attempt no longer counts: its score is dropped and the student can start again ' +
          '(if the quiz is open). The record stays in the Attempts sheet with status "reset".</p>', 'Reset attempt').then(function (ok) {
          if (!ok) return;
          busy(b, true);
          call('admin_reset_attempt', { attempt_id: b.getAttribute('data-reset') }).then(function () {
            msg('Attempt reset.');
            Q.$('#qa-areload', body).click();
          }).catch(function (e) { busy(b, false); fail(e); });
        });
      });
    });
  }

  // =========================================================== questions tab
  function tabQuestions(body) {
    ensureOverview().then(function (ov) {
      body.innerHTML = '<h3>Question banks</h3><table class="qa-table qa-narrow"><thead><tr><th>Quiz</th><th>Questions</th></tr></thead><tbody>' +
        ov.quizzes.map(function (q) { return '<tr><td>' + Q.esc(q.title) + '</td><td>' + q.bank_size + '</td></tr>'; }).join('') +
        '</tbody></table>' +
        '<h3>Import questions</h3><p>Choose <code>questions.json</code> (made by <code>tools/build_bank.py</code>) or one bank file. ' +
        'The questions of each quiz in the file replace that quiz\'s current questions; other quizzes are not changed. ' +
        'Attempts already taken keep their question IDs, so import before a quiz opens, or re-grade afterwards.</p>' +
        '<input type="file" id="qa-qfile" accept=".json,application/json"><div id="qa-qprev"></div>' +
        '<h3 class="qa-gap">Item analysis</h3><div class="qa-tools"><select id="qa-iquiz" aria-label="Quiz">' + quizOptions(A.iquiz || 0, false) + '</select>' +
        '<button type="button" class="btn btn-outline qz-small" id="qa-iload">Show</button></div><div id="qa-items"></div>' +
        '<p class="qz-fine">To fix a question: edit its row in the Questions sheet, use EE 105 Quiz &gt; Reload questions, ' +
        'then Re-grade the quiz on the Quizzes tab.</p>';
      Q.$('#qa-qfile', body).addEventListener('change', function (e) { readBankFile(e.target.files[0], body); });
      Q.$('#qa-iload', body).addEventListener('click', function () { itemStats(body); });
    }).catch(function (e) { body.innerHTML = ''; fail(e); });
  }

  function readBankFile(file, body) {
    var box = Q.$('#qa-qprev', body);
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      var data;
      try { data = JSON.parse(fr.result); } catch (e) { box.innerHTML = '<div class="qz-alert qz-alert-error">Not a JSON file.</div>'; return; }
      var banks = Array.isArray(data.banks) ? data.banks : (data.questions ? [data] : []);
      if (!banks.length) { box.innerHTML = '<div class="qz-alert qz-alert-error">No quiz banks found in this file.</div>'; return; }
      var warn = [];
      banks.forEach(function (b) {
        var missing = (b.questions || []).filter(function (q) { return q.figure && !q.figure_svg; }).length;
        if (missing) warn.push('Quiz ' + b.quiz + ': ' + missing + ' figure(s) are file names only. Use questions.json from tools/build_bank.py so the figures are included.');
      });
      A.upload = banks;
      box.innerHTML = '<ul>' + banks.map(function (b) {
        var figs = (b.questions || []).filter(function (q) { return q.figure_svg; }).length;
        return '<li>' + Q.esc(b.title || 'Quiz ' + b.quiz) + ': ' + (b.questions || []).length + ' questions' + (figs ? ', ' + figs + ' figures' : '') + '</li>';
      }).join('') + '</ul>' + (warn.length ? '<div class="qz-alert">' + warn.map(Q.esc).join('<br>') + '</div>' : '') +
        '<button type="button" class="btn btn-primary" id="qa-qimport">Import ' + banks.length + ' quiz bank(s)</button>';
      Q.$('#qa-qimport', box).addEventListener('click', function (e) {
        var b = e.currentTarget;
        Q.confirm('Import questions?', '<p>This replaces the questions of ' + banks.map(function (x) { return 'Quiz ' + x.quiz; }).join(', ') + '.</p>', 'Import')
          .then(function (ok) {
            if (!ok) return;
            busy(b, true, 'Importing...');
            call('admin_import_questions', { banks: A.upload }, 1).then(function (r) {
              A.overview = null;
              msg('Imported ' + r.imported + ' questions (' + r.total + ' in the sheet now).');
              tabQuestions(Q.$('#qa-body', root));
              setTimeout(function () { msg('Imported ' + r.imported + ' questions (' + r.total + ' in the sheet now).'); }, 300);
            }).catch(function (err) { busy(b, false); fail(err); });
          });
      });
    };
    fr.readAsText(file);
  }

  function itemStats(body) {
    A.iquiz = Q.$('#qa-iquiz', body).value;
    var box = Q.$('#qa-items', body);
    box.innerHTML = '<p class="qz-loading">Loading...</p>';
    call('admin_item_stats', { quiz_id: A.iquiz }).then(function (r) {
      var items = r.items.slice().sort(function (a, b) {
        var pa = a.shown ? a.correct / a.shown : 2, pb = b.shown ? b.correct / b.shown : 2;
        return pa - pb || String(a.qid).localeCompare(String(b.qid));
      });
      box.innerHTML = '<p class="qz-fine">Sorted from hardest. Rows in red: shown at least 5 times and under 25% correct; check the answer key.</p>' +
        '<div class="qa-scroll"><table class="qa-table qa-items"><thead><tr><th>ID</th><th>Correct</th><th>Shown</th><th>Blank</th>' +
        '<th>Question</th><th>Type</th><th>Topic</th></tr></thead><tbody>' + items.map(function (it) {
          var p = it.shown ? it.correct / it.shown : null;
          var flag = it.shown >= 5 && p < 0.25;
          return '<tr class="' + (flag ? 'qa-flag' : '') + '"><td>' + Q.esc(it.qid) + '</td><td>' + (p === null ? '' : Math.round(p * 100) + '%') +
            '</td><td>' + it.shown + '</td><td>' + it.blank + '</td>' +
            '<td class="qa-prompt"><div class="qa-clamp">' + Q.md(it.prompt) + '</div></td><td>' + Q.esc(it.type) + '</td><td>' + Q.esc(it.topic) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }).catch(function (e) { box.innerHTML = ''; fail(e); });
  }

  // =========================================================== roster tab
  function tabRoster(body) {
    call('admin_roster').then(function (r) {
      A.roster = r.students;
      var missing = r.students.filter(function (s) { return !s.pin; }).length;
      body.innerHTML = '<div class="qa-tools">' +
        '<button type="button" class="btn btn-outline qz-small" id="qa-genpins">Generate missing PINs' + (missing ? ' (' + missing + ')' : '') + '</button>' +
        '<button type="button" class="btn btn-outline qz-small" id="qa-pinscsv">Download PIN list</button>' +
        '<button type="button" class="btn btn-outline qz-small" id="qa-emailpins">Email PINs</button>' +
        '<label class="qa-inline"><input type="checkbox" id="qa-showpins"' + (A.showPins ? ' checked' : '') + '> Show PINs</label></div>' +
        '<p class="qz-fine">' + r.students.length + ' student(s). A time factor of 1.5 gives that student 50% more time on every quiz ' +
        '(for accommodations). Edit names, emails, time factors or PINs directly in the Roster sheet if you prefer.</p>' +
        '<div class="qa-scroll"><table class="qa-table qa-roster"><thead><tr><th data-sort="id">ID</th><th data-sort="name">Name</th><th>Email</th>' +
        '<th data-sort="section">Section</th><th>Time factor</th><th>Active</th><th>PIN</th></tr></thead><tbody>' +
        r.students.map(function (s) {
          return '<tr><td>' + Q.esc(s.student_id) + '</td><td>' + Q.esc(s.name) + '</td><td>' + Q.esc(s.email) + '</td><td>' + Q.esc(s.section) +
            '</td><td>' + Q.esc(s.time_factor) + '</td><td>' + (s.active ? 'yes' : 'no') + '</td><td class="qa-pin">' +
            (s.pin ? (A.showPins ? Q.esc(s.pin) : '&bull;&bull;&bull;&bull;&bull;&bull;') : '<i>none</i>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<h3>Add or update students</h3><p>Paste CSV rows or choose a CSV file (for example the Brightspace class list export). ' +
        'The first row must be a header with columns like <code>student_id</code> (or <code>OrgDefinedId</code>), <code>name</code> ' +
        '(or <code>First Name</code> and <code>Last Name</code>), <code>email</code>, and optionally <code>section</code> and ' +
        '<code>time_factor</code>. Students already on the roster are updated and keep their PINs.</p>' +
        '<input type="file" id="qa-rfile" accept=".csv,text/csv,text/plain"><textarea id="qa-rtext" rows="6" placeholder="student_id,name,email,section&#10;1234567890,Trojan Tommy,ttrojan@usc.edu,30123"></textarea>' +
        '<div class="qz-buttons"><button type="button" class="btn btn-outline" id="qa-rcheck">Check</button></div><div id="qa-rprev"></div>';
      sortable(Q.$('.qa-roster', body));
      Q.$('#qa-showpins', body).addEventListener('change', function (e) { A.showPins = e.target.checked; tabRoster(body); });
      Q.$('#qa-genpins', body).addEventListener('click', function (e) {
        var b = e.currentTarget;
        busy(b, true);
        call('admin_generate_pins', {}, 1).then(function (x) { msg(x.generated + ' PIN(s) generated.'); tabRoster(body); })
          .catch(function (err) { busy(b, false); fail(err); });
      });
      Q.$('#qa-pinscsv', body).addEventListener('click', function () {
        download('ee105-quiz-pins-' + stamp() + '.csv', toCSV([['student_id', 'name', 'email', 'pin']].concat(
          A.roster.map(function (s) { return [s.student_id, s.name, s.email, s.pin]; }))));
      });
      Q.$('#qa-emailpins', body).addEventListener('click', function (e) {
        var b = e.currentTarget;
        var n = A.roster.filter(function (s) { return s.email && s.pin && s.active; }).length;
        Q.confirm('Email PINs?', '<p>Send ' + n + ' email(s) from your Google account, one per student, with their student ID, PIN and ' +
          'the portal link. Google allows about 100 emails a day on a personal account and 1,500 on a school account.</p>', 'Send emails')
          .then(function (ok) {
            if (!ok) return;
            busy(b, true, 'Sending...');
            call('admin_email_pins', {}, 1).then(function (x) {
              busy(b, false);
              msg('Sent ' + x.sent + ' email(s). Skipped ' + x.skipped.length + ' (no email or no PIN). Quota left today: ' + x.quota_left + '.');
            }).catch(function (err) { busy(b, false); fail(err); });
          });
      });
      Q.$('#qa-rfile', body).addEventListener('change', function (e) {
        var f = e.target.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () { Q.$('#qa-rtext', body).value = fr.result; Q.$('#qa-rcheck', body).click(); };
        fr.readAsText(f);
      });
      Q.$('#qa-rcheck', body).addEventListener('click', function () { checkRoster(body); });
    }).catch(function (e) { body.innerHTML = ''; fail(e); });
  }

  function rosterRows(text) {
    var rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Need a header row and at least one student.');
    var head = rows[0].map(function (h) { return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); });
    var find = function (re) { for (var i = 0; i < head.length; i++) if (re.test(head[i])) return i; return -1; };
    var col = {
      id: find(/^(student id|studentid|id|usc id|uscid|orgdefinedid|org defined id|sid|student number)$/),
      name: find(/^(name|full name|student name|student)$/),
      first: find(/^(first name|first|given name|preferred name)$/),
      last: find(/^(last name|last|family name|surname)$/),
      email: find(/e ?mail/),
      section: find(/^(section|sections|section id|lab section)$/),
      tf: find(/^(time factor|timefactor|extra time|time multiplier)$/),
    };
    if (col.id < 0) throw new Error('No student ID column found. Name it student_id (or OrgDefinedId).');
    var get = function (r, i) { return i >= 0 && r[i] !== undefined ? r[i].trim() : ''; };
    return rows.slice(1).map(function (r) {
      var name = get(r, col.name) || [get(r, col.first), get(r, col.last)].filter(Boolean).join(' ');
      return { student_id: get(r, col.id).replace(/^#/, ''), name: name, email: get(r, col.email),
               section: get(r, col.section), time_factor: get(r, col.tf) };
    }).filter(function (s) { return s.student_id; });
  }

  function checkRoster(body) {
    var box = Q.$('#qa-rprev', body);
    var list;
    try { list = rosterRows(Q.$('#qa-rtext', body).value); } catch (e) { box.innerHTML = '<div class="qz-alert qz-alert-error">' + Q.esc(e.message) + '</div>'; return; }
    var known = {};
    (A.roster || []).forEach(function (s) { known[s.student_id] = true; });
    var add = list.filter(function (s) { return !known[s.student_id]; }).length;
    box.innerHTML = '<p>' + list.length + ' row(s): ' + add + ' new, ' + (list.length - add) + ' already on the roster.</p>' +
      '<table class="qa-table qa-narrow"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Section</th></tr></thead><tbody>' +
      list.slice(0, 5).map(function (s) {
        return '<tr><td>' + Q.esc(s.student_id) + '</td><td>' + Q.esc(s.name) + '</td><td>' + Q.esc(s.email) + '</td><td>' + Q.esc(s.section) + '</td></tr>';
      }).join('') + (list.length > 5 ? '<tr><td colspan="4">...</td></tr>' : '') + '</tbody></table>' +
      '<button type="button" class="btn btn-primary" id="qa-rimport">Add / update ' + list.length + ' student(s)</button>';
    Q.$('#qa-rimport', box).addEventListener('click', function (e) {
      var b = e.currentTarget;
      busy(b, true, 'Saving...');
      call('admin_import_roster', { students: list }, 1).then(function (r) {
        msg('Roster: ' + r.added + ' added, ' + r.updated + ' updated. Next: Generate missing PINs, then Email PINs.');
        var keep = Q.$('#qa-msg', root).innerHTML;
        tabRoster(body);
        setTimeout(function () { Q.$('#qa-msg', root).innerHTML = keep; }, 50);
      }).catch(function (err) { busy(b, false); fail(err); });
    });
  }

  // =========================================================== go
  if (A.token) showFrame(); else showLogin();
})();

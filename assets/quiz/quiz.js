/* EE 105 course portal: student page (log in, take quizzes, submit labs, see scores). */
(function () {
  'use strict';
  var Q = window.QZ;
  var root = document.getElementById('quiz-app');
  if (!root || !Q) return;
  root.classList.add('qz');

  var K = { token: 'ee105q_token', name: 'ee105q_name', sid: 'ee105q_sid' };
  var S = { token: Q.session.get(K.token), name: Q.session.get(K.name), sid: Q.session.get(K.sid) };
  var run = null;          // the quiz being taken: {att, answers, version, savedVersion, ...}
  var timer = null;

  function setView(html) {
    stopRun();
    root.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function userBar() {
    return '<div class="qz-userbar"><span>Logged in as <b>' + Q.esc(S.name) + '</b> (' + Q.esc(S.sid) + ')</span>' +
      '<button type="button" class="btn btn-outline qz-small" data-act="logout">Log out</button></div>';
  }

  function errorBox(msg) {
    return '<div class="qz-alert qz-alert-error" role="alert">' + Q.esc(msg) + '</div>';
  }

  function handleError(e, where) {
    if (e && e.code === 'auth') return logout(e.message);
    var box = Q.$(where || '.qz-msg', root);
    if (box) box.innerHTML = errorBox(e.message || String(e));
    else root.insertAdjacentHTML('afterbegin', errorBox(e.message || String(e)));
  }

  function logout(msg) {
    Q.session.del(K.token); Q.session.del(K.name); Q.session.del(K.sid);
    S = {};
    showLogin(msg);
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act'), qid = b.getAttribute('data-quiz');
    if (act === 'logout') logout();
    else if (act === 'home') showDashboard();
    else if (act === 'start') confirmStart(qid, b);
    else if (act === 'resume') startQuiz(qid, b);
    else if (act === 'review') showReview(qid);
    else if (act === 'submit') confirmSubmit();
    else if (act === 'lab-upload') pickLabFile(b.getAttribute('data-lab'));
    else if (act === 'lab-history') showLabHistory(b.getAttribute('data-lab'));
    else if (act === 'goto') {
      var t = document.getElementById('qz-q-' + b.getAttribute('data-n'));
      if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); var f = t.querySelector('input'); if (f) f.focus({ preventScroll: true }); }
    }
  });

  // =========================================================== login
  function showLogin(msg) {
    setView(
      '<div class="qz-card qz-login">' +
      '<h2>Log in</h2>' +
      '<p>Use your USC student ID and the portal PIN that the course staff emailed to you.</p>' +
      (msg ? '<div class="qz-alert">' + Q.esc(msg) + '</div>' : '') +
      '<form id="qz-login-form" autocomplete="on">' +
      '<label for="qz-sid">Student ID</label><input id="qz-sid" name="username" inputmode="numeric" autocomplete="username" required>' +
      '<label for="qz-pin">PIN</label><input id="qz-pin" name="password" type="password" inputmode="numeric" autocomplete="current-password" required>' +
      '<button class="btn btn-primary" type="submit" id="qz-login-btn">Log in</button>' +
      '<div class="qz-msg" aria-live="polite"></div></form>' +
      '<p class="qz-fine">Lost your PIN? Ask the course staff on Piazza or by email.</p></div>');
    if (!Q.configured()) {
      Q.$('.qz-msg', root).innerHTML = errorBox('The course portal is not connected to its server yet. Please check back later.');
    }
    Q.$('#qz-sid', root).focus();
    Q.$('#qz-login-form', root).addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = Q.$('#qz-login-btn', root);
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      Q.$('.qz-msg', root).innerHTML = '';
      Q.api('login', { sid: Q.$('#qz-sid', root).value.trim(), pin: Q.$('#qz-pin', root).value.trim() }, { tries: 2 })
        .then(function (r) {
          S = { token: r.token, name: r.name, sid: r.sid };
          Q.session.set(K.token, r.token); Q.session.set(K.name, r.name); Q.session.set(K.sid, r.sid);
          showDashboard();
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = 'Log in';
          Q.$('.qz-msg', root).innerHTML = errorBox(err.message);
        });
    });
  }

  // =========================================================== dashboard
  function stateBadge(q) {
    if (q.in_progress) return '<span class="label label-yellow">In progress</span>';
    if (q.state === 'open') return '<span class="label label-green">Open</span>';
    if (q.state === 'upcoming') return '<span class="label label-blue">Opens ' + Q.esc(Q.fmtDate(q.open_at)) + '</span>';
    if (q.state === 'closed') return '<span class="label qz-label-grey">Closed</span>';
    return '<span class="label qz-label-grey">Not scheduled</span>';
  }

  function quizCard(q) {
    var left = q.attempts_allowed - q.attempts_used;
    var lines = [];
    lines.push(q.n_questions + ' questions, ' + q.time_limit_min + ' minute timer');
    if (q.open_at && q.close_at) lines.push('Open ' + Q.fmtDate(q.open_at) + ' to ' + Q.fmtDate(q.close_at));
    lines.push('Attempts: ' + q.attempts_used + ' of ' + q.attempts_allowed + ' used');
    var score = q.best_score === null ? '' :
      '<div class="qz-score"><span class="qz-score-num">' + q.best_score + ' / ' + q.max + '</span>' +
      '<span class="qz-score-label">' + (q.attempts_allowed > 1 ? 'best score' : 'score') + '</span></div>';
    var buttons = [];
    if (q.in_progress) {
      buttons.push('<button type="button" class="btn btn-primary" data-act="resume" data-quiz="' + q.quiz_id + '">Resume</button>');
    } else if (q.state === 'open' && left > 0) {
      buttons.push('<button type="button" class="btn btn-primary" data-act="start" data-quiz="' + q.quiz_id + '">' +
                   (q.attempts_used ? 'Start attempt ' + (q.attempts_used + 1) : 'Start quiz') + '</button>');
    }
    if (q.review) buttons.push('<button type="button" class="btn btn-outline" data-act="review" data-quiz="' + q.quiz_id + '">Review answers</button>');
    var note = '';
    if (q.in_progress) note = 'Your timer is running. It ends ' + Q.fmtDate(q.in_progress, false) + '.';
    else if (q.best_score !== null && !q.review && q.state === 'open') note = 'Answers and explanations appear here after the quiz closes.';
    return '<div class="qz-card qz-quiz" data-quiz="' + q.quiz_id + '">' +
      '<div class="qz-quiz-head"><h3>' + Q.esc(q.title) + '</h3>' + stateBadge(q) + '</div>' +
      '<div class="qz-quiz-body"><ul class="qz-facts">' + lines.map(function (l) { return '<li>' + Q.esc(l) + '</li>'; }).join('') +
      '</ul>' + score + '</div>' +
      (note ? '<p class="qz-fine">' + Q.esc(note) + '</p>' : '') +
      (buttons.length ? '<div class="qz-buttons">' + buttons.join('') + '</div>' : '') + '</div>';
  }

  function showDashboard() {
    if (!S.token) return showLogin();
    var labsOnly = !!(window.EE105_QUIZ || {}).labsOnly;
    setView(userBar() + '<div class="qz-msg"></div>' +
      (labsOnly ? '' : '<h2 class="qz-section">Quizzes</h2><div id="qz-list"><p class="qz-loading">Loading your quizzes...</p></div>') +
      '<h2 class="qz-section">Labs</h2><div id="qz-labs"><p class="qz-loading">Loading your labs...</p></div>' +
      '<input type="file" id="qz-labfile" accept=".json,application/json" hidden>');
    if (!labsOnly) Q.api('quizzes', { token: S.token }, { tries: 3 }).then(function (r) {
      var list = Q.$('#qz-list', root);
      if (!list) return;
      list.innerHTML = r.quizzes.length ? r.quizzes.map(quizCard).join('')
        : '<div class="qz-card"><p>No quizzes are posted yet.</p></div>';
    }).catch(function (e) {
      var list = Q.$('#qz-list', root);
      if (list) list.innerHTML = '';
      handleError(e);
    });
    loadLabs();
    Q.$('#qz-labfile', root).addEventListener('change', onLabFile);
  }

  // =========================================================== labs
  var LAB_STATE = { open: ['label-green', 'Open'], late: ['label-yellow', 'Late period'], upcoming: ['label-blue', 'Not open yet'],
                    closed: ['qz-label-grey', 'Closed'], unavailable: ['qz-label-grey', 'Not available'] };

  function loadLabs() {
    Q.api('labs', { token: S.token }, { tries: 3 }).then(function (r) {
      var box = Q.$('#qz-labs', root);
      if (!box) return;
      box.innerHTML = r.labs.length ? r.labs.map(labCard).join('') : '<div class="qz-card"><p>No labs are open for submission yet.</p></div>';
    }).catch(function (e) {
      var box = Q.$('#qz-labs', root);
      if (box) box.innerHTML = '';
      handleError(e);
    });
  }

  function labCard(l) {
    var st = LAB_STATE[l.state] || LAB_STATE.unavailable;
    var lines = [];
    if (l.due_at) lines.push('Due ' + Q.fmtDate(l.due_at) + (l.late_until ? ', late uploads until ' + Q.fmtDate(l.late_until) +
      ' (' + Math.round(l.late_penalty * 100) + '% off)' : ''));
    if (l.state === 'upcoming' && l.open_at) lines.push('Opens ' + Q.fmtDate(l.open_at));
    lines.push('Uploads: ' + l.uploads + ' of ' + l.max_uploads + ' used');
    var score = l.best_score === null ? '' : '<div class="qz-score"><span class="qz-score-num">' + l.best_score + ' / ' + l.max +
      '</span><span class="qz-score-label">best score</span></div>';
    var buttons = [];
    if ((l.state === 'open' || l.state === 'late') && l.uploads < l.max_uploads) {
      buttons.push('<button type="button" class="btn btn-primary" data-act="lab-upload" data-lab="' + Q.esc(l.lab_id) + '">Upload submission file</button>');
    }
    if (l.uploads) buttons.push('<button type="button" class="btn btn-outline" data-act="lab-history" data-lab="' + Q.esc(l.lab_id) + '">Feedback on my uploads</button>');
    return '<div class="qz-card qz-quiz qz-lab" data-lab="' + Q.esc(l.lab_id) + '">' +
      '<div class="qz-quiz-head"><h3>' + Q.esc(l.title) + '</h3><span class="label ' + st[0] + '">' + st[1] + '</span></div>' +
      '<div class="qz-quiz-body"><ul class="qz-facts">' + lines.map(function (x) { return '<li>' + Q.esc(x) + '</li>'; }).join('') +
      '</ul>' + score + '</div>' +
      '<p class="qz-fine">Upload the file <code>lab' + Q.esc(l.lab_id) + '_submission.json</code> that the last cell of the lab notebook saved. ' +
      'It is graded right away; your best score counts.</p>' +
      (buttons.length ? '<div class="qz-buttons">' + buttons.join('') + '</div>' : '') + '</div>';
  }

  var pendingLab = null;
  function pickLabFile(labId) {
    pendingLab = labId;
    var input = Q.$('#qz-labfile', root);
    input.value = '';
    input.click();
  }

  function onLabFile(e) {
    var f = e.target.files && e.target.files[0];
    var labId = pendingLab;
    if (!f || !labId) return;
    if (f.size > 400000) { handleError(new Error('That file is too large. Upload the lab' + labId + '_submission.json file, not the notebook.')); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var text = String(fr.result || ''), doc = null;
      try { doc = JSON.parse(text); } catch (err) { /* the server explains */ }
      var warn = '';
      if (doc && doc.lab && String(doc.lab) !== String(labId)) warn = '<p class="qz-alert">This file says it is for Lab ' + Q.esc(doc.lab) + '.</p>';
      Q.confirm('Upload for Lab ' + labId + '?', '<p>File: <code>' + Q.esc(f.name) + '</code></p>' + warn +
        '<p>It is graded right away and counts as one of your uploads.</p>', 'Upload', 'Cancel').then(function (ok) {
        if (!ok) return;
        var card = Q.$('.qz-lab[data-lab="' + labId + '"]', root);
        var btn = card && Q.$('[data-act="lab-upload"]', card);
        if (btn) { btn.disabled = true; btn.textContent = 'Uploading and grading...'; }
        Q.api('lab_submit', { token: S.token, lab_id: labId, file_name: f.name, content: text }, { tries: 2 }).then(function (r) {
          showLabResult(labId, r);
        }).catch(function (err) {
          if (btn) { btn.disabled = false; btn.textContent = 'Upload submission file'; }
          handleError(err);
          window.scrollTo(0, 0);
        });
      });
    };
    fr.readAsText(f);
  }

  function feedbackList(items) {
    return '<ul class="qz-feedback">' + items.map(function (it) {
      return '<li class="' + (it.ok ? 'qz-fb-ok' : 'qz-fb-bad') + '"><span class="qz-fb-mark">' + (it.ok ? '&#10003;' : '&#10007;') + '</span>' +
        '<span class="qz-fb-rule">' + Q.esc(it.rule) + '</span><span class="qz-fb-pts">' + (+it.points.toFixed(2)) + ' / ' + it.max + '</span>' +
        (it.msg ? '<div class="qz-fb-msg">' + Q.esc(it.msg) + '</div>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  function showLabResult(labId, r) {
    var left = r.uploads_left > 0 ? 'You have ' + r.uploads_left + ' upload' + (r.uploads_left === 1 ? '' : 's') + ' left. '
      : 'You have no uploads left. ';
    var next = r.practice ? '<p>This was a practice run on the simulator, so it scores 0. ' + left + 'Your best score counts.</p>'
      : r.score < r.max ? '<p>Fix what is marked below, run the notebook again, and upload the new file. ' + left + 'Your best score counts.</p>'
      : '<p>Full marks.</p>';
    setView(userBar() + '<div class="qz-card qz-result"><h2>Lab ' + Q.esc(labId) + (r.practice ? ': practice run' : ' graded') + '</h2>' +
      '<div class="qz-score qz-score-big"><span class="qz-score-num">' + r.score + ' / ' + r.max + '</span>' +
      '<span class="qz-score-label">score</span></div>' +
      (r.late ? '<p>This upload was late, so it counts as ' + r.counted + ' (' + Math.round(r.late_penalty * 100) + '% off).</p>' : '') + next +
      '</div><div class="qz-card">' + feedbackList(r.items) + '</div>' +
      '<div class="qz-buttons"><button type="button" class="btn btn-primary" data-act="home">' + ((window.EE105_QUIZ || {}).labsOnly ? 'Back to my labs' : 'Back to my quizzes and labs') + '</button></div>');
  }

  function showLabHistory(labId) {
    setView(userBar() + '<div class="qz-msg"></div><div id="qz-hist"><p class="qz-loading">Loading...</p></div>');
    Q.api('lab_history', { token: S.token, lab_id: labId }, { tries: 3 }).then(function (r) {
      Q.$('#qz-hist', root).innerHTML = '<div class="qz-review-head"><h2>' + Q.esc(r.title) + '</h2>' +
        '<button type="button" class="btn btn-outline qz-small" data-act="home">Back</button></div>' +
        r.submissions.map(function (s) {
          return '<div class="qz-card"><h3>' + s.score + ' / ' + s.max + (s.late ? ' <span class="qz-fine">(late, counts ' + s.counted + ')</span>' : '') +
            ' <span class="qz-fine">' + Q.esc(Q.fmtDate(s.submitted_at)) + ', ' + Q.esc(s.file_name) + '</span></h3>' + feedbackList(s.items) + '</div>';
        }).join('');
    }).catch(function (e) { Q.$('#qz-hist', root).innerHTML = ''; handleError(e); });
  }

  function confirmStart(quizId, btn) {
    var card = btn.closest('.qz-quiz');
    var facts = card ? Q.$('.qz-facts li', card).textContent : '';
    Q.confirm('Start the quiz?',
      '<p>' + Q.esc(facts) + '.</p><p>The timer starts now and keeps running if you close this page or lose your ' +
      'connection. Your answers are saved as you go. When the timer ends, your saved answers are submitted.</p>',
      'Start now', 'Not yet').then(function (ok) { if (ok) startQuiz(quizId, btn); });
  }

  function startQuiz(quizId, btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
    Q.api('start', { token: S.token, quiz_id: quizId }, { tries: 4 }).then(takeQuiz).catch(function (e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Try again'; }
      handleError(e);
    });
  }

  // =========================================================== taking a quiz
  function backupKey(id) { return 'ee105q_ans_' + id; }

  function takeQuiz(att) {
    var skew = new Date(att.server_now).getTime() - Date.now();
    var answers = att.answers || {};
    try {
      var b = JSON.parse(Q.local.get(backupKey(att.attempt_id)) || 'null');
      if (b && b.answers && (!att.saved_at || b.t > new Date(att.saved_at).getTime())) answers = b.answers;
    } catch (e) { /* ignore a bad backup */ }
    setView('');
    run = {
      att: att, answers: answers, skew: skew, deadline: new Date(att.deadline).getTime(),
      version: 1, savedVersion: att.answers && JSON.stringify(att.answers) === JSON.stringify(answers) ? 1 : 0,
      saving: false, submitting: false, lastSave: 0,
    };
    var n = att.questions.length;
    var html = '<div class="qz-bar" id="qz-bar">' +
      '<div class="qz-bar-title">' + Q.esc(att.title) + '</div>' +
      '<div class="qz-bar-row"><span class="qz-timer" id="qz-timer" aria-live="off">--:--</span>' +
      '<span class="qz-save" id="qz-save" aria-live="polite"></span>' +
      '<span class="qz-count" id="qz-count"></span>' +
      '<button type="button" class="btn btn-primary qz-small" data-act="submit">Submit</button></div>' +
      '<nav class="qz-nav" aria-label="Questions">' + att.questions.map(function (q) {
        return '<button type="button" class="qz-chip" data-act="goto" data-n="' + q.n + '" id="qz-chip-' + q.n + '">' + q.n + '</button>';
      }).join('') + '</nav></div>' +
      '<div class="qz-msg"></div>' +
      '<form id="qz-form" autocomplete="off" onsubmit="return false">' + att.questions.map(questionHtml).join('') + '</form>' +
      '<div class="qz-card qz-end"><p>' + n + ' questions. Check your answers, then submit.</p>' +
      '<button type="button" class="btn btn-primary" data-act="submit">Submit quiz</button></div>';
    root.innerHTML = html;
    att.questions.forEach(function (q) {
      if (q.figure_svg) {
        var node = Q.svgNode(q.figure_svg);
        var box = Q.$('#qz-q-' + q.n + ' .qz-fig', root);
        if (node && box) box.appendChild(node);
      }
    });
    fillAnswers();
    var form = Q.$('#qz-form', root);
    form.addEventListener('input', onAnswer);
    form.addEventListener('change', onAnswer);
    window.addEventListener('beforeunload', beforeUnload);
    timer = setInterval(tick, 500);
    tick();
    updateCount();
    if (run.savedVersion !== run.version) save();
  }

  function questionHtml(q) {
    var n = q.n, body = '';
    if (q.type === 'numeric') {
      body = '<div class="qz-numrow"><label class="qz-sr" for="qz-in-' + n + '">Answer to question ' + n + '</label>' +
        '<input class="qz-num" id="qz-in-' + n + '" data-n="' + n + '" data-units="' + Q.esc(q.units || '') + '" type="text" inputmode="decimal" spellcheck="false" ' +
        'placeholder="number" maxlength="40">' +
        (q.units ? '<span class="qz-units">' + Q.mdInline(q.units) + '</span>' : '') + '</div>' +
        '<div class="qz-parsed" id="qz-parsed-' + n + '"></div>';
    } else {
      var multi = q.type === 'multi';
      body = (multi && !/select all/i.test(q.prompt) ? '<p class="qz-hint">Select all that apply.</p>' : '') +
        '<div class="qz-choices" role="' + (multi ? 'group' : 'radiogroup') + '">' + q.choices.map(function (c, k) {
          return '<label class="qz-choice"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="qz-' + n + '" ' +
            'data-n="' + n + '" value="' + k + '"><span class="qz-letter">' + String.fromCharCode(65 + k) + '</span>' +
            '<span class="qz-choice-text">' + Q.mdInline(c) + '</span></label>';
        }).join('') + '</div>';
    }
    return '<section class="qz-card qz-q" id="qz-q-' + n + '" data-n="' + n + '">' +
      '<div class="qz-qhead">Question ' + n + '</div>' +
      '<div class="qz-prompt">' + Q.md(q.prompt) + '</div>' +
      (q.figure_svg ? '<div class="qz-fig"></div>' : '') + body + '</section>';
  }

  function fillAnswers() {
    Object.keys(run.answers).forEach(function (n) {
      var v = run.answers[n];
      var num = Q.$('#qz-in-' + n, root);
      if (num) { num.value = v; showParsed(num); return; }
      var vals = Array.isArray(v) ? v.map(String) : [String(v)];
      Q.$$('input[name="qz-' + n + '"]', root).forEach(function (el) { el.checked = vals.indexOf(el.value) >= 0; });
    });
  }

  function showParsed(input) {
    var n = input.getAttribute('data-n');
    var box = Q.$('#qz-parsed-' + n, root);
    var raw = input.value.trim();
    if (!raw) { box.textContent = ''; box.className = 'qz-parsed'; return; }
    var x = Q.parseNumber(raw, input.getAttribute('data-units'));
    if (!isFinite(x)) {
      box.textContent = 'Not a number. Use digits, a decimal point, and e for powers of ten (4.7e-3).';
      box.className = 'qz-parsed qz-bad';
    } else {
      var shown = Q.fmtNum(x);
      box.textContent = shown !== raw ? 'Read as ' + shown : '';
      box.className = 'qz-parsed';
    }
  }

  function onAnswer(e) {
    if (!run || run.submitting) return;
    var el = e.target;
    var n = el.getAttribute('data-n');
    if (!n) return;
    if (el.classList.contains('qz-num')) {
      showParsed(el);
      if (el.value.trim()) run.answers[n] = el.value.trim(); else delete run.answers[n];
    } else if (el.type === 'checkbox') {
      var picked = Q.$$('input[name="qz-' + n + '"]:checked', root).map(function (x) { return Number(x.value); });
      if (picked.length) run.answers[n] = picked; else delete run.answers[n];
    } else if (el.type === 'radio') {
      run.answers[n] = Number(el.value);
    }
    run.version++;
    Q.local.set(backupKey(run.att.attempt_id), JSON.stringify({ t: Date.now() + run.skew, answers: run.answers }));
    updateCount();
    setSaveText('Not saved yet');
    clearTimeout(run.debounce);
    run.debounce = setTimeout(save, el.classList.contains('qz-num') ? 1500 : 400);
  }

  function updateCount() {
    var n = run.att.questions.length, done = 0;
    run.att.questions.forEach(function (q) {
      var on = run.answers[String(q.n)] !== undefined;
      if (on) done++;
      var chip = document.getElementById('qz-chip-' + q.n);
      if (chip) chip.classList.toggle('qz-done', on);
    });
    Q.$('#qz-count', root).textContent = done + ' of ' + n + ' answered';
  }

  function setSaveText(t, bad) {
    var el = Q.$('#qz-save', root);
    if (el) { el.textContent = t; el.classList.toggle('qz-bad', !!bad); }
  }

  function save() {
    if (!run || run.saving || run.submitting || run.savedVersion === run.version) return;
    run.saving = true;
    var v = run.version, id = run.att.attempt_id;
    setSaveText('Saving...');
    Q.api('save', { token: S.token, attempt_id: id, answers: run.answers }, { tries: 2 }).then(function (r) {
      if (!run || run.att.attempt_id !== id) return;
      run.saving = false;
      run.lastSave = Date.now();
      if (r.saved) {
        run.savedVersion = v;
        setSaveText(run.savedVersion === run.version ? 'All answers saved' : 'Not saved yet');
        if (run.savedVersion !== run.version) setTimeout(save, 300);
      } else if (r.status === 'late') {
        submit(true);
      } else {
        finished({ already: true });
      }
    }).catch(function (e) {
      if (!run) return;
      run.saving = false;
      if (e.code === 'auth') return logout(e.message);
      setSaveText(e.network ? 'Offline: answers kept on this device, retrying' : 'Not saved: ' + e.message, true);
      setTimeout(save, 5000);
    });
  }

  function tick() {
    if (!run) return;
    var left = run.deadline - (Date.now() + run.skew);
    var el = Q.$('#qz-timer', root);
    if (el) {
      el.textContent = Q.fmtClock(left) + ' left';
      el.classList.toggle('qz-warn', left < 5 * 60e3);
      el.classList.toggle('qz-urgent', left < 60e3);
    }
    if (left <= 0 && !run.submitting) submit(true);
    // a periodic save in case a debounced save was missed
    if (run.savedVersion !== run.version && !run.saving && Date.now() - run.lastSave > 20000) save();
  }

  function beforeUnload(e) {
    if (run && run.savedVersion !== run.version) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  function stopRun() {
    if (timer) clearInterval(timer);
    timer = null;
    if (run) clearTimeout(run.debounce);
    run = null;
    window.removeEventListener('beforeunload', beforeUnload);
  }

  function confirmSubmit() {
    if (!run || run.submitting) return;
    var n = run.att.questions.length;
    var blank = run.att.questions.filter(function (q) { return run.answers[String(q.n)] === undefined; }).map(function (q) { return q.n; });
    Q.confirm('Submit the quiz?',
      blank.length ? '<p>You left ' + blank.length + ' of ' + n + ' questions blank: ' + blank.join(', ') + '.</p><p>After you submit, you cannot change your answers.</p>'
                   : '<p>All ' + n + ' questions have an answer. After you submit, you cannot change them.</p>',
      'Submit', 'Keep working').then(function (ok) { if (ok) submit(false); });
  }

  function submit(timeUp) {
    if (!run || run.submitting) return;
    run.submitting = true;
    clearTimeout(run.debounce);
    var id = run.att.attempt_id, title = run.att.title, quizId = run.att.quiz_id;
    Q.$$('#qz-form input', root).forEach(function (el) { el.disabled = true; });
    Q.$$('[data-act="submit"]', root).forEach(function (el) { el.disabled = true; });
    setSaveText(timeUp ? 'Time is up. Submitting...' : 'Submitting...');
    Q.api('submit', { token: S.token, attempt_id: id, answers: run.answers }, { tries: 5 }).then(function (r) {
      Q.local.del(backupKey(id));
      r.title = title;
      r.quiz_id = quizId;
      r.time_up = timeUp;
      finished(r);
    }).catch(function (e) {
      if (e.code === 'auth') return logout(e.message);
      if (!run) return;
      run.submitting = false;
      Q.$$('#qz-form input', root).forEach(function (el) { el.disabled = false; });
      Q.$$('[data-act="submit"]', root).forEach(function (el) { el.disabled = false; });
      var msg = timeUp
        ? 'Time is up, but the server could not be reached. Your last saved answers will be graded automatically. ' +
          'Keep this page open; it will try again.'
        : 'Could not submit: ' + e.message + ' Your answers are still here. Try again.';
      setSaveText('Not submitted', true);
      Q.$('.qz-msg', root).innerHTML = errorBox(msg);
      window.scrollTo(0, 0);
      if (timeUp) setTimeout(function () { if (run) submit(true); }, 8000);
    });
  }

  function finished(r) {
    var body;
    if (r.already && r.score === undefined) {
      body = '<p>This attempt was already submitted.</p>';
    } else {
      body = '<div class="qz-score qz-score-big"><span class="qz-score-num">' + r.score + ' / ' + r.max + '</span>' +
        '<span class="qz-score-label">score</span></div>' +
        (r.late || r.time_up ? '<p>Your time ended, so the answers saved at that moment were graded.</p>' : '') +
        (r.review ? '' : '<p>Answers and explanations appear on the quiz page after the quiz closes.</p>');
    }
    setView(userBar() + '<div class="qz-card qz-result"><h2>Submitted' + (r.title ? ': ' + Q.esc(r.title) : '') + '</h2>' + body +
      '<div class="qz-buttons"><button type="button" class="btn btn-primary" data-act="home">Back to my quizzes and labs</button>' +
      (r.review && r.quiz_id !== undefined ? '<button type="button" class="btn btn-outline" data-act="review" data-quiz="' + r.quiz_id + '">Review answers</button>' : '') +
      '</div></div>');
  }

  // =========================================================== review
  function showReview(quizId) {
    setView(userBar() + '<div class="qz-msg"></div><div id="qz-review"><p class="qz-loading">Loading...</p></div>');
    Q.api('review', { token: S.token, quiz_id: quizId }, { tries: 3 }).then(function (r) {
      var box = Q.$('#qz-review', root);
      box.innerHTML = '<div class="qz-review-head"><h2>' + Q.esc(r.title) + '</h2>' +
        '<button type="button" class="btn btn-outline qz-small" data-act="home">Back to my quizzes</button></div>' +
        r.attempts.map(function (a) { return Q.reviewHtml(a, r.attempts.length > 1); }).join('');
      Q.reviewFigures(box, r.attempts);
    }).catch(function (e) {
      Q.$('#qz-review', root).innerHTML = '';
      handleError(e);
    });
  }

  // =========================================================== go
  if (S.token) showDashboard(); else showLogin();
})();

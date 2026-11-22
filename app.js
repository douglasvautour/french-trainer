/* Apprenez le français ! — app */
(function () {
  'use strict';
  const V = window.Verbs;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const DAY = 864e5;

  /* ---------------- Storage ---------------- */
  const KEY_S = 'apprenez.settings.v1', KEY_D = 'apprenez.data.v1';
  const load = (k, d) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };

  const DEFAULT_SETTINGS = () => ({
    num: 10,
    types: { fill: true, mc: true },
    forms: { en: true, fr: true },
    pronouns: Object.fromEntries(V.PRONOUNS.map(p => [p, true])),
    tenses: Object.fromEntries(V.TENSES.map(t => [t.id, ['present', 'pc', 'imparfait', 'futur'].includes(t.id)])),
    sources: { common: true, g1: false, g2: false, g3: false, custom: false, review: false, learned: false, incomplete: false },
  });
  const EMPTY_DATA = () => ({ custom: [], excluded: [], forms: {}, events: [] });
  function merge(def, val) {
    if (!val || typeof val !== 'object') return def;
    for (const k in def) {
      if (!(k in val)) continue;
      if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) def[k] = merge(def[k], val[k]);
      else def[k] = val[k];
    }
    return def;
  }
  function migrateSettings(raw) {
    const s = merge(DEFAULT_SETTINGS(), raw);
    // v2: thousands of verbs arrived; switch the old "all three groups" default to Common Verbs
    if (raw && raw.sources && !('common' in raw.sources) && raw.sources.g1 && raw.sources.g2 && raw.sources.g3) {
      Object.assign(s.sources, { common: true, g1: false, g2: false, g3: false });
    }
    return s;
  }
  let settings = migrateSettings(load(KEY_S, null));
  let data = Object.assign(EMPTY_DATA(), load(KEY_D, {}));
  const saveSettings = () => save(KEY_S, settings);
  const saveData = () => save(KEY_D, data);
  saveSettings();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }

  /* ---------------- Learning data ---------------- */
  const knownKey = k => !!V.BY_ID[k.split('|')[0]]; // ignore forms of verbs no longer in the list
  const reviewKeys = () => Object.keys(data.forms).filter(k => knownKey(k) && !data.forms[k].learnedAt);
  const learnedKeys = () => Object.keys(data.forms).filter(k => knownKey(k) && data.forms[k].learnedAt);
  function verbStats() {
    const m = {};
    for (const k in data.forms) {
      const id = k.split('|')[0];
      const s = m[id] || (m[id] = { seen: 0, learned: 0, lastLearned: 0 });
      s.seen++;
      if (data.forms[k].learnedAt) { s.learned++; s.lastLearned = Math.max(s.lastLearned, data.forms[k].learnedAt); }
    }
    return m;
  }
  function incompleteVerbs() {
    const m = verbStats();
    return Object.keys(m).filter(id => V.BY_ID[id] && m[id].learned < V.nForms(V.BY_ID[id]))
      .sort((a, b) => m[b].learned - m[a].learned || a.localeCompare(b, 'fr'));
  }
  function record(q, ok) {
    const k = V.formKey(q.verb.id, q.tense, V.SLOT[q.pronoun]);
    const now = Date.now();
    const f = data.forms[k] || (data.forms[k] = { streak: 0, correct: 0, wrong: 0, seen: 0, first: now, learnedAt: null });
    f.seen++; f.last = now; f.type = q.kind; f.answer = q.ans.full;
    if (ok) { f.correct++; f.streak++; if (f.streak >= 5 && !f.learnedAt) f.learnedAt = now; }
    else { f.wrong++; f.streak = 0; f.learnedAt = null; }
    data.events.push({ t: now, k, ok: ok ? 1 : 0, ty: q.kind });
    saveData();
  }
  const isCustom = id => data.custom.includes(id);
  const isExcluded = id => data.excluded.includes(id);
  const groupIds = key => V.VERBS.filter(v => (key === 'common' ? v.common : v.group === +key.slice(1))).map(v => v.id);
  function toggleCustom(id) {
    if (isCustom(id)) data.custom = data.custom.filter(x => x !== id); else data.custom.push(id);
    saveData();
    return isCustom(id);
  }

  /* ---------------- Quiz generation ---------------- */
  const selTenses = () => V.TENSES.filter(t => settings.tenses[t.id]).map(t => t.id);
  const selPronouns = () => V.PRONOUNS.filter(p => settings.pronouns[p]);

  function buildPool() {
    const T = selTenses(), P = selPronouns(), src = settings.sources;
    const ids = new Set();
    ['common', 'g1', 'g2', 'g3'].forEach(k => { if (src[k]) groupIds(k).forEach(id => { if (!isExcluded(id)) ids.add(id); }); });
    if (src.incomplete) incompleteVerbs().forEach(id => { if (!isExcluded(id)) ids.add(id); });
    if (src.custom) data.custom.forEach(id => { if (V.BY_ID[id]) ids.add(id); });
    const verbs = [...ids];
    const forms = [];
    const addForms = keys => keys.forEach(k => {
      const { id, tense, slot } = V.parseKey(k);
      if (!V.BY_ID[id] || !T.includes(tense)) return;
      P.filter(p => V.SLOT[p] === slot).forEach(p => forms.push({ id, tense, pronoun: p }));
    });
    if (src.review) addForms(reviewKeys());
    if (src.learned) addForms(learnedKeys());
    const A = verbs.length * T.length * P.length;
    return {
      size: A + forms.length,
      draw() {
        const r = Math.floor(Math.random() * (A + forms.length));
        if (r >= A) return forms[r - A];
        return { id: pick(verbs), tense: pick(T), pronoun: pick(P) };
      },
    };
  }

  function makeQuestion(c) {
    const kinds = [settings.types.fill && 'fill', settings.types.mc && 'mc'].filter(Boolean);
    const forms = [settings.forms.en && 'en', settings.forms.fr && 'fr'].filter(Boolean);
    const v = V.BY_ID[c.id];
    const q = { verb: v, tense: c.tense, pronoun: c.pronoun, kind: pick(kinds), form: pick(forms) };
    q.ans = V.answer(v, c.tense, c.pronoun);
    if (!q.ans) return null; // form doesn't exist (e.g. "je faut")
    if (q.kind === 'mc') {
      const raw = [q.ans.blank].concat(V.distractors(v, c.tense, c.pronoun));
      const opts = raw.map(x => (q.form === 'fr' ? x : V.assemble(c.pronoun, v, x).full));
      const order = V.shuffle([0, 1, 2, 3].slice(0, opts.length));
      q.options = order.map(i => opts[i]);
      q.correctIndex = order.indexOf(0);
    }
    return q;
  }

  function settingsProblem() {
    if (!settings.types.fill && !settings.types.mc) return 'Choose at least one question type in Settings.';
    if (!settings.forms.en && !settings.forms.fr) return 'Choose English or French under Question Form in Settings.';
    if (!selPronouns().length) return 'Choose at least one pronoun in Settings.';
    if (!selTenses().length) return 'Choose at least one tense in Settings.';
    return null;
  }

  function buildQuestions(n) {
    const pool = buildPool();
    if (!pool.size) return [];
    const out = [], used = new Set();
    for (let tries = 0; out.length < n && tries < n * 60; tries++) {
      const c = pool.draw();
      const k = c.id + '|' + c.tense + '|' + c.pronoun;
      if (used.has(k) && used.size < Math.min(pool.size, n)) continue; // avoid repeats when we can
      const q = makeQuestion(c);
      if (!q) continue;
      used.add(k); out.push(q);
    }
    return out;
  }

  let quiz = null;
  const sigOf = () => JSON.stringify(settings);
  const NO_MATCH = 'No verbs match your Study Content selection yet. Open Settings to choose what to study.';

  function newQuiz() {
    const problem = settingsProblem();
    const qs = problem ? [] : buildQuestions(settings.num);
    quiz = { qs, i: 0, tries: 0, state: 'ask', draft: '', picked: null, lastOk: null, results: [], done: false, sig: sigOf(), problem: problem || (qs.length ? null : NO_MATCH) };
  }

  // After visiting Settings: rebuild the questions that haven't been answered yet
  function refreshQuizIfNeeded() {
    if (!quiz || quiz.done || quiz.sig === sigOf()) return;
    quiz.sig = sigOf();
    const keep = quiz.state === 'answered' ? quiz.i + 1 : quiz.i;
    const problem = settingsProblem();
    const fresh = problem ? [] : buildQuestions(Math.max(0, settings.num - keep));
    quiz.qs = quiz.qs.slice(0, keep).concat(fresh);
    if (!quiz.qs.length) { quiz.problem = problem || NO_MATCH; return; }
    quiz.problem = null;
    if (quiz.state === 'ask') { quiz.tries = 0; quiz.draft = ''; }
    if (quiz.i >= quiz.qs.length) quiz.done = true;
  }

  // One colour per tense, in checklist order (deep shades of a pastel rainbow)
  const TENSE_COLOR = {
    present: '#872222', pc: '#874C22', imparfait: '#876D22', futur: '#4C8722', cond: '#228754',
    pqp: '#228787', fa: '#225D87', subj: '#222A87', cp: '#542287', ps: '#872265',
  };

  /* ---------------- Icons ---------------- */
  const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${inner}</svg>`;
  const ICON = {
    back: svg('<path d="M15 4.5 7.5 12 15 19.5"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    star: svg('<path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z"/>'),
    target: svg('<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4.6"/><circle cx="11" cy="13" r="1.3" fill="currentColor"/><path d="M11 13 20.5 3.5"/><path d="M17.2 3.3v3.5h3.5"/><path d="M15.4 5.1v3.5h3.5" opacity="0"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    chev: svg('<path d="M9 5l7 7-7 7"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.4"'),
    cross: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', 'stroke-width="2.4"'),
    write: svg('<path d="M13 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V11"/><path d="M8 13h3M8 17h7"/><path d="M18.6 2.6l2.3 2.3-7.1 7.1-3 .7.7-3z"/>'),
    tap: svg('<path d="M9.5 14V6.5a1.5 1.5 0 0 1 3 0V12"/><path d="M12.5 11a1.5 1.5 0 0 1 3 0v1.5"/><path d="M15.5 12a1.5 1.5 0 0 1 3 0v3.5a5.5 5.5 0 0 1-5.5 5.5h-1a5.2 5.2 0 0 1-4.3-2.3l-2.3-3.4a1.5 1.5 0 0 1 2.4-1.8l1.2 1.5"/><path d="M6.3 4.3 5 3M15.7 4.3 17 3M11 2.2V1"/>'),
    verbs: svg('<path d="M4 5.5h10M4 10h7M4 14.5h10M4 19h6"/><path d="M16.5 13.5l2 2 3.5-4"/>'),
  };

  /* ---------------- Router ---------------- */
  let view = 'home';
  function go(v) {
    const t = $('#toast'); if (t && t.classList.contains('has-action')) t.classList.remove('show', 'has-action');
    if (v === 'list' && view === 'settings') settingsScroll = window.scrollY;
    if (v === 'verb' && view === 'list') listRestore = { y: window.scrollY, shown: listShown };
    if (v === 'home' && quiz) quiz = null; // leaving the trainer ends the quiz (answers are already saved)
    if (v === 'quiz' && view === 'home') newQuiz();
    if (v === 'quiz') refreshQuizIfNeeded();
    view = v;
    render();
    if (!(v === 'settings' && settingsScroll) && !(v === 'list' && listRestore)) window.scrollTo(0, 0);
  }
  function render() {
    const app = $('#app');
    app.innerHTML = '';
    app.appendChild({ home: viewHome, quiz: viewQuiz, settings: viewSettings, progress: viewProgress, list: viewList, verb: viewVerb }[view]());
  }

  let toastTimer;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = el('<div id="toast" role="status"></div>'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.remove('has-action'); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------------- Home ---------------- */
  function viewHome() {
    const n = V.VERBS.length.toLocaleString('en-US');
    const node = el(`
      <main class="screen home">
        <header class="home-head">
          <p class="eyebrow">Modules</p>
          <h1>Apprenez le français&nbsp;!</h1>
          <div class="rule"></div>
        </header>
        <ul class="modules">
          <li>
            <button class="module" data-go="quiz">
              <span class="m-icon">${ICON.verbs}</span>
              <span class="m-text"><span class="m-title">Verb Trainer</span><span class="m-sub">${n} verbs · ${V.TENSES.length} tenses</span></span>
              <span class="m-chev">${ICON.chev}</span>
            </button>
          </li>
        </ul>
      </main>`);
    $('[data-go="quiz"]', node).onclick = () => go('quiz');
    return node;
  }

  /* ---------------- Quiz ---------------- */
  function viewQuiz() {
    const q = quiz.qs[quiz.i];
    const showQ = q && !quiz.done && !quiz.problem;
    const node = el(`
      <div class="screen quiz">
        <header class="bar">
          <button class="icon" data-act="home" aria-label="Back to home">${ICON.back}</button>
          <div class="bar-title">Verb Trainer</div>
          <div class="bar-right">
            <button class="icon star" data-act="star" aria-label="Add verb to Custom list" ${showQ ? '' : 'disabled'}>${ICON.star}</button>
            <button class="icon" data-act="progress" aria-label="Progress">${ICON.target}</button>
            <button class="icon" data-act="settings" aria-label="Settings">${ICON.gear}</button>
          </div>
        </header>
        <div class="pbar"><div></div></div>
        <section class="q-area"></section>
        <section class="a-area"></section>
      </div>`);
    $('[data-act="home"]', node).onclick = () => go('home');
    $('[data-act="progress"]', node).onclick = () => go('progress');
    $('[data-act="settings"]', node).onclick = () => go('settings');
    const starBtn = $('[data-act="star"]', node);
    const qa = $('.q-area', node), aa = $('.a-area', node);
    const total = quiz.qs.length || settings.num;
    const answered = quiz.results.length;
    $('.pbar div', node).style.width = (quiz.done ? 100 : (answered / Math.max(1, total)) * 100) + '%';

    if (quiz.problem) {
      qa.innerHTML = `<div class="q-empty"><p class="q-text small">Nothing to practise yet</p><p class="muted">${esc(quiz.problem)}</p></div>`;
      aa.innerHTML = `<div class="a-inner"><button class="btn primary" data-act="open-settings">Open Settings</button></div>`;
      $('[data-act="open-settings"]', aa).onclick = () => go('settings');
      return node;
    }
    if (quiz.done) { renderSummary(qa, aa); return node; }

    const setStar = () => {
      const on = isCustom(q.verb.id);
      starBtn.classList.toggle('on', on);
      starBtn.setAttribute('aria-pressed', on);
      starBtn.setAttribute('aria-label', on ? 'Remove verb from Custom list' : 'Add verb to Custom list');
    };
    setStar();
    starBtn.onclick = () => { const on = toggleCustom(q.verb.id); setStar(); toast(on ? `${q.verb.id} added to Custom` : `${q.verb.id} removed from Custom`); };

    // Question
    const tl = V.TENSE_LABEL[q.tense];
    const blankHtml = `<span class="blank"><span class="blank-fill"></span></span>`;
    const sentence = q.form === 'fr'
      ? `${esc(cap(q.ans.prefix))}${q.ans.prefix.endsWith("'") ? '' : ' '}${blankHtml}`
      : esc(V.english(q.verb, q.tense, q.pronoun));
    qa.innerHTML = `
      <div class="q-meta">Question ${quiz.i + 1} of ${quiz.qs.length}<span class="dot">·</span>${q.kind === 'mc' ? 'Multiple choice' : 'Fill in the blank'}</div>
      <p class="q-tense" lang="fr" style="color:${TENSE_COLOR[q.tense]}">${esc(tl)}</p>
      <div class="q-rule"></div>
      <p class="q-text" lang="${q.form === 'fr' ? 'fr' : 'en'}">${sentence}</p>
      <p class="q-hint"><span lang="fr">${esc(q.verb.id)}</span>${q.form === 'en' ? `<span class="dot">·</span><span class="how">${q.kind === 'mc' ? ICON.tap : ICON.write}Answer in French</span>` : ''}</p>`;
    const fillBlank = (txt, ok) => {
      const b = $('.blank-fill', qa); if (!b) return;
      b.textContent = txt; b.parentElement.classList.add('filled', ok ? 'good' : 'bad');
    };

    const isLast = quiz.i >= quiz.qs.length - 1;
    const nextLabel = isLast ? 'Finish' : 'Next';
    const finishQ = ok => { quiz.state = 'answered'; quiz.lastOk = ok; quiz.results.push({ q, ok }); record(q, ok); $('.pbar div', node).style.width = (quiz.results.length / quiz.qs.length) * 100 + '%'; };

    if (q.kind === 'fill') {
      aa.innerHTML = `
        <div class="a-inner fill">
          <label class="field">
            <span class="sr">Your answer</span>
            <input id="answer" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" lang="fr" enterkeyhint="done"
              placeholder="${q.form === 'fr' ? 'Type the missing verb' : 'Type the sentence in French'}">
          </label>
          <div class="accents" aria-label="Accented letters">${['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'ë'].map(c => `<button type="button" class="key" data-k="${c}">${c}</button>`).join('')}</div>
          <div class="msg" aria-live="polite"><span class="msg-main"></span><span class="msg-sub"></span></div>
          <button class="btn primary" data-act="submit">Submit</button>
        </div>`;
      const input = $('#answer', aa), btn = $('[data-act="submit"]', aa), msg = $('.msg', aa);
      const keepFocus = e => e.preventDefault();
      $$('.key', aa).forEach(k => {
        k.addEventListener('mousedown', keepFocus);
        k.addEventListener('touchstart', keepFocus, { passive: false });
        k.addEventListener('touchend', e => { e.preventDefault(); insert(k.dataset.k); });
        k.addEventListener('click', () => insert(k.dataset.k));
      });
      function insert(ch) {
        if (input.readOnly) return;
        const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? s;
        input.value = input.value.slice(0, s) + ch + input.value.slice(e);
        input.focus();
        try { input.setSelectionRange(s + 1, s + 1); } catch (er) { /* ignore */ }
      }
      const setMsg = (main, cls, sub = '') => {
        msg.className = 'msg show ' + (cls || '');
        $('.msg-main', msg).textContent = main; $('.msg-sub', msg).textContent = sub;
      };
      const done = () => { input.readOnly = true; input.blur(); aa.querySelector('.accents').classList.add('off'); btn.textContent = nextLabel; btn.classList.add('next'); };
      function submit() {
        if (quiz.state === 'answered') return advance();
        const r = V.check(input.value, q.ans, q.form);
        if (r === 'empty') { input.focus(); return; }
        quiz.tries++;
        if (r === 'correct') {
          setMsg('Correct!', 'good'); fillBlank(q.ans.blank, true); input.classList.add('good'); finishQ(true); done();
        } else if (quiz.tries >= 3) {
          input.value = quiz.draft = q.form === 'fr' ? q.ans.blank : q.ans.full;
          input.classList.add('revealed');
          setMsg(r === 'accent' ? 'Check your accents.' : 'Not quite.', 'bad', 'The correct answer is shown above.');
          fillBlank(q.ans.blank, false); finishQ(false); done();
        } else {
          const left = 3 - quiz.tries;
          setMsg(r === 'accent' ? 'Check your accents.' : 'Try again.', 'warn', `${left} ${left === 1 ? 'try' : 'tries'} left`);
          input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
          input.focus();
        }
      }
      btn.addEventListener('mousedown', e => { if (quiz.state === 'ask') e.preventDefault(); });
      btn.onclick = submit;
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      input.addEventListener('input', () => { quiz.draft = input.value; });
      // Restore state when coming back from Settings or Progress
      input.value = quiz.draft || '';
      if (quiz.state === 'answered') {
        if (quiz.lastOk) { setMsg('Correct!', 'good'); input.classList.add('good'); }
        else { input.classList.add('revealed'); setMsg('Not quite.', 'bad', 'The correct answer is shown above.'); }
        fillBlank(q.ans.blank, quiz.lastOk); done();
      } else if (quiz.tries > 0) {
        const left = 3 - quiz.tries;
        setMsg('Try again.', 'warn', `${left} ${left === 1 ? 'try' : 'tries'} left`);
      }
    } else {
      aa.innerHTML = `
        <div class="a-inner mc">
          <div class="opts" role="list">
            ${q.options.map((o, i) => `<button class="opt" data-i="${i}" lang="fr"><span class="mark"></span><span class="txt">${esc(o)}</span></button>`).join('')}
          </div>
          <div class="msg" aria-live="polite"><span class="msg-main"></span><span class="msg-sub"></span></div>
          <button class="btn primary next hidden" data-act="next">${nextLabel}</button>
        </div>`;
      const nextBtn = $('[data-act="next"]', aa), msg = $('.msg', aa);
      const show = (i, isNew) => {
        const b = $(`.opt[data-i="${i}"]`, aa), ok = i === q.correctIndex;
        $$('.opt', aa).forEach(o => { o.disabled = true; });
        const right = $(`.opt[data-i="${q.correctIndex}"]`, aa);
        right.classList.add('right'); $('.mark', right).innerHTML = ICON.check;
        if (!ok) { b.classList.add('wrong'); $('.mark', b).innerHTML = ICON.cross; }
        msg.className = 'msg show ' + (ok ? 'good' : 'bad');
        $('.msg-main', msg).textContent = ok ? 'Correct!' : 'Not quite.';
        fillBlank(q.ans.blank, ok);
        if (isNew) { quiz.picked = i; finishQ(ok); }
        nextBtn.classList.remove('hidden');
      };
      $$('.opt', aa).forEach(b => b.onclick = () => { if (quiz.state === 'ask') show(+b.dataset.i, true); });
      if (quiz.state === 'answered' && quiz.picked != null) show(quiz.picked, false);
      nextBtn.onclick = advance;
    }
    return node;
  }

  function advance() {
    if (quiz.i < quiz.qs.length - 1) { quiz.i++; quiz.tries = 0; quiz.state = 'ask'; quiz.draft = ''; quiz.picked = null; }
    else quiz.done = true;
    render();
    if (!quiz.done) { const inp = $('#answer'); if (inp && !matchMedia('(hover: none)').matches) inp.focus(); }
  }

  function renderSummary(qa, aa) {
    const ok = quiz.results.filter(r => r.ok).length, n = quiz.results.length;
    const head = ok === n ? 'Parfait !' : ok >= n * 0.7 ? 'Bravo !' : 'Bon travail !';
    qa.innerHTML = `
      <div class="q-meta">Quiz complete</div>
      <p class="q-text">${head.replace(' !', '&nbsp;!')}</p>
      <p class="q-hint">${ok} of ${n} correct</p>`;
    aa.innerHTML = `
      <div class="a-inner summary">
        <div class="row">
          <button class="btn" data-act="home">Home</button>
          <button class="btn primary" data-act="again">New quiz</button>
        </div>
        <ul class="results">
          ${quiz.results.map(r => `<li class="${r.ok ? 'good' : 'bad'}"><span class="mark">${r.ok ? ICON.check : ICON.cross}</span>
            <span class="r-text"><span lang="fr">${esc(r.q.ans.full)}</span><small>${esc(r.q.verb.id)} · ${esc(V.TENSE_LABEL[r.q.tense])}</small></span></li>`).join('')}
        </ul>
      </div>`;
    $('[data-act="home"]', aa).onclick = () => go('home');
    $('[data-act="again"]', aa).onclick = () => { newQuiz(); render(); };
  }

  /* ---------------- Settings ---------------- */
  function check(id, label, checked, sub = '') {
    return `<label class="check"><input type="checkbox" data-id="${esc(id)}" ${checked ? 'checked' : ''}><span class="box">${ICON.check}</span>
      <span class="lbl">${label}${sub ? `<small>${sub}</small>` : ''}</span></label>`;
  }
  const dots = n => `<span class="streak" aria-label="${n} of 5 in a row">${[0, 1, 2, 3, 4].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
  const typeName = t => (t === 'mc' ? 'Multiple choice' : 'Fill in the blank');
  const fmtDate = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtNum = n => n.toLocaleString('en-US');

  const SOURCES = {
    common: { label: 'Common Verbs', sub: 'the most useful everyday verbs', action: 'Exclude' },
    g1: { label: 'First Group', sub: '-er verbs', action: 'Exclude' },
    g2: { label: 'Second Group', sub: '-ir verbs like finir', action: 'Exclude' },
    g3: { label: 'Third Group', sub: 'irregular verbs', action: 'Exclude' },
    custom: { label: 'Custom', sub: 'verbs you starred', action: 'Remove' },
    review: { label: 'In Review', sub: 'forms you’ve been quizzed on', action: 'Remove' },
    learned: { label: 'Learned', sub: 'answered correctly 5 times in a row', action: 'Remove' },
    incomplete: { label: 'Incomplete Verbs', sub: 'started, but not every form learned', action: 'Exclude' },
  };
  function sourceCount(key) {
    if (key === 'custom') return data.custom.length;
    if (key === 'review') return reviewKeys().length;
    if (key === 'learned') return learnedKeys().length;
    if (key === 'incomplete') return incompleteVerbs().filter(id => !isExcluded(id)).length;
    return groupIds(key).filter(id => !isExcluded(id)).length;
  }

  function viewSettings() {
    const s = settings;
    const left = ['je', 'tu', 'il', 'elle', 'on'], right = ['nous', 'vous', 'ils', 'elles'];
    let lastBackup = null; try { lastBackup = +localStorage.getItem('apprenez.lastBackup') || null; } catch (e) { /* ignore */ }
    const node = el(`
      <div class="screen page">
        <header class="bar">
          <button class="icon" data-act="close" aria-label="Back to quiz">${ICON.close}</button>
          <div class="bar-title">Settings</div>
          <div class="bar-right"></div>
        </header>
        <div class="content">
          <section class="group">
            <h2>Number of Questions</h2>
            <div class="stepper">
              <button class="icon round" data-step="-1" aria-label="Fewer questions">−</button>
              <output id="num">${s.num}</output>
              <button class="icon round" data-step="1" aria-label="More questions">+</button>
              <span class="muted">questions per quiz</span>
            </div>
          </section>

          <section class="group">
            <h2>Question Format</h2>
            <h3>Question Type</h3>
            <div class="checks" data-set="types">
              ${check('fill', 'Fill in the blank', s.types.fill)}
              ${check('mc', 'Multiple choice', s.types.mc)}
            </div>
            <p class="warn-note" data-warn="types">Select at least one question type.</p>
            <h3>Question Form</h3>
            <div class="checks" data-set="forms">
              ${check('en', 'English', s.forms.en, 'Questions are shown in English; answer in French')}
              ${check('fr', 'French', s.forms.fr, 'Questions are French sentences with a blank')}
            </div>
            <p class="warn-note" data-warn="forms">Select at least one question form.</p>
          </section>

          <section class="group">
            <h2>Question Content</h2>
            <h3>Pronouns</h3>
            <div class="checks two" data-set="pronouns">
              <div>${left.map(p => check(p, `<span lang="fr">${p}</span>`, s.pronouns[p])).join('')}</div>
              <div>${right.map(p => check(p, `<span lang="fr">${p}</span>`, s.pronouns[p])).join('')}</div>
            </div>
            <p class="warn-note" data-warn="pronouns">Select at least one pronoun.</p>
            <h3>Tenses</h3>
            <div class="checks" data-set="tenses">
              ${V.TENSES.map(t => check(t.id, `<span lang="fr">${t.label}</span>`, s.tenses[t.id])).join('')}
            </div>
            <p class="warn-note" data-warn="tenses">Select at least one tense.</p>
            <h3>Study Content</h3>
            <div class="checks sources" data-set="sources">
              ${Object.entries(SOURCES).map(([id, o]) => `
                <div class="source">
                  <div class="source-row">
                    ${check(id, o.label, s.sources[id], o.sub)}
                    <button class="disclose" data-list="${id}" aria-label="Show ${o.label} list">${fmtNum(sourceCount(id))}<span class="chev">${ICON.chev}</span></button>
                  </div>
                </div>`).join('')}
            </div>
            <p class="warn-note" data-warn="sources">Select at least one kind of study content.</p>
          </section>

          <section class="group">
            <h2>Backup</h2>
            <p class="muted">Save your progress, lists and settings to a file, for example in iCloud Drive. Restore it on this or another device.</p>
            <div class="row-btns">
              <button class="btn" data-act="backup">Save Backup</button>
              <button class="btn" data-act="restore">Restore Backup</button>
            </div>
            <p class="foot-note muted">${lastBackup ? 'Last backup: ' + fmtDate(lastBackup) : 'No backup saved yet.'}</p>
            <input type="file" id="restore-file" accept=".json,application/json" hidden>
          </section>

          <section class="group danger-zone">
            <h2>Delete Data</h2>
            <p class="muted">Removes all of your results, your In Review and Learned lists, your Custom verbs and the verbs you excluded. Your settings and the verb lists themselves are kept.</p>
            <button class="btn danger" data-act="delete">Delete Data</button>
          </section>
          <p class="foot muted">Your progress is stored only on this device.</p>
          <p class="foot muted credits">Verb conjugations from the <a href="https://pauillac.inria.fr/~sagot/index.html#lefff">Lefff</a> by Benoît Sagot (Inria), used under the <a href="data/LICENSE-LGPLLR.txt">LGPL-LR licence</a>.</p>
        </div>
      </div>`);

    $('[data-act="close"]', node).onclick = () => go('quiz');
    const num = $('#num', node);
    $$('[data-step]', node).forEach(b => b.onclick = () => {
      s.num = Math.min(50, Math.max(1, s.num + +b.dataset.step)); num.textContent = s.num; saveSettings();
    });
    const warn = () => {
      const none = o => !Object.values(o).some(Boolean);
      ['types', 'forms', 'pronouns', 'tenses', 'sources'].forEach(k => $(`[data-warn="${k}"]`, node).classList.toggle('show', none(s[k])));
    };
    $$('[data-set]', node).forEach(set => {
      const key = set.dataset.set;
      $$('input[type=checkbox]', set).forEach(inp => inp.onchange = () => { s[key][inp.dataset.id] = inp.checked; saveSettings(); warn(); });
    });
    warn();
    $$('[data-list]', node).forEach(b => b.onclick = () => { listKey = b.dataset.list; listSearch = ''; listMode = 'active'; go('list'); });
    $('[data-act="backup"]', node).onclick = saveBackup;
    const fileIn = $('#restore-file', node);
    $('[data-act="restore"]', node).onclick = () => fileIn.click();
    fileIn.onchange = () => { const f = fileIn.files[0]; fileIn.value = ''; if (f) readBackup(f); };
    $('[data-act="delete"]', node).onclick = confirmDelete;
    if (settingsScroll) { const y = settingsScroll; settingsScroll = 0; requestAnimationFrame(() => window.scrollTo(0, y)); }
    return node;
  }

  /* ---------------- Modal ---------------- */
  function modal({ title, body, cancel = 'Cancel', confirm, danger = false, onConfirm }) {
    const m = el(`
      <div class="modal-back" role="presentation">
        <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-d">
          <h3 id="dlg-t">${esc(title)}</h3>
          <p id="dlg-d">${esc(body)}</p>
          <div class="row">
            <button class="btn" data-act="cancel">${esc(cancel)}</button>
            <button class="btn ${danger ? 'danger solid' : 'primary'}" data-act="confirm">${esc(confirm)}</button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(m);
    requestAnimationFrame(() => m.classList.add('show'));
    const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 200); };
    $('[data-act="cancel"]', m).onclick = close;
    m.addEventListener('click', e => { if (e.target === m) close(); });
    $('[data-act="confirm"]', m).onclick = () => { close(); onConfirm(); };
    $('[data-act="cancel"]', m).focus();
  }

  function confirmDelete() {
    modal({
      title: 'Delete Data', danger: true, confirm: 'Delete Data',
      body: 'Are you sure you want to delete your data? This includes all of your results and custom lists. This data cannot be recovered.',
      onConfirm: () => {
        data = EMPTY_DATA(); saveData();
        if (quiz) quiz.sig = ''; // rebuild unanswered questions on return
        render(); toast('Your data has been deleted.');
      },
    });
  }

  /* ---------------- Backup ---------------- */
  async function saveBackup() {
    const now = new Date();
    const payload = { app: 'apprenez-le-francais', version: 1, exportedAt: now.toISOString(), settings, data };
    const name = `apprenez-backup-${now.toISOString().slice(0, 10)}.json`;
    const text = JSON.stringify(payload);
    const markSaved = () => { try { localStorage.setItem('apprenez.lastBackup', String(Date.now())); } catch (e) { /* ignore */ } render(); };
    let file = null;
    try { file = new File([text], name, { type: 'application/json' }); } catch (e) { /* old browser */ }
    // iPhone: the share sheet offers "Save to Files"
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Apprenez le français ! backup' }); markSaved(); toast('Backup saved.'); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = el(`<a href="${url}" download="${name}"></a>`);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      markSaved(); toast('Backup downloaded.');
    } catch (e) { toast('This browser could not save the file.'); }
  }

  function readBackup(file) {
    const r = new FileReader();
    r.onload = () => {
      let b;
      try { b = JSON.parse(r.result); } catch (e) { b = null; }
      if (!b || b.app !== 'apprenez-le-francais' || !b.data || typeof b.data.forms !== 'object') {
        toast('That file isn’t an Apprenez backup.'); return;
      }
      const when = b.exportedAt ? fmtDate(Date.parse(b.exportedAt)) : 'an unknown date';
      const n = Object.keys(b.data.forms).length;
      modal({
        title: 'Restore Backup', confirm: 'Restore',
        body: `Restore the backup from ${when} (${fmtNum(n)} verb ${n === 1 ? 'form' : 'forms'} studied)? It replaces your current progress, lists and settings.`,
        onConfirm: () => {
          settings = migrateSettings(b.settings || null); saveSettings();
          data = Object.assign(EMPTY_DATA(), b.data); saveData();
          if (quiz) quiz.sig = '';
          render(); toast('Backup restored.');
        },
      });
    };
    r.readAsText(file);
  }

  /* ---------------- Verb list pages ---------------- */
  let listKey = 'common', listSearch = '', listMode = 'active', settingsScroll = 0;
  let listRestore = null, listShown = 0, verbId = null;
  const CHUNK = 80;

  function listItems() {
    const q = V.strip(V.norm(listSearch));
    const match = (...xs) => !q || xs.some(x => V.strip((x || '').toLowerCase()).includes(q));
    const verbItem = id => {
      const v = V.BY_ID[id];
      return v && { key: id, verb: id, title: id, sub: V.englishGloss(v), fr: true, star: isCustom(id) };
    };
    let items;
    if (listKey === 'review' || listKey === 'learned') {
      const keys = listKey === 'review'
        ? reviewKeys().sort((a, b) => (data.forms[b].last || 0) - (data.forms[a].last || 0))
        : learnedKeys().sort((a, b) => data.forms[b].learnedAt - data.forms[a].learnedAt);
      items = keys.map(k => {
        const f = data.forms[k], p = V.parseKey(k);
        return {
          key: k, verb: p.id, title: V.formLabel(k), fr: true,
          sub: `${p.id} · ${V.TENSE_LABEL[p.tense] || p.tense}` + (listKey === 'review' ? ` · ${typeName(f.type)}` : ` · learned ${fmtDate(f.learnedAt)}`),
          right: listKey === 'review' ? dots(f.streak) : '', match: p.id,
        };
      });
    } else if (listKey === 'custom') {
      items = data.custom.map(verbItem).filter(Boolean);
    } else if (listKey === 'incomplete') {
      const vs = verbStats();
      items = incompleteVerbs().filter(id => !isExcluded(id)).map(id => {
        const it = verbItem(id), n = V.nForms(V.BY_ID[id]);
        it.sub = `${vs[id].learned} of ${n} forms learned`;
        it.right = `<span class="bar"><i style="width:${(vs[id].learned / n) * 100}%"></i></span>`;
        return it;
      });
    } else {
      const ids = groupIds(listKey).filter(id => (listMode === 'excluded') === isExcluded(id));
      items = ids.map(verbItem);
    }
    return items.filter(it => match(it.title, it.sub, it.match));
  }

  function viewList() {
    const src = SOURCES[listKey];
    const isGroup = ['common', 'g1', 'g2', 'g3'].includes(listKey);
    const excludedCount = isGroup ? groupIds(listKey).filter(isExcluded).length : 0;
    if (listMode === 'excluded' && !excludedCount) listMode = 'active';
    const restoring = listMode === 'excluded';
    const actionLabel = restoring ? 'Restore' : src.action;
    let items = listItems();
    const total = items.length;
    const node = el(`
      <div class="screen page list-page">
        <header class="bar">
          <button class="icon back-text" data-act="back" aria-label="Back to Settings">${ICON.back}<span>Settings</span></button>
          <div class="bar-title">${esc(src.label)}</div>
          <div class="bar-right"><button class="text-btn" data-act="edit">Edit</button></div>
        </header>
        <div class="list-tools">
          <label class="search"><span class="sr">Search</span>
            <input type="search" placeholder="Search ${esc(src.label)}" value="${esc(listSearch)}" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">
          </label>
          ${isGroup && excludedCount ? `<div class="seg small" role="tablist">
              <button role="tab" data-mode="active" aria-selected="${!restoring}">Included</button>
              <button role="tab" data-mode="excluded" aria-selected="${restoring}">Excluded (${fmtNum(excludedCount)})</button>
            </div>` : ''}
          <p class="list-count muted"><span data-count>${fmtNum(total)}</span> <span data-noun>${noun(total)}</span>${total ? ` · swipe left to ${actionLabel.toLowerCase()}` : ''}</p>
        </div>
        <ul class="swipe-list ${restoring ? 'restoring' : ''}" role="list"></ul>
        <div class="sentinel"></div>
        <p class="empty list-empty">${listSearch ? 'No matches.' : restoring ? '' : emptyText(listKey)}</p>
      </div>`);
    const ul = $('.swipe-list', node), sentinel = $('.sentinel', node), emptyP = $('.list-empty', node), countEl = $('[data-count]', node);
    emptyP.hidden = total > 0;
    let shown = 0;
    const renderMore = () => {
      const frag = document.createDocumentFragment();
      items.slice(shown, shown + CHUNK).forEach(it => frag.appendChild(row(it)));
      shown = Math.min(items.length, shown + CHUNK);
      listShown = shown;
      ul.appendChild(frag);
    };
    const row = it => {
      const li = el(`
        <li class="sw">
          <button class="sw-act ${restoring ? 'restore' : ''}" tabindex="-1">${actionLabel}</button>
          <div class="sw-main">
            <div class="sw-text"><span class="f" ${it.fr ? 'lang="fr"' : ''}>${esc(it.title)}${it.star ? `<span class="chip-star">${ICON.star}</span>` : ''}</span><span class="meta">${esc(it.sub)}</span></div>
            ${it.right || ''}<span class="row-chev">${ICON.chev}</span>
            <button class="sw-inline ${restoring ? 'restore' : ''}" aria-label="${actionLabel} ${esc(it.title)}">${actionLabel}</button>
          </div>
        </li>`);
      li._item = it;
      attachSwipe(li, () => act(li));
      $('.sw-act', li).onclick = () => act(li);
      $('.sw-inline', li).onclick = e => { e.stopPropagation(); act(li); };
      $('.sw-main', li).addEventListener('click', e => {
        if (e.target.closest('.sw-inline') || li.classList.contains('open') || !V.BY_ID[it.verb]) return;
        verbId = it.verb; go('verb');
      });
      return li;
    };
    function act(li) {
      const it = li._item;
      const undo = perform(it.key, restoring);
      items = items.filter(x => x !== it); shown--;
      countEl.textContent = fmtNum(items.length); $('[data-noun]', node).textContent = noun(items.length);
      li.style.height = li.offsetHeight + 'px';
      li.classList.add('removing');
      requestAnimationFrame(() => { li.style.height = '0px'; });
      setTimeout(() => { li.remove(); emptyP.hidden = items.length > 0; }, 260);
      toastUndo(undoMessage(it), () => { undo(); render(); });
    }
    renderMore();
    if (listRestore) {
      const r = listRestore; listRestore = null;
      while (shown < Math.min(items.length, r.shown)) renderMore();
      requestAnimationFrame(() => window.scrollTo(0, r.y));
    }
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting && shown < items.length) renderMore(); }, { rootMargin: '600px' });
      io.observe(sentinel);
    } else { while (shown < items.length) renderMore(); }

    $('[data-act="back"]', node).onclick = () => go('settings');
    const editBtn = $('[data-act="edit"]', node);
    editBtn.onclick = () => { const on = ul.classList.toggle('editing'); editBtn.textContent = on ? 'Done' : 'Edit'; closeOpenRow(); };
    $$('[data-mode]', node).forEach(b => b.onclick = () => { listMode = b.dataset.mode; render(); });
    const search = $('input[type=search]', node);
    let t;
    search.oninput = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        listSearch = search.value; items = listItems(); shown = 0; ul.innerHTML = '';
        countEl.textContent = fmtNum(items.length); $('[data-noun]', node).textContent = noun(items.length); emptyP.textContent = listSearch ? 'No matches.' : emptyText(listKey);
        emptyP.hidden = items.length > 0; renderMore();
      }, 120);
    };
    return node;
  }

  const noun = n => (listKey === 'review' || listKey === 'learned' ? (n === 1 ? 'form' : 'forms') : (n === 1 ? 'verb' : 'verbs'));
  /* ---------------- Verb page ---------------- */
  const GROUP_NAME = { 1: 'first group', 2: 'second group', 3: 'third group' };
  const AUX_NAME = { a: 'avoir', e: 'être', E: 'être or avoir' };
  function viewVerb() {
    const v = V.BY_ID[verbId];
    const backLabel = SOURCES[listKey] ? SOURCES[listKey].label : 'Back';
    const slotLabel = ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'];
    const cell = (tense, slot) => {
      const pr = V.SLOT_PRONOUN[slot];
      const p = V.verbPart(v, tense, pr);
      if (!p) return `<div class="vf missing"><span class="pr">${slotLabel[slot]}</span> —</div>`;
      const a = V.assemble(pr, v, p.canon);
      // split "j'ai" / "il se lève" into pronoun part and verb part
      let pron = a.prefix, rest = p.canon;
      if (slot === 2 && !v.impersonal) pron = pron.replace(/^il/, 'il/elle/on');
      if (slot === 5) pron = pron.replace(/^ils/, 'ils/elles');
      const alt = !['pc', 'pqp', 'fa', 'cp'].includes(tense) && p.alts.length > 1 ? `<span class="alt"> or ${esc(p.alts.slice(1).join(', '))}</span>` : '';
      const f = data.forms[V.formKey(v.id, tense, slot)];
      const learned = f && f.learnedAt ? '<i class="ldot" title="Learned"></i>' : '';
      const sep = pron.endsWith("'") ? '' : ' ';
      return `<div class="vf"><span class="pr">${esc(pron)}</span>${sep}<span class="fv">${esc(rest)}</span>${alt}${learned}</div>`;
    };
    const node = el(`
      <div class="screen page verb-page">
        <header class="bar">
          <button class="icon back-text" data-act="back" aria-label="Back to ${esc(backLabel)}">${ICON.back}<span>${esc(backLabel)}</span></button>
          <div class="bar-title"></div>
          <div class="bar-right"><button class="icon star" data-act="star">${ICON.star}</button></div>
        </header>
        <div class="content">
          <h1 class="verb-title" lang="fr">${esc(v.id)}</h1>
          <p class="verb-sub">${esc(V.englishGloss(v))} · ${GROUP_NAME[v.group]} · ${AUX_NAME[v.aux]}</p>
          <p class="verb-legend"><i class="ldot"></i>learned form</p>
          ${V.TENSES.map(t => `
            <section class="vt">
              <h2 lang="fr" style="color:${TENSE_COLOR[t.id]}">${esc(t.label)}</h2>
              <div class="q-rule"></div>
              <div class="vgrid" lang="fr">${[0, 3, 1, 4, 2, 5].map(s => cell(t.id, s)).join('')}</div>
            </section>`).join('')}
        </div>
      </div>`);
    $('[data-act="back"]', node).onclick = () => go('list');
    const star = $('[data-act="star"]', node);
    const setStar = () => {
      const on = isCustom(v.id);
      star.classList.toggle('on', on); star.setAttribute('aria-pressed', on);
      star.setAttribute('aria-label', on ? 'Remove from Custom list' : 'Add to Custom list');
    };
    setStar();
    star.onclick = () => { const on = toggleCustom(v.id); setStar(); toast(on ? `${v.id} added to Custom` : `${v.id} removed from Custom`); };
    return node;
  }

  function emptyText(key) {
    return {
      custom: 'Tap the star on a quiz question to add its verb here.',
      review: 'Forms appear here after you answer them in a quiz.',
      learned: 'Nothing learned yet. Answer a form correctly five times in a row to learn it.',
      incomplete: 'Verbs you’ve started appear here until all their forms are learned.',
    }[key] || 'Every verb in this list is excluded.';
  }
  function undoMessage(it) {
    if (listKey === 'custom') return `Removed ${it.title} from Custom`;
    if (listKey === 'review' || listKey === 'learned') return `Removed ${it.title}`;
    return listMode === 'excluded' ? `${it.title} is back in your study lists` : `Excluded ${it.title} from study`;
  }
  // Apply the list action and return an undo function
  function perform(key, restoring) {
    if (listKey === 'custom') {
      const i = data.custom.indexOf(key); data.custom.splice(i, 1); saveData();
      return () => { data.custom.splice(i, 0, key); saveData(); };
    }
    if (listKey === 'review' || listKey === 'learned') {
      const rec = data.forms[key]; delete data.forms[key]; saveData();
      return () => { data.forms[key] = rec; saveData(); };
    }
    if (restoring) {
      data.excluded = data.excluded.filter(x => x !== key); saveData();
      return () => { data.excluded.push(key); saveData(); };
    }
    data.excluded.push(key); saveData();
    return () => { data.excluded = data.excluded.filter(x => x !== key); saveData(); };
  }

  /* Swipe left on a row to reveal its action; a long swipe performs it. */
  let openRow = null;
  function closeOpenRow() { if (openRow) { openRow.classList.remove('open'); $('.sw-main', openRow).style.transform = ''; openRow = null; } }
  document.addEventListener('pointerdown', e => { if (openRow && !openRow.contains(e.target)) closeOpenRow(); }, true);
  function attachSwipe(li, perform) {
    const main = $('.sw-main', li), W = 92;
    let x0 = 0, y0 = 0, dx = 0, base = 0, down = false, decided = false, horiz = false, moved = false;
    li.addEventListener('pointerdown', e => {
      if (e.button > 0 || li.parentElement.classList.contains('editing')) return;
      down = true; decided = false; horiz = false; moved = false; x0 = e.clientX; y0 = e.clientY;
      base = li.classList.contains('open') ? -W : 0; dx = base;
    });
    li.addEventListener('pointermove', e => {
      if (!down) return;
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (!decided) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        decided = true; horiz = Math.abs(mx) > Math.abs(my);
        if (horiz) { try { li.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } if (openRow && openRow !== li) closeOpenRow(); main.style.transition = 'none'; }
      }
      if (!horiz) return;
      moved = true;
      dx = Math.min(0, base + mx);
      main.style.transform = `translateX(${dx}px)`;
      li.classList.toggle('full', dx < -li.offsetWidth * 0.6);
    });
    const end = () => {
      if (!down) return;
      down = false; main.style.transition = '';
      if (!horiz) return;
      if (dx < -li.offsetWidth * 0.6) { main.style.transform = `translateX(-100%)`; perform(); return; }
      if (dx < -W / 2) { li.classList.add('open'); main.style.transform = `translateX(-${W}px)`; openRow = li; }
      else { li.classList.remove('open', 'full'); main.style.transform = ''; if (openRow === li) openRow = null; }
    };
    li.addEventListener('pointerup', end);
    li.addEventListener('pointercancel', end);
    li.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  }

  let undoTimer;
  function toastUndo(msg, undo) {
    let t = $('#toast');
    if (!t) { t = el('<div id="toast" role="status"></div>'); document.body.appendChild(t); }
    t.innerHTML = `<span>${esc(msg)}</span><button class="undo">Undo</button>`;
    t.classList.add('show', 'has-action');
    clearTimeout(toastTimer); clearTimeout(undoTimer);
    const hide = () => { t.classList.remove('show', 'has-action'); };
    $('.undo', t).onclick = () => { hide(); undo(); };
    undoTimer = setTimeout(hide, 5000);
  }

  /* ---------------- Progress ---------------- */
  let range = '30';
  function stats() {
    const since = range === '30' ? Date.now() - 30 * DAY : 0;
    const ev = data.events.filter(e => e.t >= since);
    const vs = verbStats();
    return {
      forms: new Set(ev.map(e => e.k)).size,
      answered: ev.length,
      wrong: ev.filter(e => !e.ok).length,
      complete: Object.keys(vs).filter(id => V.BY_ID[id] && vs[id].learned >= V.nForms(V.BY_ID[id]) && vs[id].lastLearned >= since).length,
      review: reviewKeys().length, learned: learnedKeys().length,
    };
  }
  function viewProgress() {
    const st = stats();
    const node = el(`
      <div class="screen page">
        <header class="bar">
          <button class="icon" data-act="close" aria-label="Back to quiz">${ICON.close}</button>
          <div class="bar-title"></div>
          <div class="bar-right">
            <div class="seg" role="tablist" aria-label="Date range">
              <button role="tab" data-r="30" aria-selected="${range === '30'}">30 days</button>
              <button role="tab" data-r="all" aria-selected="${range === 'all'}">Lifetime</button>
            </div>
          </div>
        </header>
        <div class="content">
          <h1 class="page-h1">Progress</h1>
          <p class="range-note muted">${range === '30' ? 'Last 30 days' : 'All time'}</p>
          <div class="tiles">
            <div class="tile">
              <div class="t-num">${st.forms}</div>
              <div class="t-label">Verb forms studied</div>
              <div class="t-note">${st.answered} ${st.answered === 1 ? 'question' : 'questions'} answered</div>
            </div>
            <div class="tile">
              <div class="t-num">${st.complete}</div>
              <div class="t-label">Complete verbs learnt</div>
              <div class="t-note">every form, in all ${V.TENSES.length} tenses, learned</div>
            </div>
            <div class="tile">
              <div class="t-num">${st.wrong}</div>
              <div class="t-label">Incorrect answers</div>
              <div class="t-note">still wrong after all tries</div>
            </div>
          </div>
          <div class="sub-stats">
            <div><span class="s-num">${st.review}</span><span class="muted">forms in review</span></div>
            <div><span class="s-num">${st.learned}</span><span class="muted">forms learned</span></div>
          </div>
        </div>
      </div>`);
    $('[data-act="close"]', node).onclick = () => go('quiz');
    $$('[data-r]', node).forEach(b => b.onclick = () => { range = b.dataset.r; render(); });
    return node;
  }

  /* ---------------- Boot ---------------- */
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();

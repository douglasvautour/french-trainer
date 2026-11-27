/* Apprenez le français ! — app */
(function () {
  const APP_VERSION = '18';
  'use strict';
  const V = window.Verbs;
  const S = window.Sentences;
  const N = window.Nouns;
  /* CEFR levels: words from FLELex (levels.js), grammar from the usual order of French courses */
  const LV_LIST = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const LV_NAME = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper intermediate', C1: 'Advanced', C2: 'Proficient' };
  const LV = { v: {}, n: {} };
  if (window.LEVELS) ['v', 'n'].forEach(t => Object.entries(window.LEVELS[t] || {}).forEach(([l, ws]) => ws.split(' ').forEach(w => { LV[t][w] = l; })));
  const verbLevel = v => LV.v[v.inf] || null;
  const nounLevel = n => LV.n[n.w] || null;
  const GRAMMAR_LEVEL = { present: 'A1', pc: 'A1', imperatif: 'A1', imparfait: 'A2', futur: 'A2', cond: 'A2', pqp: 'B1', subj: 'B1', cp: 'B1', fa: 'B2', ps: 'C1',
    subj_pron: 'A1', refl: 'A1', do: 'A2', io: 'A2', y: 'A2', en: 'A2', order: 'B1', modal: 'A2', def: 'A1', ind: 'A1', part: 'A1', pos: 'A1', dem: 'A1', plural: 'A1' };
  const lvTag = l => (l ? ` <span class="lvl lvl-${l}" title="CEFR level ${l}">${l}</span>` : '');
  const LV_KEYS = LV_LIST.map(l => 'lv' + l);
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
    answerForms: { verb: true, pron: true },
    objPron: { do: true, io: true, refl: true, y: true, en: true },
    otherVerbs: { modal: false },
    pronouns: Object.fromEntries(V.PRONOUNS.map(p => [p, true])),
    tenses: Object.fromEntries(V.TENSES.map(t => [t.id, ['present', 'pc', 'imparfait', 'futur'].includes(t.id)])),
    sources: { common: true, g1: false, g2: false, g3: false, custom: false, review: false, learned: false, incorrect: false, lvA1: false, lvA2: false, lvB1: false, lvB2: false, lvC1: false, lvC2: false },
  });
  const EMPTY_DATA = () => ({ custom: [], excluded: [], forms: {}, events: [], missed: {} });
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
  /* Two modules, each with its own settings and data:
     vp = Verbs & Pronouns (sentences), vb = Verbs (every form of a tense at once) */
  const KEYS = { vp: { s: KEY_S, d: KEY_D }, vb: { s: 'apprenez.vb.settings.v1', d: 'apprenez.vb.data.v1' }, nd: { s: 'apprenez.nd.settings.v1', d: 'apprenez.nd.data.v1' } };
  const MOD_NAME = { vp: 'Verbs & Pronouns', vb: 'Verbs', nd: 'Nouns & Determiners' };
  const MOD_SHORT = { vp: 'Verbs & Pronouns', vb: 'Verbs', nd: 'Nouns' }; // quiz header, next to four icons
  const MODS = ['vb', 'vp', 'nd'];
  const DEFAULT_ND = () => ({
    num: 10,
    types: { fill: true, dnd: true, mc: true },
    forms: { en: true, fr: true },
    answerForms: { noun: true, det: true },
    dets: { def: true, ind: true, part: true, pos: true, dem: true },
    nouns: { plural: true },
    sources: { common: true, g1: false, g2: false, custom: false, review: false, learned: false, incorrect: false, lvA1: false, lvA2: false, lvB1: false, lvB2: false, lvC1: false, lvC2: false },
  });
  const DEFAULT_VB = () => ({
    num: 10,
    types: { fill: true, dnd: true },
    tenses: Object.fromEntries(V.TENSES.map(t => [t.id, ['present', 'pc', 'imparfait', 'futur'].includes(t.id)])),
    sources: { common: true, g1: false, g2: false, g3: false, custom: false, review: false, learned: false, incorrect: false, lvA1: false, lvA2: false, lvB1: false, lvB2: false, lvC1: false, lvC2: false },
  });
  const settingsFor = (m, raw) => (m === 'vb' ? merge(DEFAULT_VB(), raw) : m === 'nd' ? merge(DEFAULT_ND(), raw) : migrateSettings(raw));
  const dataFor = raw => Object.assign(EMPTY_DATA(), raw || {});
  let mod = 'vp';
  let settings = settingsFor('vp', load(KEY_S, null));
  let data = dataFor(load(KEY_D, {}));
  const saveSettings = () => save(KEYS[mod].s, settings);
  const saveData = () => save(KEYS[mod].d, data);
  saveSettings();
  function setModule(m) {
    if (m === mod) return;
    mod = m;
    settings = settingsFor(m, load(KEYS[m].s, null));
    data = dataFor(load(KEYS[m].d, {}));
    if (m === 'vp') data.excluded = [];
    saveSettings();
    quiz = null; listKey = 'common'; range = '30';
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }

  /* ---------------- Learning data ---------------- */
  const known = id => (mod === 'nd' ? !!N.BY_ID[id] : !!V.BY_ID[id]);
  const knownKey = k => known(k.split('|')[0]); // ignore forms of words no longer in the list
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
    if (q.nd) return recordN(q, ok);
    const k = V.formKey(q.verb.id, q.tense, V.SLOT[q.pronoun]);
    const now = Date.now();
    const f = data.forms[k] || (data.forms[k] = { streak: 0, correct: 0, wrong: 0, seen: 0, first: now, learnedAt: null });
    f.seen++; f.last = now; f.type = q.kind; f.answer = q.ans.full;
    if (ok) { f.correct++; f.streak++; if (f.streak >= 5 && !f.learnedAt) f.learnedAt = now; }
    else { f.wrong++; f.streak = 0; f.learnedAt = null; }
    data.events.push({ t: now, k, ok: ok ? 1 : 0, ty: q.kind, tn: q.tense });
    // Incorrect Answers: the exact phrase is kept until it's answered correctly
    const mk = [q.verb.id, q.tense, q.pronoun, q.ans.full].join('|');
    if (ok) delete data.missed[mk];
    else data.missed[mk] = { v: q.verb.id, t: q.tense, p: q.pronoun, pi: q.patIndex, pt: q.patType, spec: q.spec, mode: q.mode, full: q.ans.full, en: q.english, at: now,
      inner: q.inner ? q.inner.id : undefined };
    saveData();
  }
  const missedKeys = () => Object.keys(data.missed).filter(k => known(data.missed[k].v)).sort((a, b) => data.missed[b].at - data.missed[a].at);
  const isCustom = id => data.custom.includes(id);
  data.excluded = []; // excluding verbs from lists was removed; nothing stays hidden
  const groupIds = key => key.startsWith('lv') ? (mod === 'nd' ? N.NOUNS.filter(n => nounLevel(n) === key.slice(2)).map(n => n.id) : V.VERBS.filter(v => verbLevel(v) === key.slice(2)).map(v => v.id))
    : mod === 'nd' ? N.NOUNS.filter(n => n.group === key).map(n => n.id) : V.VERBS.filter(v => (key === 'common' ? v.common : v.group === +key.slice(1))).map(v => v.id);
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
    ['common', 'g1', 'g2', 'g3', ...LV_KEYS].forEach(k => { if (src[k]) groupIds(k).forEach(id => ids.add(id)); });
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
    // missed phrases come back exactly as they were asked, whatever the tense and pronoun settings
    if (src.incorrect) missedKeys().forEach(k => { const m = data.missed[k]; forms.push({ id: m.v, tense: m.t, pronoun: m.p, miss: k }); });
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

  const COMMON_IDS = V.VERBS.filter(x => x.common).map(x => x.id);
  function makeQuestion(c) {
    const kinds = [settings.types.fill && 'fill', settings.types.mc && 'mc'].filter(Boolean);
    const forms = [settings.forms.en && 'en', settings.forms.fr && 'fr'].filter(Boolean);
    const v = V.BY_ID[c.id];
    const af = settings.answerForms;
    // sentence patterns this verb allows, limited to the pronoun types switched on
    const all = S.parse(v.pats);
    let pat, mode, spec;
    const m = c.miss && data.missed[c.miss];
    if (m) {
      // replay a missed phrase: same pattern, same pronouns, same thing to fill in
      if (!m.inner) pat = all[m.pi] && all[m.pi].type === m.pt ? all[m.pi] : all.find(p => p.type === m.pt);
      if (!pat && !m.inner) { delete data.missed[c.miss]; saveData(); return null; }
      mode = m.mode; spec = m.spec;
    } else {
      let pats = all.filter(p => p.cats.every(k => settings.objPron[k]));
      if (!af.verb) pats = pats.filter(p => p.type !== 'S');
      if (!pats.length) return null;
      pat = pick(pats);
      mode = af.verb && af.pron ? pick(pat.type === 'S' ? ['verb', 'both'] : ['verb', 'pron', 'both']) : af.verb ? 'verb' : 'pron';
    }
    // Modal verbs + infinitive ("je peux le faire"): the modal is conjugated, the infinitive carries the pronouns
    let b = null, modal = null, inner = null, ipats = all;
    if (m && m.inner) {
      modal = v; inner = V.BY_ID[m.inner];
      if (inner) { ipats = S.parse(inner.pats); pat = ipats[m.pi] && ipats[m.pi].type === m.pt ? ipats[m.pi] : ipats.find(p => p.type === m.pt); }
      b = inner && pat ? S.buildModal(modal, inner, c.tense, c.pronoun, pat, mode, spec) : null;
      if (!b) { delete data.missed[c.miss]; saveData(); return null; }
    } else if (!m && settings.otherVerbs.modal && c.tense !== 'imperatif') {
      const usable = p => p.cats.every(k => settings.objPron[k]) && (af.verb || p.type !== 'S');
      const pickMode = p => (af.verb && af.pron ? pick(p.type === 'S' ? ['verb', 'both'] : ['verb', 'pron', 'both']) : af.verb ? 'verb' : 'pron');
      if (S.isModal(v.id) && Math.random() < 0.7) {
        // the drawn verb is a modal: pair it with a Common Verb that fits
        modal = v;
        for (let k = 0; k < 30 && !b; k++) {
          const iv = V.BY_ID[pick(modal.id === 'savoir' ? [...S.SKILLS] : COMMON_IDS)];
          if (!iv) continue;
          const ps = S.parse(iv.pats).filter(p => usable(p) && S.modalOk(modal.id, iv, p, c.pronoun));
          if (!ps.length) continue;
          const ip = pick(ps); b = S.buildModal(modal, iv, c.tense, c.pronoun, ip, pickMode(ip));
          if (b) { inner = iv; ipats = S.parse(iv.pats); pat = ip; mode = b.mode; }
        }
        if (!b) modal = null;
      } else if (!S.isModal(v.id) && Math.random() < 0.4) {
        // the drawn verb becomes the infinitive after a modal that fits
        const opts = S.MODALS.filter(id => all.some(p => usable(p) && S.modalOk(id, v, p, c.pronoun)));
        if (opts.length) {
          modal = V.BY_ID[pick(opts)];
          const ps = all.filter(p => usable(p) && S.modalOk(modal.id, v, p, c.pronoun));
          const ip = pick(ps);
          b = S.buildModal(modal, v, c.tense, c.pronoun, ip, pickMode(ip));
          if (b) { inner = v; pat = ip; mode = b.mode; } else modal = null;
        }
      }
    }
    if (!b) b = S.build(v, c.tense, c.pronoun, pat, mode, spec);
    if (!b) return null; // form doesn't exist (e.g. "je faut")
    const cv = modal || v; // the conjugated verb
    const q = { verb: cv, inner, study: v, tense: c.tense, pronoun: c.pronoun, kind: pick(kinds), form: pick(forms), mode,
      ans: b.ans, before: b.before, after: b.after, english: b.english, cues: b.cues || [],
      spec: b.spec, patIndex: (inner ? ipats : all).indexOf(pat), patType: pat.type };
    if (q.kind === 'mc') {
      const opts = [b.ans.blank].concat(S.options(b, cv, c.tense, c.pronoun));
      if (opts.length < 3) q.kind = 'fill';
      else {
        const order = V.shuffle(opts.map((_, i) => i));
        q.options = order.map(i => opts[i]);
        q.correctIndex = order.indexOf(0);
      }
    }
    return q;
  }

  function settingsProblem() {
    if (mod === 'nd') {
      const none = o => !Object.values(o).some(Boolean);
      if (none(settings.types)) return 'Choose at least one question type in Settings.';
      if (none(settings.forms)) return 'Choose at least one question form in Settings.';
      if (none(settings.answerForms)) return 'Choose at least one answer form in Settings.';
      if (!settings.answerForms.noun && none(settings.dets)) return 'Choose a determiner in Settings, or tick Nouns under Answer Form.';
      if (none(settings.sources)) return 'Choose some study content in Settings.';
      return null;
    }
    if (mod === 'vb') {
      if (!settings.types.fill && !settings.types.dnd) return 'Choose at least one question type in Settings.';
      if (!selTenses().length) return 'Choose at least one tense in Settings.';
      return null;
    }
    if (!settings.types.fill && !settings.types.mc) return 'Choose at least one question type in Settings.';
    if (!settings.forms.en && !settings.forms.fr) return 'Choose English or French under Question Form in Settings.';
    if (!settings.answerForms.verb && !settings.answerForms.pron) return 'Choose Verbs or Pronouns under Answer Form in Settings.';
    if (!settings.answerForms.verb && !Object.values(settings.objPron).some(Boolean)) return 'Answer Form is set to Pronouns only, so switch on at least one type under Other Pronouns in Settings.';
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
      const k = c.miss || c.id + '|' + c.tense + '|' + c.pronoun;
      if (used.has(k) && used.size < Math.min(pool.size, n)) continue; // avoid repeats when we can
      const q = makeQuestion(c);
      if (!q) continue;
      used.add(k); out.push(q);
    }
    return out;
  }

  const MISSED_NOTE = 'Check Incorrect Answers to try again!';
  let quiz = null;
  const sigOf = () => JSON.stringify(settings);
  const NO_MATCH = 'No verbs match your Study Content selection yet. Open Settings to choose what to study.';

  function newQuiz() {
    const problem = settingsProblem();
    const qs = problem ? [] : mod === 'vb' ? buildVQuestions(settings.num) : mod === 'nd' ? buildNQuestions(settings.num) : buildQuestions(settings.num);
    quiz = { qs, i: 0, tries: 0, state: 'ask', draft: '', picked: null, lastOk: null, results: [], done: false, sig: sigOf(), problem: problem || (qs.length ? null : NO_MATCH) };
  }

  // After visiting Settings: rebuild the questions that haven't been answered yet
  function refreshQuizIfNeeded() {
    if (!quiz || quiz.done || quiz.sig === sigOf()) return;
    quiz.sig = sigOf();
    const keep = quiz.state === 'answered' ? quiz.i + 1 : quiz.i;
    const problem = settingsProblem();
    const fresh = problem ? [] : (mod === 'vb' ? buildVQuestions : mod === 'nd' ? buildNQuestions : buildQuestions)(Math.max(0, settings.num - keep));
    quiz.qs = quiz.qs.slice(0, keep).concat(fresh);
    if (!quiz.qs.length) { quiz.problem = problem || NO_MATCH; return; }
    quiz.problem = null;
    if (quiz.state === 'ask') { quiz.tries = 0; quiz.draft = ''; quiz.w = null; }
    if (quiz.i >= quiz.qs.length) quiz.done = true;
  }

  // One colour per tense, in checklist order (deep shades of a pastel rainbow)
  const TENSE_COLOR = {
    present: '#872222', pc: '#874C22', imparfait: '#876D22', futur: '#4C8722', cond: '#228754',
    pqp: '#228787', fa: '#225D87', subj: '#222A87', cp: '#542287', ps: '#872265', imperatif: '#7A4A1E',
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
    tag: svg('<path d="M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5l8 8-9 9-8-8z"/><circle cx="8" cy="8" r="1.6"/>'),
    grid: svg('<rect x="3.5" y="4" width="7" height="4" rx="1"/><rect x="13.5" y="4" width="7" height="4" rx="1"/><rect x="3.5" y="10" width="7" height="4" rx="1"/><rect x="13.5" y="10" width="7" height="4" rx="1"/><rect x="3.5" y="16" width="7" height="4" rx="1"/><rect x="13.5" y="16" width="7" height="4" rx="1"/>'),
    ret: svg('<path d="M20 5v6a3 3 0 0 1-3 3H6"/><path d="M10 10l-4 4 4 4"/>', 'stroke-width="2"'),
    book: svg('<path d="M12 6.5C10 5 7.5 4.5 4 4.8v13.4c3.5-.3 6 .2 8 1.8 2-1.6 4.5-2.1 8-1.8V4.8c-3.5-.3-6 .2-8 1.7z"/><path d="M12 6.5V20"/>'),
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
    app.appendChild({ home: viewHome, quiz: viewQuiz, settings: viewSettings, progress: viewProgress, list: viewList, verb: viewVerb, guide: viewGuide, meanings: viewMeanings, noun: viewNoun, nmeanings: viewNMeanings }[view]());
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
          <p class="eyebrow">Let’s Learn French!</p>
          <h1>Apprenez le français&nbsp;!</h1>
          <div class="rule"></div>
        </header>
        <ul class="modules">
          <li>
            <button class="module" data-go="quiz" data-mod="vb">
              <span class="m-icon">${ICON.grid}</span>
              <span class="m-text"><span class="m-title">Verbs</span><span class="m-sub">every form of a tense at once</span></span>
              <span class="m-chev">${ICON.chev}</span>
            </button>
          </li>
          <li>
            <button class="module" data-go="quiz" data-mod="vp">
              <span class="m-icon">${ICON.verbs}</span>
              <span class="m-text"><span class="m-title">Verbs &amp; Pronouns</span><span class="m-sub">${n} verbs · ${V.TENSES.length} tenses</span></span>
              <span class="m-chev">${ICON.chev}</span>
            </button>
          </li>
          <li>
            <button class="module" data-go="quiz" data-mod="nd">
              <span class="m-icon">${ICON.tag}</span>
              <span class="m-text"><span class="m-title">Nouns &amp; Determiners</span><span class="m-sub">${fmtNum(N.NOUNS.length)} nouns · 5 kinds of determiner</span></span>
              <span class="m-chev">${ICON.chev}</span>
            </button>
          </li>
        </ul>
      </main>`);
    $$('[data-mod]', node).forEach(b => b.onclick = () => { setModule(b.dataset.mod); go('quiz'); });
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
          <div class="bar-title">${esc(MOD_SHORT[mod])}</div>
          <div class="bar-right">
            <button class="icon star" data-act="star" aria-label="Add verb to Custom list" ${showQ ? '' : 'disabled'}>${ICON.star}</button>
            <button class="icon" data-act="guide" aria-label="Grammar guide">${ICON.book}</button>
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
    $('[data-act="guide"]', node).onclick = () => openGuide();
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
    if (mod === 'vb') { renderVQuestion(node, qa, aa, q, starBtn); return node; }

    const setStar = () => {
      const on = isCustom((q.study || q.verb).id);
      starBtn.classList.toggle('on', on);
      starBtn.setAttribute('aria-pressed', on);
      starBtn.setAttribute('aria-label', on ? 'Remove from Custom list' : 'Add to Custom list');
    };
    setStar();
    starBtn.onclick = () => { const sid = (q.study || q.verb).id; const on = toggleCustom(sid); setStar(); const nm = q.nd ? q.noun.w : sid; toast(on ? `${nm} added to Custom` : `${nm} removed from Custom`); };

    // Question
    const tl = q.label || V.TENSE_LABEL[q.tense];
    const blankHtml = `<span class="blank"><span class="blank-fill"></span></span>`;
    const scaffold = (q.before ? esc(cap(q.before)) + (/['-]$/.test(q.before) ? '' : ' ') : '') + blankHtml + (q.after ? (q.after.startsWith('-') ? '' : '<span class="after-sp"> </span>') + esc(q.after) : '');
    const sentence = q.form === 'fr' ? scaffold : esc(q.nd ? cap(q.english) : q.english);
    // subtitle: English subject (when you type it) • infinitive • English for the other pronouns (when you type them)
    const askPron = q.form === 'fr' && q.mode !== 'verb';
    const imp = q.tense === 'imperatif';
    const hintParts = [];
    // each pronoun to type gets its own item, labelled with its type: SUBJECT I • donner • DIRECT it (m.) • INDIRECT to him
    const SHORT = { subject: 'subj', direct: 'dir', indirect: 'ind', reflexive: 'refl', adverbial: 'adv', determiner: 'det', noun: 'noun' };
    const tagged = (t, en) => `<span class="cue"><abbr class="ptag${en ? '' : ' solo'}" title="${t}">${SHORT[t] || t}</abbr>${en ? esc(en) : ''}</span>`;
    if (q.nd) {
      // DET my • NOUN friend (f.); the noun itself appears (and links) once it's visible or answered
      if (q.form === 'fr' && q.mode !== 'noun') hintParts.push(tagged('determiner', q.b.detEn));
      if (q.form === 'fr' && q.mode !== 'det') hintParts.push(tagged('noun', q.b.nounEn));
      const visible = q.form === 'fr' && q.mode === 'det';
      hintParts.push(`<span lang="fr" class="q-inf${visible ? '' : ' later'}" data-id="${esc(q.noun.id)}">${esc(q.noun.w)}</span>`);
    } else if (imp && q.form === 'fr') hintParts.push(`<span class="cue">${esc({ tu: 'you (sing.)', nous: "let's", vous: 'you (pl.)' }[q.pronoun])}</span>`);
    // with a modal, the subject isn't part of the pronoun blank ("Je peux ___ faire")
    else if (askPron && !(q.inner && q.mode === 'pron')) hintParts.push(tagged('subject', q.verb.id === 'falloir' ? 'it' : V.englishSubject(q.pronoun, q.verb)));
    // both verbs when there are two: pouvoir • faire (added below)
    if (!q.nd) [q.verb].concat(q.inner ? [q.inner] : []).forEach(x => hintParts.push(`<span lang="fr" class="q-inf" data-id="${esc(x.id)}">${esc(x.id)}</span>`));
    if (askPron && !q.nd) q.cues.forEach(c => hintParts.push(tagged(c.t, c.en)));
    qa.innerHTML = `
      <div class="q-meta">Question ${quiz.i + 1} of ${quiz.qs.length}<span class="dot">·</span>${q.kind === 'mc' ? 'Multiple choice' : q.kind === 'dnd' ? 'Drag and drop' : 'Fill in the blank'}</div>
      <p class="q-tense" lang="fr" style="color:${q.color || TENSE_COLOR[q.tense]}">${esc(tl)}</p>
      <div class="q-rule"></div>
      <p class="q-text" lang="${q.form === 'fr' ? 'fr' : 'en'}">${sentence}</p>
      ${q.form === 'en' && q.mode !== 'both' ? `<p class="q-scaffold" lang="fr">${scaffold}</p>` : ''}
      <p class="q-hint">${hintParts.map((h, i) => (i ? `<span class="sep${/class="q-inf[^"]*later/.test(h) ? ' later' : ''}" aria-hidden="true">•</span>` : '') + h).join('')}${q.form === 'en' || q.nd ? `<span class="how">${q.kind === 'fill' ? ICON.write : ICON.tap}Answer in French</span>` : ''}</p>`;
    const fillBlank = (txt, ok) => {
      const b = $('.blank-fill', qa); if (!b) return;
      b.textContent = q.before ? txt : cap(txt); // the blank starts the sentence: capital letter
      const sp = b.parentElement.nextElementSibling; // no space after an apostrophe: "Vous l'avez"
      if (sp && sp.classList.contains('after-sp') && /'$/.test(txt)) sp.remove();
      b.parentElement.classList.add('filled', ok ? 'good' : 'bad');
    };

    const isLast = quiz.i >= quiz.qs.length - 1;
    const nextLabel = isLast ? 'Finish' : 'Next';
    // once answered, the infinitive under the question opens the verb's conjugations; Back returns to the quiz
    const linkVerb = () => $$('span.q-inf', qa).forEach(s => {
      const id = s.dataset.id, a = document.createElement('a');
      a.href = '#'; a.className = 'q-inf def-link'; a.lang = 'fr'; a.textContent = s.textContent;
      a.onclick = e => { e.preventDefault(); if (q.nd) { nounId = id; nounFrom = 'quiz'; go('noun'); } else { verbId = id; verbFrom = 'quiz'; go('verb'); } };
      $$('.later', qa).forEach(x => x.classList.remove('later'));
      s.replaceWith(a);
    });
    if (quiz.state === 'answered') linkVerb();
    const finishQ = ok => { quiz.state = 'answered'; quiz.lastOk = ok; quiz.results.push({ q, ok }); record(q, ok); $('.pbar div', node).style.width = (quiz.results.length / quiz.qs.length) * 100 + '%'; linkVerb(); };

    if (q.kind === 'dnd') {
      renderNDnd(q, qa, aa, finishQ, linkVerb, nextLabel);
    } else if (q.kind === 'fill') {
      aa.innerHTML = `
        <div class="a-inner fill">
          <label class="field">
            <span class="sr">Your answer</span>
            <input id="answer" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" lang="fr" enterkeyhint="done"
              placeholder="${q.nd ? (q.mode === 'noun' ? 'Type the noun' : q.mode === 'det' ? 'Type the determiner' : 'Type the determiner and noun') : q.mode === 'verb' ? 'Type the missing verb' : q.mode === 'pron' ? 'Type the subject and pronouns' : 'Type the sentence in French'}">
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
        const r = V.check(input.value, q.ans, 'fr');
        if (r === 'empty') { input.focus(); return; }
        quiz.tries++;
        if (r === 'correct') {
          setMsg('Correct!', 'good'); fillBlank(q.ans.blank, true); input.classList.add('good'); finishQ(true); done();
        } else if (quiz.tries >= 3) {
          input.value = quiz.draft = q.ans.blank;
          input.classList.add('revealed');
          setMsg(r === 'accent' ? 'Don’t forget to check your accents.' : r === 'hyphen' ? 'Check your hyphens.' : 'Not quite.', 'bad', MISSED_NOTE);
          fillBlank(q.ans.blank, false); finishQ(false); done();
        } else {
          const left = 3 - quiz.tries;
          setMsg(r === 'accent' ? 'Don’t forget to check your accents.' : r === 'hyphen' ? 'Check your hyphens.' : 'Try again.', 'warn', `${left} ${left === 1 ? 'try' : 'tries'} left`);
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
        else { input.classList.add('revealed'); setMsg('Not quite.', 'bad', MISSED_NOTE); }
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
        $('.msg-sub', msg).textContent = ok ? '' : MISSED_NOTE;
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
    if (quiz.i < quiz.qs.length - 1) { quiz.i++; quiz.tries = 0; quiz.state = 'ask'; quiz.draft = ''; quiz.picked = null; quiz.w = null; }
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
            <span class="r-text"><span lang="fr">${esc(r.q.ans.full)}</span><small>${r.q.nd ? esc(r.q.english) + ' · ' + esc(r.q.label) : r.q.slots ? `${esc(V.TENSE_LABEL[r.q.tense])} · ${r.n} of ${r.q.slots.length} forms` : `${esc(r.q.verb.id)}${r.q.inner ? ' + ' + esc(r.q.inner.id) : ''} · ${esc(V.TENSE_LABEL[r.q.tense])}`}</small></span></li>`).join('')}
        </ul>
      </div>`;
    $('[data-act="home"]', aa).onclick = () => go('home');
    $('[data-act="again"]', aa).onclick = () => { newQuiz(); render(); };
  }

  /* ================= Verbs module: every form of one tense at once ================= */
  const SUBJ_RE = /^(je |j'|tu |il |elle |on |nous |vous |ils |elles )/;
  const IMP_SELF = { tu: 'toi', nous: 'nous', vous: 'vous' };
  const SLOT_PS = [['je'], ['tu'], ['il', 'elle', 'on'], ['nous'], ['vous'], ['ils', 'elles']];
  const VOWEL_START = /^[aeiouyhàâäéèêëîïôöùûü]/i;
  // The forms to fill in for a verb and tense: [{ i, label, canon, acceptBlank, acceptFull }] (6, or 3 for the impératif)
  const tenseSetCache = {};
  function tenseSet(v, tense) {
    const ck = v.id + '|' + tense;
    if (ck in tenseSetCache) return tenseSetCache[ck];
    let out = [];
    V.forms(v);
    if (v.impersonal) out = null;
    else if (tense === 'imperatif') {
      for (const p of ['tu', 'nous', 'vous']) {
        const part = V.verbPart(v, 'imperatif', p);
        if (!part) { out = null; break; }
        const alts = part.alts.map(f => f + (v.refl ? '-' + IMP_SELF[p] : ''));
        out.push({ i: V.SLOT[p], label: '(' + p + ')', canon: alts[0], acceptBlank: alts, acceptFull: alts });
      }
    } else {
      for (let i = 0; i < 6 && out; i++) {
        const blanks = [], fulls = [];
        for (const p of SLOT_PS[i]) {
          const a = V.answer(v, tense, p);
          if (!a) { if (p === SLOT_PS[i][0]) out = null; continue; }
          a.acceptFull.forEach(f => { fulls.push(f); blanks.push(f.replace(SUBJ_RE, '')); });
        }
        if (!out) break;
        // reflexive verbs: the reflexive pronoun is shown in grey in front of the blank ("se | lève"), so only the verb is asked
        const refl = v.refl ? ['me', 'te', 'se', 'nous', 'vous', 'se'][i] : '';
        const bare = refl ? blanks.map(b => b.replace(/^(me |m'|te |t'|se |s'|nous |vous )/, '')) : blanks;
        out.push({ i, label: V.SLOT_LABEL[i], refl, canon: bare[0], acceptBlank: [...new Set(bare.concat(blanks))], acceptFull: [...new Set(fulls)] });
      }
    }
    tenseSetCache[ck] = out;
    return out;
  }
  // je or j' in front of what's been typed or placed
  const jeLabel = (v, text) => (text && VOWEL_START.test(text) && !V.isHAspire(v) ? "j'" : 'je');
  const slotLabel = (q, sl, text) => (sl.i === 0 && q.tense !== 'imperatif' && !sl.refl ? jeLabel(q.verb, text) : sl.label);
  // "se" or "s'" in front of what's been typed or placed
  const reflPrefix = (q, sl, text) => (!sl.refl ? '' : /^[mts]e$/.test(sl.refl) && text && VOWEL_START.test(text) && !V.isHAspire(q.verb) ? sl.refl[0] + "'" : sl.refl);

  // Wrong answers for drag and drop: common misspellings of the forms, 3 or 4 so that everything fits on screen
  function extrasFor(v, tense, set) {
    const right = new Set(set.flatMap(sl => sl.acceptBlank.map(V.norm)));
    const cands = [];
    set.forEach(sl => {
      const p = V.SLOT_PRONOUN[sl.i];
      V.distractors(v, tense, p).forEach(d => {
        let x = d;
        if (tense === 'imperatif' && v.refl) x = d + '-' + IMP_SELF[p];
        cands.push(x);
      });
    });
    const seen = new Set(), uniq = [];
    V.shuffle(cands).forEach(x => { const n = V.norm(x); if (x && !right.has(n) && !seen.has(n)) { seen.add(n); uniq.push(x); } });
    // estimate the rows of tiles (about 10px a letter plus padding, 330px wide) and keep it to three rows
    const rows = list => { let r = 1, w = 0; list.forEach(t => { const cw = t.length * 11.5 + 30; if (w && w + 10 + cw > 320) { r++; w = cw; } else w += (w ? 10 : 0) + cw; }); return r; };
    const forms = set.map(sl => sl.canon);
    let n = Math.min(4, uniq.length);
    while (n > 3 && rows(forms.concat(uniq.slice(0, n))) > 3) n--;
    return uniq.slice(0, n);
  }

  function makeVQuestion(c) {
    const v = V.BY_ID[c.id];
    if (!v) return null;
    const set = tenseSet(v, c.tense);
    if (!set) return null;
    const kinds = [settings.types.fill && 'fill', settings.types.dnd && 'dnd'].filter(Boolean);
    const q = { verb: v, study: v, tense: c.tense, kind: pick(kinds), slots: set, ans: { full: v.id } };
    if (q.kind === 'dnd') {
      const extras = extrasFor(v, c.tense, set);
      q.chips = V.shuffle(set.map(sl => sl.canon).concat(extras)).map(t => ({ t }));
    }
    return q;
  }
  function buildVPool() {
    const T = selTenses(), src = settings.sources;
    const ids = new Set();
    ['common', 'g1', 'g2', 'g3', ...LV_KEYS].forEach(k => { if (src[k]) groupIds(k).forEach(id => ids.add(id)); });
    const verbs = [...ids];
    const pairs = [];
    const add = (id, tense) => { if (V.BY_ID[id]) pairs.push({ id, tense }); };
    // your own lists come back with their tense, whatever the tense settings
    if (src.custom) data.custom.forEach(k => { const [id, t] = k.split('|'); add(id, t); });
    if (src.incorrect) missedKeys().forEach(k => { const m = data.missed[k]; add(m.v, m.t); });
    const formPairs = keys => [...new Set(keys.map(k => { const p = V.parseKey(k); return p.id + '|' + p.tense; }))]
      .forEach(x => { const [id, t] = x.split('|'); if (T.includes(t)) add(id, t); });
    if (src.review) formPairs(reviewKeys());
    if (src.learned) formPairs(learnedKeys());
    const A = verbs.length * T.length;
    return { size: A + pairs.length, draw() { const r = Math.floor(Math.random() * (A + pairs.length)); return r >= A ? pairs[r - A] : { id: pick(verbs), tense: pick(T) }; } };
  }
  function buildVQuestions(n) {
    const pool = buildVPool();
    if (!pool.size) return [];
    const out = [], used = new Set();
    for (let tries = 0; out.length < n && tries < n * 60; tries++) {
      const c = pool.draw(), k = c.id + '|' + c.tense;
      if (used.has(k) && used.size < Math.min(pool.size, n)) continue;
      const q = makeVQuestion(c);
      if (!q) continue;
      used.add(k); out.push(q);
    }
    return out;
  }
  // one result per form (In Review, Learned), one event per question (Progress), the whole tense in Incorrect Answers
  function recordForm(k, ok, kind, answer, now) {
    const f = data.forms[k] || (data.forms[k] = { streak: 0, correct: 0, wrong: 0, seen: 0, first: now, learnedAt: null });
    f.seen++; f.last = now; f.type = kind; f.answer = answer;
    if (ok) { f.correct++; f.streak++; if (f.streak >= 5 && !f.learnedAt) f.learnedAt = now; }
    else { f.wrong++; f.streak = 0; f.learnedAt = null; }
  }
  function recordV(q, oks) {
    const now = Date.now(), keys = [];
    q.slots.forEach((sl, j) => { const k = V.formKey(q.verb.id, q.tense, sl.i); keys.push(k); recordForm(k, oks[j], q.kind, sl.canon, now); });
    const all = oks.every(Boolean);
    data.events.push({ t: now, k: keys[0], fk: keys, ok: all ? 1 : 0, ty: q.kind });
    const mk = q.verb.id + '|' + q.tense;
    if (all) delete data.missed[mk];
    else data.missed[mk] = { v: q.verb.id, t: q.tense, full: q.verb.id, en: V.englishGloss(q.verb), at: now };
    saveData();
  }
  const vKey = q => q.verb.id + '|' + q.tense;

  function renderVQuestion(node, qa, aa, q, starBtn) {
    node.classList.add('vq');
    const tl = V.TENSE_LABEL[q.tense];
    // star: this verb in this tense goes into this module's Custom list
    const setStar = () => {
      const on = data.custom.includes(vKey(q));
      starBtn.classList.toggle('on', on); starBtn.setAttribute('aria-pressed', on);
      starBtn.setAttribute('aria-label', on ? 'Remove this verb and tense from Custom' : 'Add this verb and tense to Custom');
    };
    setStar();
    starBtn.onclick = () => {
      const k = vKey(q), i = data.custom.indexOf(k);
      if (i >= 0) data.custom.splice(i, 1); else data.custom.push(k);
      saveData(); setStar();
      toast(`${q.verb.id} (${tl}) ${i >= 0 ? 'removed from' : 'added to'} Custom`);
    };
    const S6 = q.slots;
    const w = quiz.w || (quiz.w = { vals: S6.map(() => ''), status: S6.map(() => ''), active: 0, place: S6.map(() => null), msg: null });
    const answered = quiz.state === 'answered';
    // grid, singular on the left, plural on the right
    const byI = Object.fromEntries(S6.map((sl, j) => [sl.i, j]));
    const cellsOrder = q.tense === 'imperatif' ? [1, 3, null, 4] : [0, 3, 1, 4, 2, 5];
    const order = S6.map((_, j) => j); // typing order: je, tu, il, nous, vous, ils
    const cellText = j => (q.kind === 'dnd' ? (w.place[j] !== null ? q.chips[w.place[j]].t : '') : w.vals[j]);
    qa.innerHTML = `
      <div class="q-meta">Question ${quiz.i + 1} of ${quiz.qs.length}<span class="dot">·</span>${q.kind === 'dnd' ? 'Drag and drop' : 'Fill in the blank'}</div>
      <p class="q-tense" lang="fr" style="color:${TENSE_COLOR[q.tense]}">${esc(tl)}</p>
      <div class="q-rule"></div>
      <p class="vq-inf" lang="fr"><span class="q-inf" data-id="${esc(q.verb.id)}">${esc(q.verb.id)}</span></p>
      <p class="vq-gloss">${esc(V.englishGloss(q.verb))}</p>
      <div class="vgrid2">${cellsOrder.map(i => {
        if (i === null || !(i in byI)) return '<div class="vrow empty"></div>';
        const j = byI[i];
        return `<div class="vrow" data-j="${j}"><span class="pr" lang="fr">${esc(slotLabel(q, S6[j], cellText(j)))}</span>${S6[j].refl ? '<span class="rf" lang="fr"></span>' : ''}<span class="vbl" lang="fr"></span></div>`;
      }).join('')}</div>`;
    const cell = j => $(`.vrow[data-j="${j}"]`, qa);
    const paint = () => S6.forEach((sl, j) => {
      const c = cell(j), b = $('.vbl', c), t = cellText(j);
      $('.pr', c).textContent = slotLabel(q, sl, t);
      if (sl.refl) $('.rf', c).textContent = reflPrefix(q, sl, t || (w.fixed && w.fixed[j]) || '');
      b.className = 'vbl' + (w.status[j] ? ' ' + w.status[j] : '') + (q.kind === 'fill' && !answered && quiz.state === 'ask' && j === w.active && w.status[j] !== 'good' ? ' active' : '');
      if (q.kind === 'dnd' && w.place[j] !== null && !w.status[j]) { b.classList.add('chipped'); b.innerHTML = `<span class="chip placed" data-c="${w.place[j]}">${esc(t)}</span>`; }
      else b.textContent = t;
    }) || fitCells();
    // long forms ("aurions prononcé") shrink to fit their blank instead of being cut off
    const fitCells = () => $$('.vbl', qa).forEach(b => {
      const tgt = b.querySelector('.chip') || b;
      tgt.style.fontSize = ''; tgt.style.whiteSpace = ''; tgt.style.lineHeight = '';
      let size = parseFloat(getComputedStyle(tgt).fontSize);
      while (b.scrollWidth > b.clientWidth + 1 && size > 14) { size -= 1; tgt.style.fontSize = size + 'px'; }
      if (b.scrollWidth > b.clientWidth + 1) { // still too long ("nous nous sommes habillés"): two lines
        tgt.style.whiteSpace = 'normal'; tgt.style.lineHeight = '1.05'; size = 16; tgt.style.fontSize = size + 'px';
        while ((b.scrollWidth > b.clientWidth + 1 || tgt.offsetHeight > 40) && size > 11) { size -= 1; tgt.style.fontSize = size + 'px'; }
      }
    });
    // once answered, the infinitive links to the verb's page; Back comes back here
    const linkVerb = () => $$('span.q-inf', qa).forEach(s => {
      const a = el(`<a href="#" class="q-inf def-link" lang="fr">${esc(s.dataset.id)}</a>`);
      a.onclick = e => { e.preventDefault(); verbId = s.dataset.id; verbFrom = 'quiz'; go('verb'); };
      s.replaceWith(a);
    });
    const isLast = quiz.i >= quiz.qs.length - 1;
    const nextLabel = isLast ? 'Finish' : 'Next';
    const setMsg = (main, cls, sub = '') => { w.msg = { main, cls, sub }; showMsg(); };
    const showMsg = () => { const m = $('.msg', aa); if (!m) return; const x = w.msg; m.className = 'msg' + (x ? ' show ' + (x.cls || '') : ''); $('.msg-main', m).textContent = x ? x.main : ''; $('.msg-sub', m).textContent = x ? x.sub : ''; };
    const finish = oks => {
      quiz.state = 'answered'; const ok = oks.every(Boolean); quiz.lastOk = ok;
      quiz.results.push({ q, ok, n: oks.filter(Boolean).length }); recordV(q, oks);
      $('.pbar div', node).style.width = (quiz.results.length / quiz.qs.length) * 100 + '%';
      setMsg(ok ? 'Correct!' : 'Not quite.', ok ? 'good' : 'bad', ok ? '' : MISSED_NOTE);
    };
    // after three tries: the right forms in green, the wrong ones corrected in red
    const reveal = good => S6.forEach((sl, j) => {
      if (good[j]) w.status[j] = 'good';
      else { w.status[j] = 'fixed'; if (q.kind === 'fill') w.vals[j] = sl.canon; else w.place[j] = null; w.fixed = w.fixed || {}; w.fixed[j] = sl.canon; }
    });
    const check = j => V.check(cellText(j), S6[j], 'fr');

    if (q.kind === 'fill') {
      aa.innerHTML = `
        <div class="a-inner vq-fill">
          <p class="edit-tag">Editing <b lang="fr"></b></p>
          <div class="field ans-wrap">
            <input id="answer" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" lang="fr" enterkeyhint="next" placeholder="Type the form">
            <button class="ret" type="button" aria-label="Put it in and go to the next form">${ICON.ret}</button>
          </div>
          <div class="accents" aria-label="Accented letters">${['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'ë'].map(c => `<button type="button" class="key" data-k="${c}">${c}</button>`).join('')}</div>
          <div class="msg" aria-live="polite"><span class="msg-main"></span><span class="msg-sub"></span></div>
          <button class="btn primary" data-act="submit">${answered ? nextLabel : 'Submit'}</button>
        </div>`;
      const input = $('#answer', aa), btn = $('[data-act="submit"]', aa), tag = $('.edit-tag b', aa);
      const editable = j => w.status[j] !== 'good' && quiz.state === 'ask';
      const setActive = j => { w.active = j; input.value = w.vals[j]; tag.textContent = slotLabel(q, S6[j], w.vals[j]); paint(); };
      const fixedView = () => { // red corrected forms keep the text the app filled in
        if (w.fixed) S6.forEach((sl, j) => { if (w.fixed[j]) { const b = $('.vbl', cell(j)); b.textContent = w.fixed[j]; } });
        fitCells();
      };
      const nextEmpty = () => {
        const after = order.slice(order.indexOf(w.active) + 1).concat(order.slice(0, order.indexOf(w.active) + 1));
        return after.find(j => editable(j) && !w.vals[j].trim()) ?? after.find(j => editable(j) && j !== w.active);
      };
      const done = () => { input.readOnly = true; input.value = ''; input.placeholder = ''; input.blur(); $('.accents', aa).classList.add('off'); btn.textContent = nextLabel; $('.edit-tag', aa).style.visibility = 'hidden'; linkVerb(); };
      const insert = ch => {
        if (input.readOnly) return;
        const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
        input.value = input.value.slice(0, a) + ch + input.value.slice(b);
        input.dispatchEvent(new Event('input')); input.focus();
        try { input.setSelectionRange(a + 1, a + 1); } catch (e) { /* ignore */ }
      };
      $$('.key', aa).forEach(k => {
        k.addEventListener('mousedown', e => e.preventDefault());
        k.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
        k.addEventListener('touchend', e => { e.preventDefault(); insert(k.dataset.k); });
        k.addEventListener('click', () => insert(k.dataset.k));
      });
      input.addEventListener('input', () => {
        if (!editable(w.active)) return;
        w.vals[w.active] = input.value; if (w.status[w.active] === 'bad') w.status[w.active] = '';
        tag.textContent = slotLabel(q, S6[w.active], input.value); paint();
      });
      const goNext = () => { const j = nextEmpty(); if (j !== undefined) setActive(j); input.focus(); };
      $('.ret', aa).addEventListener('mousedown', e => e.preventDefault());
      $('.ret', aa).onclick = () => { if (!answered && quiz.state === 'ask') goNext(); };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (quiz.state === 'ask') goNext(); } });
      S6.forEach((_, j) => cell(j).addEventListener('click', () => { if (editable(j)) { setActive(j); input.focus(); } }));
      btn.addEventListener('mousedown', e => { if (quiz.state === 'ask') e.preventDefault(); });
      btn.onclick = () => {
        if (quiz.state === 'answered') return advance();
        if (S6.every((_, j) => !w.vals[j].trim())) { input.focus(); return; }
        quiz.tries++;
        const res = S6.map((_, j) => (w.status[j] === 'good' ? 'correct' : check(j)));
        res.forEach((r, j) => { w.status[j] = r === 'correct' ? 'good' : 'bad'; });
        const good = res.map(r => r === 'correct');
        if (good.every(Boolean)) { finish(good); paint(); done(); return; }
        if (quiz.tries >= 3) { reveal(good); finish(good); paint(); fixedView(); done(); return; }
        const bad = res.filter(r => r !== 'correct'), left = 3 - quiz.tries;
        setMsg(bad.every(r => r === 'accent') ? 'Don’t forget to check your accents.' : `${bad.length} ${bad.length === 1 ? 'form needs' : 'forms need'} another look.`, 'warn', `${left} ${left === 1 ? 'try' : 'tries'} left`);
        setActive(order.find(j => w.status[j] === 'bad'));
        input.focus();
      };
      if (answered) { paint(); fixedView(); done(); }
      else { if (w.status[w.active] === 'good') w.active = order.find(j => editable(j)) ?? 0; setActive(w.active); }
      showMsg();
      return;
    }

    // ---- drag and drop ----
    aa.innerHTML = `
      <div class="a-inner vq-dnd">
        <p class="dnd-hint">Drag a form to its blank, or tap it to fill the next one.</p>
        <div class="bank">${q.chips.map((c, k) => `<span class="chip" data-c="${k}" lang="fr">${esc(c.t)}</span>`).join('')}</div>
        <div class="msg" aria-live="polite"><span class="msg-main"></span><span class="msg-sub"></span></div>
        <button class="btn primary" data-act="submit">${answered ? nextLabel : 'Submit'}</button>
      </div>`;
    const btn = $('[data-act="submit"]', aa);
    const paintAll = () => {
      paint();
      if (w.fixed) S6.forEach((sl, j) => { if (w.fixed[j]) $('.vbl', cell(j)).textContent = w.fixed[j]; });
      const used = new Set(w.place.filter(x => x !== null));
      $$('.bank .chip', aa).forEach(c => c.classList.toggle('ghost', used.has(+c.dataset.c)));
      if (!answered && quiz.state === 'ask') $$('.vbl .chip', qa).forEach(wireChip);
    };
    const placeAt = (k, j) => { const from = w.place.indexOf(k); if (from >= 0) w.place[from] = null; w.place[j] = k; w.msg = null; showMsg(); paintAll(); };
    const unplace = k => { const from = w.place.indexOf(k); if (from >= 0) w.place[from] = null; paintAll(); };
    const firstEmpty = () => order.find(j => w.place[j] === null);
    // pointer dragging: a copy of the tile follows the finger; a short tap counts as a tap
    function wireChip(chipEl) {
      chipEl.onpointerdown = e => {
        if (quiz.state !== 'ask') return;
        const k = +chipEl.dataset.c, inBank = !!chipEl.closest('.bank');
        if (inBank && chipEl.classList.contains('ghost')) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        let ghost = null;
        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
            ghost = chipEl.cloneNode(true); ghost.classList.add('drag'); document.body.appendChild(ghost);
            chipEl.classList.add('lifted');
          }
          if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
        };
        const up = ev => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
          chipEl.classList.remove('lifted');
          if (!ghost) { // a tap
            if (inBank) { const j = firstEmpty(); if (j !== undefined) placeAt(k, j); } else unplace(k);
            return;
          }
          ghost.remove();
          const target = document.elementFromPoint(ev.clientX, ev.clientY);
          const row = target && target.closest('.vrow[data-j]');
          if (row) placeAt(k, +row.dataset.j);
          else if (!inBank) unplace(k);
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      };
    }
    $$('.bank .chip', aa).forEach(wireChip);
    btn.onclick = () => {
      if (quiz.state === 'answered') return advance();
      if (w.place.some(x => x === null)) { setMsg('Fill every blank first.', 'warn'); return; }
      quiz.tries++;
      const good = S6.map((_, j) => check(j) === 'correct');
      if (good.every(Boolean)) { S6.forEach((_, j) => { w.status[j] = 'good'; }); finish(good); }
      else if (quiz.tries >= 3) { reveal(good); finish(good); }
      else { const left = 3 - quiz.tries; setMsg('Not quite. Some forms are wrong.', 'warn', `Tap a placed form to send it back. ${left} ${left === 1 ? 'try' : 'tries'} left`); return; }
      btn.textContent = nextLabel; linkVerb(); paintAllDone();
    };
    const paintAllDone = () => {
      // show what was placed (green) and the corrections (red), and lock the tiles
      S6.forEach((sl, j) => { const b = $('.vbl', cell(j)); b.className = 'vbl ' + w.status[j]; b.textContent = w.status[j] === 'fixed' ? w.fixed[j] : cellText(j); });
      $$('.chip', aa).forEach(c => { c.onpointerdown = null; });
      $('.dnd-hint', aa).style.visibility = 'hidden';
      fitCells();
    };
    paintAll();
    if (answered) { paintAllDone(); linkVerb(); }
    showMsg();
    // keep everything on one screen: on smaller phones the tiles get a little smaller
    requestAnimationFrame(() => {
      const chips = $$('.bank .chip', aa);
      let size = 19;
      while (aa.scrollHeight > aa.clientHeight + 1 && size > 14) {
        size -= 1;
        chips.forEach(c => { c.style.fontSize = size + 'px'; c.style.padding = (size > 16 ? 6 : 4) + 'px ' + (size > 16 ? 12 : 9) + 'px'; });
      }
    });
  }

  /* ================= Nouns & Determiners ================= */
  function buildNPool() {
    const src = settings.sources, ids = new Set();
    ['common', 'g1', 'g2', ...LV_KEYS].forEach(k => { if (src[k]) groupIds(k).forEach(id => ids.add(id)); });
    if (src.custom) data.custom.forEach(id => { if (N.BY_ID[id]) ids.add(id); });
    const list = [...ids], extra = [];
    const formItems = keys => keys.forEach(k => { const p = N.parseKey(k); if (N.BY_ID[p.id]) extra.push({ id: p.id, v: p.v }); });
    if (src.review) formItems(reviewKeys());
    if (src.learned) formItems(learnedKeys());
    if (src.incorrect) missedKeys().forEach(k => extra.push({ id: data.missed[k].v, miss: k }));
    const A = list.length;
    return { size: A + extra.length, draw() { const r = Math.floor(Math.random() * (A + extra.length)); return r >= A ? extra[r - A] : { id: list[r] }; } };
  }
  function buildNQuestions(n) {
    const pool = buildNPool();
    if (!pool.size) return [];
    const out = [], used = new Set();
    for (let tries = 0; out.length < n && tries < n * 80; tries++) {
      const c = pool.draw(), k = c.miss || c.id;
      if (used.has(k) && used.size < Math.min(pool.size, n)) continue;
      const q = makeNQuestion(c);
      if (!q) continue;
      used.add(k); out.push(q);
    }
    return out;
  }
  function makeNQuestion(c) {
    const n = N.BY_ID[c.id];
    if (!n) return null;
    const af = settings.answerForms;
    const kinds = [settings.types.fill && 'fill', settings.types.dnd && 'dnd', settings.types.mc && 'mc'].filter(Boolean);
    const forms = [settings.forms.en && 'en', settings.forms.fr && 'fr'].filter(Boolean);
    const m = c.miss && data.missed[c.miss];
    let v, dk, owner = null, ownerEn = null, mode, b;
    const anyDet = N.KINDS.some(k => settings.dets[k.id]);
    if (m) { v = m.var; dk = m.kind; owner = m.owner || null; ownerEn = m.ownerEn || null; mode = m.mode; }
    else {
      let vs = N.variants(n).filter(x => settings.nouns.plural || !N.isPlural(x) || n.pluralOnly);
      if (c.v) vs = vs.filter(x => x === c.v);
      if (!vs.length) return null;
      v = pick(vs);
      // with no determiners ticked, the noun comes with le/la/l'/les and only the noun is asked
      const dks = anyDet ? N.KINDS.map(k => k.id).filter(id => settings.dets[id] && N.kindOk(id, n, v)) : ['def'];
      if (!dks.length) return null;
      dk = pick(dks);
      if (dk === 'pos') { owner = pick(N.OWNERS); ownerEn = owner === 'il' ? pick(['il', 'ilf']) : owner; }
      const modes = !anyDet ? ['noun'] : af.noun && af.det ? ['noun', 'det', 'both'] : af.noun ? ['noun'] : ['det'];
      mode = pick(modes);
    }
    b = N.build(n, v, dk, owner, ownerEn, mode);
    if (!b) return null;
    let kind = pick(kinds);
    // regular nouns have too few believable wrong forms for multiple choice or tiles: ask the whole phrase, or type it
    const enough = () => (kind === 'mc' ? N.options(b, n).length >= 3 : kind === 'dnd' ? N.tiles(b, n).extras.length >= 2 : true);
    if (!enough() && !m && mode === 'noun' && anyDet && af.det) { b = N.build(n, v, dk, owner, ownerEn, 'both'); mode = 'both'; }
    if (!enough()) kind = kinds.includes('fill') ? 'fill' : kinds.find(k => k !== kind && (kind = k) && enough()) || null;
    if (!kind || !enough()) return null;
    // an English meaning shared by two nouns ("place") is asked in French
    let form = pick(forms);
    if (form === 'en' && !n.uq) { if (!forms.includes('fr')) return null; form = 'fr'; }
    const K = N.KIND[dk];
    const q = { nd: true, noun: n, verb: { id: n.id }, study: { id: n.id }, var: v, dkind: dk, owner, ownerEn, kind, form, mode, b,
      label: anyDet || m ? K.label : 'nom', color: anyDet || m ? K.color : 'var(--ink-2)',
      ans: b.ans, before: b.before, after: b.after, english: b.english };
    if (kind === 'mc') {
      const opts = [b.ans.blank].concat(N.options(b, n));
      q.options = V.shuffle(opts);
      q.correctIndex = q.options.indexOf(b.ans.blank);
    }
    if (kind === 'dnd') q.tiles = N.tiles(b, n);
    return q;
  }
  function recordN(q, ok) {
    const k = N.formKey(q.noun.id, q.var), now = Date.now();
    recordForm(k, ok, q.kind, q.ans.full, now);
    data.events.push({ t: now, k, ok: ok ? 1 : 0, ty: q.kind, dt: q.dkind });
    const mk = [q.noun.id, q.var, q.dkind, q.owner || '', q.ownerEn || '', q.mode].join('|');
    if (ok) delete data.missed[mk];
    else data.missed[mk] = { v: q.noun.id, var: q.var, kind: q.dkind, owner: q.owner, ownerEn: q.ownerEn, mode: q.mode, full: q.ans.full, en: q.english, at: now };
    saveData();
  }

  // drag and drop for a noun phrase: one blank (determiner or noun) or two (both)
  function renderNDnd(q, qa, aa, finishQ, linkVerb, nextLabel) {
    const T = q.tiles, slots = T.slots;
    const w = quiz.w || (quiz.w = { place: slots.map(() => null), status: slots.map(() => ''), chips: V.shuffle(slots.map(a => a[0]).concat(T.extras)), msg: null });
    const answered = quiz.state === 'answered';
    // the blanks go where the scaffold's blank was
    let host = q.form === 'fr' ? $('.q-text', qa) : $('.q-scaffold', qa);
    if (!host) { host = el('<p class="q-scaffold" lang="fr"></p>'); $('.q-text', qa).after(host); }
    const slotHtml = j => `<span class="nslot" data-j="${j}"></span>`;
    host.innerHTML = q.mode === 'both' ? slotHtml(0) + ' ' + slotHtml(1)
      : q.mode === 'det' ? slotHtml(0) + ' ' + esc(q.after) : esc(q.before) + ' ' + slotHtml(0);
    aa.innerHTML = `
      <div class="a-inner vq-dnd nd-dnd">
        <p class="dnd-hint">Drag a word to its blank, or tap it to fill the next one.</p>
        <div class="bank">${w.chips.map((t, k) => `<span class="chip" data-c="${k}" lang="fr">${esc(t)}</span>`).join('')}</div>
        <div class="msg" aria-live="polite"><span class="msg-main"></span><span class="msg-sub"></span></div>
        <button class="btn primary" data-act="submit">${answered ? nextLabel : 'Submit'}</button>
      </div>`;
    const btn = $('[data-act="submit"]', aa);
    const showMsg = () => { const m = $('.msg', aa), x = w.msg; m.className = 'msg' + (x ? ' show ' + x.cls : ''); $('.msg-main', m).textContent = x ? x.main : ''; $('.msg-sub', m).textContent = x ? x.sub || '' : ''; };
    const setMsg = (main, cls, sub) => { w.msg = { main, cls, sub }; showMsg(); };
    const paint = () => {
      slots.forEach((acc, j) => {
        const sl = $(`.nslot[data-j="${j}"]`, host);
        sl.className = 'nslot' + (w.status[j] ? ' ' + w.status[j] : '');
        if (w.status[j] === 'fixed') sl.textContent = acc[0];
        else if (w.place[j] !== null) sl.innerHTML = w.status[j] ? esc(w.chips[w.place[j]]) : `<span class="chip placed" data-c="${w.place[j]}">${esc(w.chips[w.place[j]])}</span>`;
        else sl.textContent = '';
      });
      const used = new Set(w.place.filter(x => x !== null));
      $$('.bank .chip', aa).forEach(c => c.classList.toggle('ghost', used.has(+c.dataset.c)));
      if (quiz.state === 'ask') $$('.nslot .chip', host).forEach(wire);
    };
    const placeAt = (k, j) => { const f = w.place.indexOf(k); if (f >= 0) w.place[f] = null; w.place[j] = k; w.msg = null; showMsg(); paint(); };
    const unplace = k => { const f = w.place.indexOf(k); if (f >= 0) w.place[f] = null; paint(); };
    function wire(chipEl) {
      chipEl.onpointerdown = e => {
        if (quiz.state !== 'ask') return;
        const k = +chipEl.dataset.c, inBank = !!chipEl.closest('.bank');
        if (inBank && chipEl.classList.contains('ghost')) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        let ghost = null;
        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { ghost = chipEl.cloneNode(true); ghost.classList.add('drag'); document.body.appendChild(ghost); chipEl.classList.add('lifted'); }
          if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
        };
        const up = ev => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
          chipEl.classList.remove('lifted');
          if (!ghost) { if (inBank) { const j = w.place.indexOf(null); if (j >= 0) placeAt(k, j); } else unplace(k); return; }
          ghost.remove();
          const t = document.elementFromPoint(ev.clientX, ev.clientY), sl = t && t.closest('.nslot');
          if (sl) placeAt(k, +sl.dataset.j); else if (!inBank) unplace(k);
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      };
    }
    $$('.bank .chip', aa).forEach(wire);
    const lock = () => { $$('.chip', aa).forEach(c => { c.onpointerdown = null; }); $('.dnd-hint', aa).style.visibility = 'hidden'; btn.textContent = nextLabel; linkVerb(); };
    btn.onclick = () => {
      if (quiz.state === 'answered') return advance();
      if (w.place.some(x => x === null)) { setMsg('Fill every blank first.', 'warn'); return; }
      quiz.tries++;
      const good = slots.map((acc, j) => acc.map(V.norm).includes(V.norm(w.chips[w.place[j]])));
      if (good.every(Boolean)) { w.status = slots.map(() => 'good'); paint(); setMsg('Correct!', 'good'); finishQ(true); lock(); return; }
      if (quiz.tries >= 3) {
        // the right words in green, the wrong ones corrected in red
        w.status = good.map(g => (g ? 'good' : 'fixed')); paint(); setMsg('Not quite.', 'bad', MISSED_NOTE); finishQ(false); lock(); return;
      }
      const left = 3 - quiz.tries;
      setMsg('Not quite. Something is wrong.', 'warn', `Tap a placed word to send it back. ${left} ${left === 1 ? 'try' : 'tries'} left`);
    };
    paint(); showMsg();
    if (answered) lock();
  }

  /* ---------------- Settings ---------------- */
  function check(id, label, checked, sub = '') {
    return `<label class="check"><input type="checkbox" data-id="${esc(id)}" ${checked ? 'checked' : ''}><span class="box">${ICON.check}</span>
      <span class="lbl"><span class="lbl-main">${label}</span>${sub ? `<small>${sub}</small>` : ''}</span></label>`;
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
    incorrect: { label: 'Incorrect Answers', sub: 'phrases you missed, until you get them right', action: 'Remove' },
  };
  const VB_SUB = { custom: 'verbs and tenses you starred', review: 'forms you’ve been quizzed on', incorrect: 'verbs and tenses you missed, until you get them right' };
  const ND_SOURCES = {
    common: { label: 'Common Nouns', sub: 'the 500 most frequent' },
    g1: { label: 'Frequent Nouns', sub: 'ranks 501–2,000' },
    g2: { label: 'Less Common Nouns', sub: 'ranks 2,001–5,000' },
    custom: { label: 'Custom', sub: 'nouns you starred' },
    review: { label: 'In Review', sub: 'forms you’ve been quizzed on' },
    learned: { label: 'Learned', sub: 'answered correctly 5 times in a row' },
    incorrect: { label: 'Incorrect Answers', sub: 'phrases you missed, until you get them right' },
  };
  const levelSources = what => Object.fromEntries(LV_LIST.map(l => ['lv' + l, { label: `${l} · ${LV_NAME[l]}`, sub: `${what} first met at ${l}`, level: l }]));
  const sourcesFor = () => Object.assign({}, mod === 'nd' ? ND_SOURCES : mod === 'vb' ? Object.fromEntries(Object.entries(SOURCES).map(([k, o]) => [k, VB_SUB[k] ? Object.assign({}, o, { sub: VB_SUB[k] }) : o])) : SOURCES,
    levelSources(mod === 'nd' ? 'nouns' : 'verbs'));
  function sourceCount(key) {
    if (key === 'custom') return data.custom.length;
    if (key === 'review') return reviewKeys().length;
    if (key === 'learned') return learnedKeys().length;
    if (key === 'incorrect') return missedKeys().length;
    return groupIds(key).length;
  }

  function viewSettings() {
    const s = settings, vb = mod === 'vb', nd = mod === 'nd';
    const left = ['je', 'tu', 'il', 'elle', 'on'], right = ['nous', 'vous', 'ils', 'elles'];
    let lastBackup = null; try { lastBackup = +localStorage.getItem('apprenez.lastBackup') || null; } catch (e) { /* ignore */ }
    const node = el(`
      <div class="screen page">
        <header class="bar">
          <button class="icon" data-act="close" aria-label="Back to quiz">${ICON.close}</button>
          <div class="bar-title">Settings · ${esc(MOD_NAME[mod])}</div>
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
              ${vb ? check('dnd', 'Drag and drop', s.types.dnd) : nd ? check('dnd', 'Drag and drop', s.types.dnd) + check('mc', 'Multiple choice', s.types.mc) : check('mc', 'Multiple choice', s.types.mc)}
            </div>
            <p class="warn-note" data-warn="types">Select at least one question type.</p>
            ${vb ? '' : nd ? `<h3>Question Form</h3>
            <div class="checks" data-set="forms">
              ${check('en', 'English', s.forms.en, 'Questions are shown in English; answer in French')}
              ${check('fr', 'French', s.forms.fr, 'Questions are French phrases with a blank')}
            </div>
            <p class="warn-note" data-warn="forms">Select at least one question form.</p>
            <h3>Answer Form</h3>
            <div class="checks" data-set="answerForms">
              ${check('noun', 'Nouns', s.answerForms.noun, 'Fill in the noun')}
              ${check('det', 'Determiners', s.answerForms.det, 'Fill in the determiner')}
            </div>
            <p class="group-note muted">With both selected, you may be asked for the noun, the determiner, or both.</p>
            <p class="warn-note" data-warn="answerForms">Select at least one answer form.</p>` : `<h3>Question Form</h3>
            <div class="checks" data-set="forms">
              ${check('en', 'English', s.forms.en, 'Questions are shown in English; answer in French')}
              ${check('fr', 'French', s.forms.fr, 'Questions are French sentences with a blank')}
            </div>
            <p class="warn-note" data-warn="forms">Select at least one question form.</p>
            <h3>Answer Form</h3>
            <div class="checks" data-set="answerForms">
              ${check('verb', 'Verbs', s.answerForms.verb, 'Fill in the conjugated verb')}
              ${check('pron', 'Pronouns', s.answerForms.pron, 'Fill in the subject and the other pronouns')}
            </div>
            <p class="group-note muted">With both selected, you may be asked for the verb, the pronouns, or the whole sentence.</p>
            <p class="warn-note" data-warn="answerForms">Select at least one answer form.</p>`}
          </section>

          <section class="group">
            <h2>Question Content</h2>
            ${nd ? `<h3>Determiners</h3>
            <div class="checks" data-set="dets">
              ${N.KINDS.map(k => check(k.id, `<span lang="fr">${k.set}</span>${lvTag(GRAMMAR_LEVEL[k.id])}`, s.dets[k.id], k.label)).join('')}
            </div>
            <p class="group-note muted">With all of these off, nouns appear with <span lang="fr">le, la, l’</span> or <span lang="fr">les</span>, and only the noun is tested.</p>
            <h3>Nouns</h3>
            <div class="checks" data-set="nouns">
              ${check('plural', 'Plural nouns' + lvTag('A1'), s.nouns.plural, 'otherwise nouns are singular')}
            </div>` : ''}
            ${vb || nd ? '' : `<h3>Subject Pronouns${lvTag('A1')}</h3>
            <div class="checks two" data-set="pronouns">
              <div>${left.map(p => check(p, `<span lang="fr">${p}</span>`, s.pronouns[p])).join('')}</div>
              <div>${right.map(p => check(p, `<span lang="fr">${p}</span>`, s.pronouns[p])).join('')}</div>
            </div>
            <p class="warn-note" data-warn="pronouns">Select at least one pronoun.</p>`}
            ${nd ? '' : `<h3>Tenses</h3>
            <div class="checks" data-set="tenses">
              ${V.TENSES.map(t => check(t.id, `<span lang="fr">${t.label}</span>${lvTag(GRAMMAR_LEVEL[t.id])}`, s.tenses[t.id])).join('')}
            </div>
            <p class="warn-note" data-warn="tenses">Select at least one tense.</p>`}
            ${vb || nd ? '' : `<h3>Other Verbs</h3>
            <div class="checks" data-set="otherVerbs">
              ${check('modal', 'Modal verbs' + lvTag('A2'), s.otherVerbs.modal, '<span lang="fr">pouvoir, vouloir, devoir, savoir, falloir</span> + infinitive')}
            </div>
            <h3>Other Pronouns</h3>
            <div class="checks" data-set="objPron">
              ${check('do', 'Direct object' + lvTag('A2'), s.objPron.do, '<span lang="fr">me, te, le, la, nous, vous, les</span>')}
              ${check('io', 'Indirect object' + lvTag('A2'), s.objPron.io, '<span lang="fr">me, te, lui, nous, vous, leur</span>')}
              ${check('refl', 'Reflexive' + lvTag('A1'), s.objPron.refl, '<span lang="fr">me, te, se, nous, vous</span>')}
              ${check('y', '<span lang="fr">y</span>' + lvTag('A2'), s.objPron.y, 'there, about it, in it…')}
              ${check('en', '<span lang="fr">en</span>' + lvTag('A2'), s.objPron.en, 'some, about it, from there…')}
            </div>
            <p class="group-note muted">With all of these off, questions use only the subject and the verb. Two pronouns together (<span lang="fr">je le lui donne</span>) are usually taught at B1.</p>`}
            <h3>Study Content</h3>
            <div class="checks sources" data-set="sources">
              ${Object.entries(sourcesFor()).map(([id, o]) => `${id === 'lvA1' ? '<p class="src-sub">By CEFR level <span class="muted">· from FLELex</span></p>' : ''}
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
            <p class="muted">Saves your progress, lists and settings for <strong>all modules</strong> in one .zip file, for example in iCloud Drive, with a separate file inside for each module. Restore Backup takes that .zip, or one module’s file on its own.</p>
            <div class="row-btns">
              <button class="btn" data-act="backup">Save Backup</button>
              <button class="btn" data-act="restore">Restore Backup</button>
            </div>
            <p class="foot-note muted">${lastBackup ? 'Last backup: ' + fmtDate(lastBackup) : 'No backup saved yet.'}</p>
            <input type="file" id="restore-file" accept=".zip,.json,application/zip,application/json" hidden>
          </section>

          <section class="group danger-zone">
            <h2>Delete Data</h2>
            <p class="muted">Removes your results and your Custom, In Review, Learned and Incorrect Answers lists for <strong>${esc(MOD_NAME[mod])}</strong> only. The other modules keep their data, and your settings and the verb lists are kept.</p>
            <button class="btn danger" data-act="delete">Delete Data</button>
          </section>
          <p class="foot muted">Your progress is stored only on this device.</p>
          <p class="foot muted credits">Verb conjugations from the <a href="https://pauillac.inria.fr/~sagot/index.html#lefff">Lefff</a> by Benoît Sagot (Inria), used under the <a href="data/LICENSE-LGPLLR.txt">LGPL-LR licence</a>.</p>
          <p class="foot muted credits">Verb meanings and examples from the <a href="https://en.wiktionary.org/">English Wiktionary</a>, by Wiktionary contributors, via <a href="https://kaikki.org/">Wiktextract</a>, used under the <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0 licence</a> (reformatted).</p>
          <p class="foot muted credits">CEFR levels of verbs and nouns from <a href="https://cental.uclouvain.be/flelex/">FLELex</a> (François, Gala, Watrin &amp; Fairon, 2014), used under the <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0 licence</a>. Levels of tenses, pronouns and determiners follow the usual order of French courses.</p>
          <p class="foot muted credits">Nouns: frequencies from <a href="http://www.lexique.org/">Lexique 3.83</a> (New, Pallier et al.); genders, plurals, meanings and examples from the English Wiktionary; both used under the <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0 licence</a> (adapted).</p>
          <p class="foot muted credits">App version ${APP_VERSION}</p>
        </div>
      </div>`);

    $('[data-act="close"]', node).onclick = () => go('quiz');
    const num = $('#num', node);
    $$('[data-step]', node).forEach(b => b.onclick = () => {
      s.num = Math.min(50, Math.max(1, s.num + +b.dataset.step)); num.textContent = s.num; saveSettings();
    });
    const warn = () => {
      const none = o => !Object.values(o).some(Boolean);
      (vb ? ['types', 'tenses', 'sources'] : nd ? ['types', 'forms', 'answerForms', 'sources'] : ['types', 'forms', 'answerForms', 'pronouns', 'tenses', 'sources']).forEach(k => $(`[data-warn="${k}"]`, node).classList.toggle('show', none(s[k])));
    };
    $$('[data-set]', node).forEach(set => {
      const key = set.dataset.set;
      $$('input[type=checkbox]', set).forEach(inp => inp.onchange = () => { s[key][inp.dataset.id] = inp.checked; saveSettings(); warn(); });
    });
    warn();
    $$('[data-list]', node).forEach(b => b.onclick = () => { listKey = b.dataset.list; listSearch = ''; listFrom = 'settings'; go('list'); });
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
  /* A small .zip writer and reader (files stored uncompressed; the reader also opens compressed zips) */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let off = 0;
    const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)), dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate());
    files.forEach(f => {
      const name = enc.encode(f.name), body = enc.encode(f.text), crc = crc32(body);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, body.length, true); h.setUint32(22, body.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, body.length, true); c.setUint32(24, body.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      parts.push(new Uint8Array(h.buffer), name, body); central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + body.length;
    });
    const csize = central.reduce((a, x) => a + x.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  async function readZip(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
    let e = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('not a zip');
    const n = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const out = [];
    for (let k = 0; k < n; k++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), loc = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      const start = loc + 30 + dv.getUint16(loc + 26, true) + dv.getUint16(loc + 28, true);
      const raw = u8.subarray(start, start + csize);
      if (!/\.json$/i.test(name) || /(^|\/)(__MACOSX|\._)/.test(name)) continue;
      let bytes;
      if (method === 0) bytes = raw;
      else if (method === 8 && typeof DecompressionStream !== 'undefined') bytes = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else continue;
      out.push({ name, text: dec.decode(bytes) });
    }
    return out;
  }

  // Backup: one .zip with a file for each module
  const MOD_FILE = { vp: 'verbs-and-pronouns.json', vb: 'verbs.json', nd: 'nouns-and-determiners.json' };
  async function saveBackup() {
    const now = new Date();
    const files = MODS.map(m => {
      const st = m === mod ? settings : settingsFor(m, load(KEYS[m].s, null));
      const dt = m === mod ? data : dataFor(load(KEYS[m].d, {}));
      return { name: MOD_FILE[m], text: JSON.stringify({ app: 'apprenez-le-francais', version: 2, module: m, moduleName: MOD_NAME[m], exportedAt: now.toISOString(), settings: st, data: dt }) };
    });
    files.push({ name: 'README.txt', text: 'Apprenez le français ! backup, ' + now.toISOString().slice(0, 10) + '.\nOne file per module. Restore the whole .zip, or one module’s .json file, from Settings → Restore Backup.\n' });
    const blob = makeZip(files);
    const name = `apprenez-backup-${now.toISOString().slice(0, 10)}.zip`;
    const markSaved = () => { try { localStorage.setItem('apprenez.lastBackup', String(Date.now())); } catch (e) { /* ignore */ } render(); };
    let file = null;
    try { file = new File([blob], name, { type: 'application/zip' }); } catch (e) { /* old browser */ }
    // iPhone: the share sheet offers "Save to Files"
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Apprenez le français ! backup' }); markSaved(); toast('Backup saved.'); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try {
      const url = URL.createObjectURL(blob);
      const a = el(`<a href="${url}" download="${name}"></a>`);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      markSaved(); toast('Backup downloaded.');
    } catch (e) { toast('This browser could not save the file.'); }
  }

  async function readBackup(file) {
    let payloads = [];
    try {
      const buf = await file.arrayBuffer();
      const u8 = new Uint8Array(buf);
      const texts = u8[0] === 0x50 && u8[1] === 0x4B ? (await readZip(buf)).map(f => f.text) : [new TextDecoder().decode(u8)];
      texts.forEach(t => { try { payloads.push(JSON.parse(t)); } catch (e) { /* not JSON */ } });
    } catch (e) { payloads = []; }
    payloads = payloads.filter(b => b && b.app === 'apprenez-le-francais' && b.data && typeof b.data.forms === 'object')
      .map(b => Object.assign(b, { module: KEYS[b.module] ? b.module : 'vp' })); // backups from before the Verbs module are Verbs & Pronouns
    if (!payloads.length) { toast('That file isn’t an Apprenez backup.'); return; }
    const when = payloads[0].exportedAt ? fmtDate(Date.parse(payloads[0].exportedAt)) : 'an unknown date';
    const list = payloads.map(b => { const n = Object.keys(b.data.forms).length; return `${MOD_NAME[b.module]} (${fmtNum(n)} ${n === 1 ? 'form' : 'forms'} studied)`; }).join(', ');
    modal({
      title: 'Restore Backup', confirm: 'Restore',
      body: `Restore the backup from ${when}: ${list}? It replaces the progress, lists and settings of ${payloads.length > 1 ? 'those modules' : 'that module'}.`,
      onConfirm: () => {
        payloads.forEach(b => { save(KEYS[b.module].s, settingsFor(b.module, b.settings || null)); save(KEYS[b.module].d, dataFor(b.data)); });
        settings = settingsFor(mod, load(KEYS[mod].s, null)); data = dataFor(load(KEYS[mod].d, {}));
        if (quiz) quiz.sig = '';
        render(); toast('Backup restored.');
      },
    });
  }

  /* ---------------- Verb list pages ---------------- */
  let listKey = 'common', listSearch = '', settingsScroll = 0, listFrom = 'settings';
  let listRestore = null, listShown = 0, verbId = null;
  const CHUNK = 80;

  function listItems() {
    const q = V.strip(V.norm(listSearch));
    const match = (...xs) => !q || xs.some(x => V.strip((x || '').toLowerCase()).includes(q));
    if (mod === 'nd') {
      const withArt = n => N.join(N.determiner('def', n, n.pluralOnly ? 'p' : 's'), n.pluralOnly ? n.w : n.w);
      const nounItem = id => { const n = N.BY_ID[id]; return n && { key: id, noun: id, title: withArt(n), sub: n.en + (n.pluralOnly ? ' (plural)' : ''), fr: true, star: isCustom(id), match: n.w }; };
      let it;
      if (listKey === 'review' || listKey === 'learned') {
        const keys = listKey === 'review'
          ? reviewKeys().sort((a, b) => (data.forms[b].last || 0) - (data.forms[a].last || 0))
          : learnedKeys().sort((a, b) => data.forms[b].learnedAt - data.forms[a].learnedAt);
        it = keys.map(k => {
          const f = data.forms[k], p = N.parseKey(k), n = N.BY_ID[p.id];
          return { key: k, noun: p.id, title: N.join(N.determiner('def', n, p.v), N.wordOf(n, p.v)), fr: true,
            sub: `${N.nounEnglish(n, p.v)} · ${N.VARIANT_LABEL[p.v]}` + (listKey === 'review' ? ` · ${typeName(f.type)}` : ` · learned ${fmtDate(f.learnedAt)}`),
            right: listKey === 'review' ? dots(f.streak) : '', match: n.w };
        });
      } else if (listKey === 'incorrect') {
        it = missedKeys().map(k => { const m = data.missed[k]; return { key: k, noun: m.v, title: m.full, fr: true, sub: `${m.en} · ${(N.KIND[m.kind] || {}).label || ''}`, match: m.v }; });
      } else if (listKey === 'custom') it = data.custom.map(nounItem).filter(Boolean);
      else it = groupIds(listKey).map(nounItem);
      return it.filter(x => match(x.title, x.sub, x.match));
    }
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
    } else if (mod === 'vb' && (listKey === 'custom' || listKey === 'incorrect')) {
      // Verbs module: whole tenses ("prendre · passé composé")
      const keys = listKey === 'custom' ? data.custom.slice().reverse() : missedKeys();
      items = keys.map(k => {
        const [id, t] = listKey === 'custom' ? k.split('|') : [data.missed[k].v, data.missed[k].t];
        const v = V.BY_ID[id];
        return v && { key: k, verb: id, title: id, fr: true, sub: `${V.TENSE_LABEL[t] || t} · ${V.englishGloss(v)}`, match: id };
      }).filter(Boolean);
    } else if (listKey === 'incorrect') {
      items = missedKeys().map(k => {
        const m = data.missed[k];
        return { key: k, verb: m.v, title: cap(m.full), fr: true, sub: `${m.en} · ${V.TENSE_LABEL[m.t] || m.t}`, match: m.v };
      });
    } else if (listKey === 'custom') {
      items = data.custom.map(verbItem).filter(Boolean);
    } else {
      items = groupIds(listKey).map(verbItem);
    }
    return items.filter(it => match(it.title, it.sub, it.match));
  }

  function viewList() {
    const src = sourcesFor()[listKey];
    const canRemove = listKey === 'custom'; // only Custom lets you remove verbs
    const actionLabel = 'Remove';
    let items = listItems();
    const total = items.length;
    const node = el(`
      <div class="screen page list-page">
        <header class="bar">
          <button class="icon back-text" data-act="back" aria-label="Back to ${listFrom === 'progress' ? 'Progress' : 'Settings'}">${ICON.back}<span>${listFrom === 'progress' ? 'Progress' : 'Settings'}</span></button>
          <div class="bar-title">${esc(src.label)}</div>
          <div class="bar-right">${canRemove ? '<button class="text-btn" data-act="edit">Edit</button>' : ''}</div>
        </header>
        <div class="list-tools">
          <label class="search"><span class="sr">Search</span>
            <input type="search" placeholder="Search ${esc(src.label)}" value="${esc(listSearch)}" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">
          </label>
          <p class="list-count muted"><span data-count>${fmtNum(total)}</span> <span data-noun>${noun(total)}</span>${total && canRemove ? ' · swipe left to remove' : ''}</p>
        </div>
        <ul class="swipe-list" role="list"></ul>
        <div class="sentinel"></div>
        <p class="empty list-empty">${listSearch ? 'No matches.' : emptyText(listKey)}</p>
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
          ${canRemove ? `<button class="sw-act" tabindex="-1">${actionLabel}</button>` : ''}
          <div class="sw-main">
            <div class="sw-text"><span class="f" ${it.fr ? 'lang="fr"' : ''}>${esc(it.title)}${it.star ? `<span class="chip-star">${ICON.star}</span>` : ''}</span><span class="meta">${esc(it.sub)}</span></div>
            ${it.right || ''}<span class="row-chev">${ICON.chev}</span>
            ${canRemove ? `<button class="sw-inline" aria-label="${actionLabel} ${esc(it.title)}">${actionLabel}</button>` : ''}
          </div>
        </li>`);
      li._item = it;
      if (canRemove) {
        attachSwipe(li, () => act(li));
        $('.sw-act', li).onclick = () => act(li);
        $('.sw-inline', li).onclick = e => { e.stopPropagation(); act(li); };
      } else li.classList.add('fixed');
      $('.sw-main', li).addEventListener('click', e => {
        if (e.target.closest('.sw-inline') || li.classList.contains('open')) return;
        if (it.noun) { if (N.BY_ID[it.noun]) { nounId = it.noun; nounFrom = 'list'; go('noun'); } return; }
        if (!V.BY_ID[it.verb]) return;
        verbId = it.verb; verbFrom = 'list'; go('verb');
      });
      return li;
    };
    function act(li) {
      const it = li._item;
      const undo = perform(it.key);
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

    $('[data-act="back"]', node).onclick = () => go(listFrom);
    const editBtn = $('[data-act="edit"]', node);
    if (editBtn) editBtn.onclick = () => { const on = ul.classList.toggle('editing'); editBtn.textContent = on ? 'Done' : 'Edit'; closeOpenRow(); };
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

  const noun = n => (mod === 'nd' ? (listKey === 'incorrect' ? (n === 1 ? 'phrase' : 'phrases') : listKey === 'review' || listKey === 'learned' ? (n === 1 ? 'form' : 'forms') : (n === 1 ? 'noun' : 'nouns')) : mod === 'vb' && (listKey === 'custom' || listKey === 'incorrect') ? (n === 1 ? 'verb tense' : 'verb tenses') : listKey === 'incorrect' ? (n === 1 ? 'phrase' : 'phrases') : listKey === 'review' || listKey === 'learned' ? (n === 1 ? 'form' : 'forms') : (n === 1 ? 'verb' : 'verbs'));
  /* ---------------- Verb page ---------------- */
  const GROUP_NAME = { 1: 'first group', 2: 'second group', 3: 'third group' };
  const AUX_NAME = { a: 'avoir', e: 'être', E: 'être or avoir' };
  function viewVerb() {
    const v = V.BY_ID[verbId];
    const backLabel = verbFrom === 'quiz' ? 'Quiz' : sourcesFor()[listKey] ? sourcesFor()[listKey].label : 'Back';
    const slotLabel = ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'];
    const dotFor = (tense, slot) => {
      const f = data.forms[V.formKey(v.id, tense, slot)];
      if (!f) return '';
      return f.learnedAt ? '<i class="ldot" title="Learned"></i>' : '<i class="rdot" title="In review"></i>';
    };
    const impCell = slot => {
      const p = V.verbPart(v, 'imperatif', V.SLOT_PRONOUN[slot]);
      const label = `(${V.SLOT_PRONOUN[slot]})`;
      if (!p) return `<div class="vf missing"><span class="pr">${label}</span> —</div>`;
      const refl = v.refl ? '-' + { 1: 'toi', 3: 'nous', 4: 'vous' }[slot] : '';
      return `<div class="vf"><span class="pr">${label}</span> <span class="fv">${esc(p.canon + refl)}</span>${dotFor('imperatif', slot)}</div>`;
    };
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
      const sep = pron.endsWith("'") ? '' : ' ';
      return `<div class="vf"><span class="pr">${esc(pron)}</span>${sep}<span class="fv">${esc(rest)}</span>${alt}${dotFor(tense, slot)}</div>`;
    };
    const node = el(`
      <div class="screen page verb-page">
        <header class="bar">
          <button class="icon back-text" data-act="back" aria-label="Back to ${esc(backLabel)}">${ICON.back}<span>${esc(backLabel)}</span></button>
          <div class="bar-title"></div>
          <div class="bar-right">${mod === 'vb' ? '' : `<button class="icon star" data-act="star">${ICON.star}</button>`}<button class="icon" data-act="guide" aria-label="Grammar guide">${ICON.book}</button></div>
        </header>
        <div class="content">
          <h1 class="verb-title" lang="fr">${esc(v.id)}</h1>
          <p class="verb-sub">${hasDefs(v) ? `<a href="#" class="def-link" data-act="meanings">${esc(V.englishGloss(v))}</a>` : esc(V.englishGloss(v))} · ${GROUP_NAME[v.group]} · ${AUX_NAME[v.aux]}${lvTag(verbLevel(v))}</p>
          <p class="verb-legend"><span><i class="ldot"></i>learned form</span><span><i class="rdot"></i>reviewed form</span></p>
          ${V.TENSES.map(t => `
            <section class="vt">
              <h2 lang="fr" style="color:${TENSE_COLOR[t.id]}">${esc(t.label)}</h2>
              <div class="q-rule"></div>
              <div class="vgrid" lang="fr">${t.id === 'imperatif' ? [1, 3, 4].map(impCell).join('') : [0, 3, 1, 4, 2, 5].map(s => cell(t.id, s)).join('')}</div>
            </section>`).join('')}
        </div>
      </div>`);
    $('[data-act="back"]', node).onclick = () => go(verbFrom);
    $('[data-act="guide"]', node).onclick = () => openGuide();
    const ml = $('[data-act="meanings"]', node);
    if (ml) ml.onclick = e => { e.preventDefault(); verbScroll = window.scrollY; go('meanings'); };
    const star = $('[data-act="star"]', node);
    if (star) {
    const setStar = () => {
      const on = isCustom(v.id);
      star.classList.toggle('on', on); star.setAttribute('aria-pressed', on);
      star.setAttribute('aria-label', on ? 'Remove from Custom list' : 'Add to Custom list');
    };
    setStar();
    star.onclick = () => { const on = toggleCustom(v.id); setStar(); toast(on ? `${v.id} added to Custom` : `${v.id} removed from Custom`); };
    }
    return node;
  }

  /* ---------------- Meanings (Wiktionary) ---------------- */
  // definitions.js is large, so it loads in the background after the app starts
  let verbFrom = 'list', verbScroll = 0, defsState = window.DEFS ? 'ready' : 'idle';
  function loadDefs() {
    if (defsState !== 'idle') return;
    defsState = 'loading';
    const sc = document.createElement('script');
    sc.src = 'definitions.js';
    sc.onload = () => { defsState = window.DEFS ? 'ready' : 'failed'; if (view === 'meanings') render(); };
    sc.onerror = () => { defsState = 'failed'; if (view === 'meanings') render(); };
    document.head.appendChild(sc);
  }
  const defsOf = v => (window.DEFS && window.DEFS[v.id]) || null;
  // until the file has loaded, assume there are meanings (all but one verb has some)
  const hasDefs = v => (defsState === 'ready' ? !!defsOf(v) : defsState !== 'failed');
  function viewMeanings() {
    const v = V.BY_ID[verbId];
    loadDefs();
    const defs = defsOf(v) || [];
    const from = (window.DEFS_FROM && window.DEFS_FROM[v.id]) || null;
    const word = from || v.inf;
    const wikt = 'https://en.wiktionary.org/wiki/' + encodeURIComponent(word) + '#French';
    let body;
    if (defsState === 'loading' || defsState === 'idle') body = '<p class="muted">Loading meanings…</p>';
    else if (defsState === 'failed') body = '<p class="muted">The meanings file (definitions.js) couldn’t be loaded. Open the app once while online, or check that the file is on your site.</p>';
    else if (!defs.length) body = '<p class="muted">Wiktionary has no meanings listed for this verb yet.</p>';
    else body = `
          ${from ? `<p class="def-note muted">Wiktionary lists no separate meanings for <span lang="fr">${esc(v.id)}</span>, so these are the meanings of <span lang="fr">${esc(from)}</span>.</p>` : ''}
          <ol class="senses">
            ${defs.map(([gloss, tags, ex], i) => `
              <li class="sense">
                <div class="s-head"><span class="s-num">${i + 1}</span><span class="s-gloss">${esc(gloss)}</span></div>
                ${tags.length ? `<div class="s-tags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
                ${ex.length ? `<ul class="gd-ex">${ex.map(([fr, en]) => `<li><span class="fr" lang="fr">${esc(fr)}</span>${en ? `<span class="en">${esc(en)}</span>` : ''}</li>`).join('')}</ul>` : ''}
              </li>`).join('')}
          </ol>
          <p class="foot muted credits">Meanings and examples from the <a href="${wikt}" target="_blank" rel="noopener">Wiktionary entry for <span lang="fr">${esc(word)}</span></a>, by Wiktionary contributors, used under the <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0 licence</a>. Reformatted for this app.</p>`;
    const node = el(`
      <div class="screen page meanings-page">
        <header class="bar">
          <button class="icon back-text" data-act="back" aria-label="Back to ${esc(v.id)}">${ICON.back}<span lang="fr">${esc(v.id)}</span></button>
          <div class="bar-title"></div>
          <div class="bar-right"></div>
        </header>
        <div class="content">
          <h1 class="verb-title" lang="fr">${esc(v.id)}</h1>
          <p class="verb-sub">Meanings${defsState === 'ready' ? ` · ${defs.length} ${defs.length === 1 ? 'sense' : 'senses'}` : ''}</p>
          ${body}
        </div>
      </div>`);
    $('[data-act="back"]', node).onclick = () => { const y = verbScroll; go('verb'); requestAnimationFrame(() => window.scrollTo(0, y)); };
    return node;
  }

  /* ---------------- Noun pages ---------------- */
  let nounId = null, nounFrom = 'list', nounScroll = 0, ndefsState = window.NDEFS ? 'ready' : 'idle';
  function loadNDefs() {
    if (ndefsState !== 'idle') return;
    ndefsState = 'loading';
    const sc = document.createElement('script');
    sc.src = 'noun-defs.js';
    sc.onload = () => { ndefsState = window.NDEFS ? 'ready' : 'failed'; if (view === 'nmeanings') render(); };
    sc.onerror = () => { ndefsState = 'failed'; if (view === 'nmeanings') render(); };
    document.head.appendChild(sc);
  }
  const ndefsOf = n => (window.NDEFS && window.NDEFS[n.id]) || null;
  const GENDER_NAME = { m: 'masculine', f: 'feminine' };
  function viewNoun() {
    const n = N.BY_ID[nounId];
    loadNDefs();
    const backLabel = nounFrom === 'quiz' ? 'Quiz' : sourcesFor()[listKey] ? sourcesFor()[listKey].label : 'Back';
    const dot = v => { const f = data.forms[N.formKey(n.id, v)]; return !f ? '' : f.learnedAt ? '<i class="ldot" title="Learned"></i>' : '<i class="rdot" title="In review"></i>'; };
    const cellFor = v => {
      const w = N.wordOf(n, v), alts = N.altsOf(n, v);
      return `<td lang="fr">${esc(N.join(N.determiner('def', n, v), w))}${dot(v)}${alts.length > 1 ? `<span class="alt"> or ${esc(alts.slice(1).join(', '))}</span>` : ''}<small>${esc(N.join(N.determiner('ind', n, v), w))}</small></td>`;
    };
    const rows = [];
    const g0 = GENDER_NAME[n.g];
    if (n.pluralOnly) rows.push(`<tr><td class="g">${g0}</td><td class="na">—</td>${cellFor('p')}</tr>`);
    else {
      rows.push(`<tr><td class="g">${g0}</td>${cellFor('s')}${cellFor('p')}</tr>`);
      if (n.fem) rows.push(`<tr><td class="g">feminine</td>${cellFor('fs')}${cellFor('fp')}</tr>`);
    }
    // short notes that apply to this noun
    const notes = [];
    const el1 = N.elides(n, n.w);
    if (n.h) notes.push(`Starts with an aspirated <i>h</i>, so there’s no <i>l’</i>: <b lang="fr">${esc(N.join(N.determiner('def', n, 's'), n.w))}</b>, <b lang="fr">${esc(N.join(N.determiner('dem', n, 's'), n.w))}</b>.`);
    else if (el1 && !n.pluralOnly) {
      const ex = [N.join(N.determiner('def', n, 's'), n.w), N.join(N.determiner('dem', n, 's'), n.w)];
      if (n.g === 'f' || n.fem) ex.push(N.join(N.determiner('pos', n, n.g === 'f' ? 's' : 'fs', 'je'), n.g === 'f' ? n.w : n.fem) + (n.g === 'f' || n.fem ? '' : ''));
      notes.push(`Starts with a vowel sound, so: ${ex.map(x => `<b lang="fr">${esc(x)}</b>`).join(', ')}${n.g === 'f' || n.fem ? ' (not <i>ma</i>)' : ''}.`);
    }
    if (!n.pluralOnly && !n.nopl) {
      const reg = n.pl[0] === n.w + 's' || (/[sxz]$/.test(n.w) && n.pl[0] === n.w);
      if (!reg) notes.push(`Irregular plural: <b lang="fr">${esc(n.w)}</b> → <b lang="fr">${esc(n.pl.join(' or '))}</b>.`);
      else if (/[sxz]$/.test(n.w)) notes.push(`Ends in <i>-${esc(n.w.slice(-1))}</i>, so the plural doesn’t change: <b lang="fr">les ${esc(n.w)}</b>.`);
    }
    if (n.person) notes.push(n.fem === n.w
      ? `The same word for a man or a woman: only the determiner changes, <b lang="fr">${esc(N.join(N.determiner('ind', n, 's'), n.w))}</b> / <b lang="fr">${esc(N.join(N.determiner('ind', n, 'fs'), n.w))}</b>.`
      : `For people, the gender follows the person: <b lang="fr">${esc(N.join(N.determiner('ind', n, 's'), n.w))}</b> for a man, <b lang="fr">${esc(N.join(N.determiner('ind', n, 'fs'), n.fem))}</b> for a woman.`);
    if (n.mass) notes.push(`Often used for “some”: <b lang="fr">${esc(N.join(N.determiner('part', n, 's'), n.w))}</b>.`);
    if (n.pluralOnly) notes.push(`Used only in the plural: <b lang="fr">les ${esc(n.w)}</b>.`);
    const groupName = { common: 'Common Nouns', g1: 'Frequent Nouns', g2: 'Less Common Nouns' }[n.group];
    const hasLink = ndefsState !== 'failed';
    const node = el(`
      <div class="screen page verb-page noun-page">
        <header class="bar">
          <button class="icon back-text" data-act="back" aria-label="Back to ${esc(backLabel)}">${ICON.back}<span>${esc(backLabel)}</span></button>
          <div class="bar-title"></div>
          <div class="bar-right"><button class="icon star" data-act="star">${ICON.star}</button><button class="icon" data-act="guide" aria-label="Grammar guide">${ICON.book}</button></div>
        </header>
        <div class="content">
          <h1 class="verb-title" lang="fr">${esc(n.w)}</h1>
          <p class="verb-sub">${hasLink ? `<a href="#" class="def-link" data-act="meanings">${esc(n.en)}</a>` : esc(n.en)} · ${n.pluralOnly ? g0 + ' plural' : n.fem && n.fem !== n.w ? 'masculine and feminine' : n.person ? 'masculine or feminine' : g0} · ${groupName}, no. ${fmtNum(n.rank)}${lvTag(nounLevel(n))}</p>
          <p class="verb-legend"><span><i class="ldot"></i>learned form</span><span><i class="rdot"></i>reviewed form</span></p>
          <table class="nf-table">
            <tr><th></th><th>Singular</th><th>Plural</th></tr>
            ${rows.join('')}
          </table>
          ${notes.map(x => `<p class="nnote">${x}</p>`).join('')}
        </div>
      </div>`);
    $('[data-act="back"]', node).onclick = () => go(nounFrom);
    $('[data-act="guide"]', node).onclick = () => openGuide();
    const ml = $('[data-act="meanings"]', node);
    if (ml) ml.onclick = e => { e.preventDefault(); nounScroll = window.scrollY; go('nmeanings'); };
    const star = $('[data-act="star"]', node);
    const setStar = () => { const on = isCustom(n.id); star.classList.toggle('on', on); star.setAttribute('aria-pressed', on); star.setAttribute('aria-label', on ? 'Remove from Custom list' : 'Add to Custom list'); };
    setStar();
    star.onclick = () => { const on = toggleCustom(n.id); setStar(); toast(on ? `${n.w} added to Custom` : `${n.w} removed from Custom`); };
    return node;
  }
  function viewNMeanings() {
    const n = N.BY_ID[nounId];
    loadNDefs();
    const defs = ndefsOf(n) || [];
    const wikt = 'https://en.wiktionary.org/wiki/' + encodeURIComponent(n.w) + '#French';
    let body;
    if (ndefsState === 'loading' || ndefsState === 'idle') body = '<p class="muted">Loading meanings…</p>';
    else if (ndefsState === 'failed') body = '<p class="muted">The meanings file (noun-defs.js) couldn’t be loaded. Open the app once while online, or check that the file is on your site.</p>';
    else body = `
          <ol class="senses">
            ${defs.map(([gloss, tags, ex], i) => `
              <li class="sense">
                <div class="s-head"><span class="s-num">${i + 1}</span><span class="s-gloss">${esc(gloss)}</span></div>
                ${tags.length ? `<div class="s-tags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
                ${ex.length ? `<ul class="gd-ex">${ex.map(([fr, en]) => `<li><span class="fr" lang="fr">${esc(fr)}</span>${en ? `<span class="en">${esc(en)}</span>` : ''}</li>`).join('')}</ul>` : ''}
              </li>`).join('')}
          </ol>
          <p class="foot muted credits">Meanings and examples from the <a href="${wikt}" target="_blank" rel="noopener">Wiktionary entry for <span lang="fr">${esc(n.w)}</span></a>, by Wiktionary contributors, used under the <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0 licence</a>. Reformatted for this app.</p>`;
    const node = el(`
      <div class="screen page meanings-page">
        <header class="bar">
          <button class="icon back-text" data-act="back" aria-label="Back to ${esc(n.w)}">${ICON.back}<span lang="fr">${esc(n.w)}</span></button>
          <div class="bar-title"></div>
          <div class="bar-right"></div>
        </header>
        <div class="content">
          <h1 class="verb-title" lang="fr">${esc(N.join(N.determiner('def', n, n.pluralOnly ? 'p' : 's'), n.w))}</h1>
          <p class="verb-sub">Meanings${ndefsState === 'ready' ? ` · ${defs.length} ${defs.length === 1 ? 'sense' : 'senses'}` : ''}</p>
          ${body}
        </div>
      </div>`);
    $('[data-act="back"]', node).onclick = () => { const y = nounScroll; go('noun'); requestAnimationFrame(() => window.scrollTo(0, y)); };
    return node;
  }

  function emptyText(key) {
    return {
      custom: mod === 'nd' ? 'Tap the star on a quiz question or noun page to add the noun here.' : 'Tap the star on a quiz question or verb page to add the verb here.',
      review: 'Forms appear here after you answer them in a quiz.',
      learned: 'Nothing learned yet. Answer a form correctly five times in a row to learn it.',
      incorrect: 'Nothing here. Questions you miss appear here, and leave once you answer them correctly.',
    }[key] || 'No verbs in this list.';
  }
  function undoMessage(it) { return `Removed ${it.title} from Custom`; }
  // Remove a verb from Custom and return an undo function
  function perform(key) {
    const i = data.custom.indexOf(key); data.custom.splice(i, 1); saveData();
    return () => { data.custom.splice(i, 0, key); saveData(); };
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

  /* ---------------- Grammar guide ---------------- */
  let guideFrom = 'quiz', guideScroll = 0;
  function openGuide() { guideFrom = view; guideScroll = window.scrollY; go('guide'); }
  // keep endings like "-eau" or "-s" on one line
  const nw = h => h.replace(/(^|[\s(/·])(-[a-zàâäçéèêëîïôöùûü]+)/g, '$1<span class="nw">$2</span>');
  function viewGuide() {
    const G = window.GUIDE;
    const item = (x, color) => `
      <section class="gd">
        <h3 lang="fr"${color ? ` style="color:${color}"` : ''}>${esc(x.title)}${lvTag(GRAMMAR_LEVEL[x.id === 'subj' && !color ? 'subj_pron' : x.id])}</h3>
        <div class="q-rule"></div>
        ${x.list ? `<p class="gd-list" lang="fr">${esc(x.list)}</p>` : ''}
        <p>${esc(x.use)}</p>
        ${x.form ? `<p class="gd-form"><strong>How it’s formed.</strong> ${esc(x.form)}</p>` : ''}
        ${x.rules ? `<dl class="gd-rules">${x.rules.map(([a, b]) => `<dt>${nw(esc(a))}</dt><dd lang="fr">${nw(esc(b))}</dd>`).join('')}</dl>` : ''}
        <ul class="gd-ex">${x.ex.map(([fr, en]) => `<li><span class="fr" lang="fr">${esc(fr)}</span><span class="en">${esc(en)}</span></li>`).join('')}</ul>
      </section>`;
    const node = el(`
      <div class="screen page guide-page">
        <header class="bar">
          <button class="icon" data-act="close" aria-label="Close guide">${ICON.close}</button>
          <div class="bar-title">Grammar Guide</div>
          <div class="bar-right"></div>
        </header>
        <div class="content">
          ${mod === 'nd' ? `<nav class="gd-jump"><a href="#" data-jump="g-nouns">Nouns</a><a href="#" data-jump="g-dets">Determiners</a></nav>
          <h2 class="gd-h" id="g-nouns">Nouns</h2>
          ${G.nouns.map(x => item(x)).join('')}
          <h2 class="gd-h" id="g-dets">Determiners</h2>
          ${G.dets.map(x => item(x, N.KIND[x.id].color)).join('')}` : `
          ${mod === 'vb' ? '' : '<nav class="gd-jump"><a href="#" data-jump="g-verbs">Verbs</a><a href="#" data-jump="g-pron">Pronouns</a></nav>'}
          <h2 class="gd-h" id="g-verbs">Verbs</h2>
          ${G.verbs.map(x => item(x, TENSE_COLOR[x.id])).join('')}
          ${mod === 'vb' ? '' : `<h2 class="gd-h" id="g-pron">Pronouns</h2>
          ${G.pronouns.map(x => item(x)).join('')}`}`}
        </div>
      </div>`);
    $('[data-act="close"]', node).onclick = () => { const y = guideScroll; go(guideFrom); if (guideFrom !== 'quiz') requestAnimationFrame(() => window.scrollTo(0, y)); };
    $$('[data-jump]', node).forEach(a => a.onclick = e => { e.preventDefault(); const t = $('#' + a.dataset.jump, node); window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' }); });
    return node;
  }

  /* ---------------- Progress ---------------- */
  let range = '30';
  function stats() {
    const since = range === '30' ? Date.now() - 30 * DAY : 0;
    const ev = data.events.filter(e => e.t >= since);
    const vs = verbStats();
    return {
      forms: new Set(ev.flatMap(e => e.fk || [e.k])).size,
      answered: ev.length,
      wrong: ev.filter(e => !e.ok).length,
      complete: mod === 'nd'
        ? Object.keys(vs).filter(id => N.BY_ID[id] && vs[id].learned >= N.nForms(N.BY_ID[id]) && vs[id].lastLearned >= since).length
        : Object.keys(vs).filter(id => V.BY_ID[id] && vs[id].learned >= V.nForms(V.BY_ID[id]) && vs[id].lastLearned >= since).length,
      review: reviewKeys().length, learned: learnedKeys().length,
    };
  }
  /* Charts: plain SVG, sized by viewBox so they fill the column */
  const CORRECT_C = '#4f9f6f', WRONG_C = '#9e2f25'; // checked for colour-blind separation
  const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
  const weekStart = t => { const d = new Date(dayStart(t)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  const monthStart = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
  const fmtDay = (t, o) => new Date(t).toLocaleDateString(undefined, o || { day: 'numeric', month: 'short' });
  function niceMax(m) {
    if (m <= 4) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p;
    return [1.2, 1.6, 2, 3, 4, 5, 6, 8, 10].find(x => f <= x) * p; // the top is a round number with a round half
  }
  const TENSE_SHORT = { present: 'présent', pc: 'p. composé', imparfait: 'imparfait', futur: 'futur', cond: 'conditionnel', pqp: 'p.-q.-parfait',
    fa: 'f. antérieur', subj: 'subjonctif', cp: 'cond. passé', ps: 'p. simple', imperatif: 'impératif' };
  // time buckets for the daily chart: days (up to 60), else weeks (up to two years), else months
  function timeBuckets(ev) {
    const today = dayStart(Date.now());
    let unit = 'day', first = range === '30' ? addDays(today, -29) : (ev.length ? dayStart(Math.min(...ev.map(e => e.t))) : today);
    if (range !== '30') first = Math.min(first, addDays(today, -6)); // at least a week wide
    const spanDays = Math.round((today - first) / DAY) + 1;
    if (range !== '30' && spanDays > 730) unit = 'month';
    else if (range !== '30' && spanDays > 60) unit = 'week';
    const startOf = unit === 'day' ? dayStart : unit === 'week' ? weekStart : monthStart;
    const next = t => (unit === 'month' ? new Date(new Date(t).getFullYear(), new Date(t).getMonth() + 1, 1).getTime() : addDays(t, unit === 'week' ? 7 : 1));
    const buckets = [];
    for (let t = startOf(first); t <= today; t = next(t)) buckets.push({ t, ok: 0, bad: 0 });
    const idx = new Map(buckets.map((b, i) => [b.t, i]));
    ev.forEach(e => { const i = idx.get(startOf(e.t)); if (i !== undefined) buckets[i][e.ok ? 'ok' : 'bad']++; });
    return { buckets, unit };
  }
  // A vertical bar chart. bars: [{ segs: [{ v, c }] (bottom first), label, tip, value? }]
  function barChart(bars, { xLabel = (b, i) => '', rotate = false, values = false, h = 190 } = {}) {
    const W = 340, padL = 34, padR = 6, padT = values ? 18 : 10, padB = rotate ? 74 : 24;
    const plotW = W - padL - padR, plotH = h - padT - padB;
    const max = niceMax(Math.max(1, ...bars.map(b => b.segs.reduce((a, x) => a + x.v, 0))));
    const step = plotW / bars.length, bw = Math.max(2, Math.min(22, step * 0.68));
    const y = v => padT + plotH - (v / max) * plotH;
    let out = '';
    [0, max / 2, max].forEach(v => {
      out += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="${v ? 'grid' : 'base'}"/>` +
        `<text x="${padL - 6}" y="${y(v) + 3.5}" class="ax" text-anchor="end">${fmtNum(Math.round(v * 10) / 10)}</text>`;
    });
    bars.forEach((b, i) => {
      const cx = padL + step * i + step / 2, x = cx - bw / 2;
      const total = b.segs.reduce((a, s) => a + s.v, 0);
      let base = 0, g = '';
      const shown = b.segs.filter(sg => sg.v > 0);
      shown.forEach((sg, j) => {
        const top = j === shown.length - 1;
        const y0 = y(base), y1 = y(base + sg.v) + (j > 0 ? 0 : 0);
        const gap = j > 0 ? 2 : 0; // a 2px white gap between correct and incorrect
        const hh = Math.max(0, y0 - y1 - gap), yy = y1;
        const r = top ? Math.min(4, bw / 2, hh) : 0;
        g += r ? `<path d="M${x},${yy + hh} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${yy + hh} Z" fill="${sg.c}"/>`
          : `<rect x="${x}" y="${yy}" width="${bw}" height="${hh}" fill="${sg.c}"/>`;
        base += sg.v;
      });
      if (values && total) g += `<text x="${cx}" y="${y(total) - 5}" class="val" text-anchor="middle">${fmtNum(total)}</text>`;
      const lab = xLabel(b, i);
      if (lab) g += rotate
        ? `<text class="ax xl" transform="translate(${cx + 3},${padT + plotH + 10}) rotate(-45)" text-anchor="end">${esc(lab)}</text>`
        : `<text class="ax" x="${cx}" y="${padT + plotH + 16}" text-anchor="middle">${esc(lab)}</text>`;
      out += `<g class="bar" data-i="${i}">${g}<rect class="hit" x="${padL + step * i}" y="${padT}" width="${step}" height="${plotH}"/></g>`;
    });
    return `<svg class="chart-svg" viewBox="0 0 ${W} ${h}" role="img">${out}</svg>`;
  }
  // tap (or hover) a bar to see its numbers in the line under the chart
  function wireChart(box, bars, fallback) {
    const cap = $('.chart-cap', box);
    const set = i => {
      $$('.bar', box).forEach(g => g.classList.toggle('dim', i !== null && +g.dataset.i !== i));
      cap.textContent = i === null ? fallback : bars[i].tip;
    };
    $$('.bar', box).forEach(g => {
      g.addEventListener('click', e => { e.stopPropagation(); set(+g.dataset.i); });
      g.addEventListener('mouseenter', () => set(+g.dataset.i));
    });
    $('.chart-svg', box).addEventListener('mouseleave', () => set(null));
    set(null);
  }

  function viewProgress() {
    const st = stats();
    const since = range === '30' ? Date.now() - 30 * DAY : 0;
    const ev = data.events.filter(e => e.t >= since && knownKey(e.k));
    // chart 1: questions answered per day, correct (bottom) and incorrect (top)
    const { buckets, unit } = timeBuckets(ev);
    const unitWord = { day: 'day', week: 'week', month: 'month' }[unit];
    const label = t => (unit === 'month' ? fmtDay(t, { month: 'short', year: '2-digit' }) : unit === 'week' ? 'Week of ' + fmtDay(t) : fmtDay(t, { weekday: 'short', day: 'numeric', month: 'short' }));
    const dayBars = buckets.map(b => ({ t: b.t, segs: [{ v: b.ok, c: CORRECT_C }, { v: b.bad, c: WRONG_C }],
      tip: `${label(b.t)}: ${fmtNum(b.ok + b.bad)} answered · ${fmtNum(b.ok)} correct · ${fmtNum(b.bad)} incorrect` }));
    const nb = dayBars.length, every = Math.max(1, Math.ceil(nb / 5));
    const dayX = (b, i) => ((nb - 1 - i) % every === 0 ? (unit === 'month' ? fmtDay(b.t, { month: 'short' }) : fmtDay(b.t)) : '');
    // chart 2: questions answered per tense
    // second chart: by tense, or by kind of determiner in Nouns & Determiners
    const nd = mod === 'nd';
    const perTense = {}; ev.forEach(e => { const t = nd ? e.dt : V.parseKey(e.k).tense; perTense[t] = (perTense[t] || 0) + 1; });
    const cats = nd ? N.KINDS.map(k => ({ id: k.id, label: k.label, short: { def: 'défini', ind: 'indéfini', part: 'partitif', pos: 'possessif', dem: 'démonstratif' }[k.id], color: k.color }))
      : V.TENSES.map(t => ({ id: t.id, label: t.label, short: TENSE_SHORT[t.id], color: TENSE_COLOR[t.id] }));
    const tenseBars = cats.map(t => ({ segs: [{ v: perTense[t.id] || 0, c: t.color }], name: t.short,
      tip: `${t.label}: ${fmtNum(perTense[t.id] || 0)} ${perTense[t.id] === 1 ? 'question' : 'questions'}` }));
    const empty = !ev.length;
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
            <button class="tile" data-to="review">
              <span class="t-chev">${ICON.chev}</span>
              <div class="t-num">${fmtNum(st.forms)}</div>
              <div class="t-label">${nd ? 'Noun forms studied' : 'Verb forms studied'}</div>
              <div class="t-note">${fmtNum(st.answered)} ${st.answered === 1 ? 'question' : 'questions'} answered · see In Review</div>
            </button>
            <button class="tile" data-to="learned">
              <span class="t-chev">${ICON.chev}</span>
              <div class="t-num">${fmtNum(st.complete)}</div>
              <div class="t-label">${nd ? 'Complete nouns learnt' : 'Complete verbs learnt'}</div>
              <div class="t-note">${nd ? 'every form: singular, plural, feminine' : `every form, in all ${V.TENSES.length} tenses`} · see Learned</div>
            </button>
            <button class="tile" data-to="incorrect">
              <span class="t-chev">${ICON.chev}</span>
              <div class="t-num">${fmtNum(st.wrong)}</div>
              <div class="t-label">Incorrect answers</div>
              <div class="t-note">still wrong after all tries · see Incorrect Answers</div>
            </button>
          </div>

          <section class="chart" data-chart="days">
            <h2 class="chart-h">Questions per ${unitWord}</h2>
            <div class="legend"><span><i style="background:${CORRECT_C}"></i>Correct</span><span><i style="background:${WRONG_C}"></i>Incorrect</span></div>
            ${barChart(dayBars, { xLabel: dayX })}
            <p class="chart-cap muted"></p>
          </section>

          <section class="chart" data-chart="tenses">
            <h2 class="chart-h">${nd ? 'Questions by determiner' : 'Questions by tense'}</h2>
            ${barChart(tenseBars, { xLabel: b => b.name, rotate: true, values: true, h: 230 })}
            <p class="chart-cap muted"></p>
          </section>
        </div>
      </div>`);
    $('[data-act="close"]', node).onclick = () => go('quiz');
    $$('[data-r]', node).forEach(b => b.onclick = () => { range = b.dataset.r; render(); });
    $$('[data-to]', node).forEach(b => b.onclick = () => { listKey = b.dataset.to; listSearch = ''; listFrom = 'progress'; go('list'); });
    const total = st.answered;
    wireChart($('[data-chart="days"]', node), dayBars, empty ? 'No questions answered yet.' : `Tap a bar to see that ${unitWord}. ${fmtNum(total)} answered in all.`);
    wireChart($('[data-chart="tenses"]', node), tenseBars, empty ? 'No questions answered yet.' : nd ? 'Tap a bar to see that determiner.' : 'Tap a bar to see that tense.');
    return node;
  }

  /* ---------------- Boot ---------------- */
  // If an update was only partly uploaded, say which file is missing instead of failing silently
  function missingFiles() {
    const out = [];
    if (!window.VERB_DATA) out.push('verbs-data.js');
    if (!window.Verbs) out.push('verbs.js');
    if (!window.Sentences) out.push('sentences.js');
    if (!window.GUIDE) out.push('guide.js');
    if (!window.NOUN_DATA) out.push('nouns-data.js');
    if (!window.Nouns) out.push('nouns.js');
    if (!window.LEVELS) out.push('levels.js');
    if (window.GUIDE && !window.GUIDE.nouns) out.push('guide.js (an older version is on the site)');
    if (window.Verbs && window.Verbs.VERBS.length && !window.Verbs.VERBS.some(v => v.pats)) out.push('verbs-data.js (an older version is on the site)');
    return out;
  }
  // Service worker: check for a new version every time the app is opened or brought back,
  // and reload once when a new version takes over.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  }
  const missing = missingFiles();
  if (missing.length) {
    document.getElementById('app').innerHTML = `<main class="screen home"><header class="home-head"><h1>Apprenez le français&nbsp;!</h1><div class="rule"></div></header>
      <p><strong>Some app files are missing or out of date:</strong></p><ul>${missing.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
      <p class="muted">Upload all the files from the latest zip to your site, then open the app again while online.</p></main>`;
    return;
  }
  render();
  setTimeout(loadDefs, 1500); // meanings load quietly once the app is up
  setTimeout(loadNDefs, 2500);
})();

/* Apprenez le français ! — verb data and conjugation engine */
(function (root) {
  'use strict';

  const TENSES = [
    ['present', 'présent'],
    ['pc', 'passé composé'],
    ['imparfait', 'imparfait'],
    ['futur', 'futur simple'],
    ['cond', 'conditionnel présent'],
    ['pqp', 'plus-que-parfait'],
    ['fa', 'futur antérieur'],
    ['subj', 'subjonctif présent'],
    ['cp', 'conditionnel passé'],
    ['ps', 'passé simple'],
  ].map(([id, label]) => ({ id, label }));
  const TENSE_LABEL = Object.fromEntries(TENSES.map(t => [t.id, t.label]));

  const PRONOUNS = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'];
  const SLOT = { je: 0, tu: 1, il: 2, elle: 2, on: 2, nous: 3, vous: 4, ils: 5, elles: 5 };
  const SLOT_PRONOUN = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];
  const SLOT_LABEL = ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'];
  const REFL = ['me', 'te', 'se', 'nous', 'vous', 'se'];

  const END = {
    er: ['e', 'es', 'e', 'ons', 'ez', 'ent'],
    ir2: ['is', 'is', 'it', 'issons', 'issez', 'issent'],
    re: ['s', 's', '', 'ons', 'ez', 'ent'],
    imp: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
    fut: ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
    subj: ['e', 'es', 'e', 'ions', 'iez', 'ent'],
    ps_a: ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'],
    ps_i: ['is', 'is', 'it', 'îmes', 'îtes', 'irent'],
    ps_u: ['us', 'us', 'ut', 'ûmes', 'ûtes', 'urent'],
    ps_in: ['ins', 'ins', 'int', 'înmes', 'întes', 'inrent'],
  };
  const STRONG = [0, 1, 2, 5]; // slots that take a stem change in -er verbs

  // manger → mangeons, commencer → commençons
  function soft(stem, ending) {
    if (/^[aoâ]/.test(ending)) {
      if (stem.endsWith('g')) return stem + 'e' + ending;
      if (stem.endsWith('c')) return stem.slice(0, -1) + 'ç' + ending;
    }
    return stem + ending;
  }

  /* ---------- Verb data (generated from the CSV) ---------- */
  const VOWEL = /^[aeiouyhàâäéèêëîïôöùûü]/i;
  // Verbs with an "h aspiré": no elision (je hais, il se hâte)
  const H_ASPIRE = new Set(('haïr hacher hachurer haler hâler haleter hanter handicaper happer haranguer harasser harceler ' +
    'harnacher harponner hasarder hâter hausser héler hennir hérisser heurter hisser hocher honnir hoqueter houer houspiller ' +
    'huer hululer hurler').split(' '));
  const elides = (word, v) => VOWEL.test(word) && !(/^h/i.test(word) && v && H_ASPIRE.has(v.inf));
  const ORDER = ['present', 'imparfait', 'futur', 'cond', 'subj', 'ps'];
  const DIG = '0123456789abcdefghijklmnopqrstuvwxyz';
  const D = root.VERB_DATA || { T: [], V: '', C: [] };
  const TPL = D.T.map(t => t.split(','));
  const dec = (code, inf) => (code ? code.split('/').map(c => inf.slice(0, inf.length - DIG.indexOf(c[0])) + c.slice(1)) : []);
  const vid = (inf, refl) => (refl ? (elides(inf, { inf }) ? "s'" + inf : 'se ' + inf) : inf);
  const sortKey = s => s.replace(/^(se |s')/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const VERBS = D.V.split('\n').filter(Boolean).map(line => {
    const [inf, t, flags, en] = line.split('\t');
    const refl = flags.includes('r');
    return { inf, id: vid(inf, refl), tpl: +t, group: +flags[0], aux: flags[1], refl, st: flags.includes('s'), enF: en.split('|'), impFlag: flags.includes('i') };
  }).sort((a, b) => sortKey(a.id).localeCompare(sortKey(b.id), 'fr') || a.refl - b.refl);
  const BY_ID = Object.fromEntries(VERBS.map(v => [v.id, v]));
  const AVOIR = BY_ID['avoir'], ETRE = BY_ID['être'];
  const COMMON = new Set(D.C);
  VERBS.forEach(v => { v.common = COMMON.has(v.id); v.type = v.group === 1 ? 'er' : v.group === 2 ? 'ir2' : 'irr'; });

  // Decode a verb's simple tenses on first use: S[tense][slot] = [canonical, ...alternatives]
  function forms(v) {
    if (v.S) return v.S;
    const T = TPL[v.tpl], S = {};
    v.ppA = dec(T[0], v.inf);
    ORDER.forEach((t, ti) => { S[t] = []; for (let s = 0; s < 6; s++) S[t].push(dec(T[1 + ti * 6 + s], v.inf)); });
    v.S = S;
    // impersonal verbs (falloir, neiger…): only "il" exists
    v.impersonal = v.impFlag || [0, 1, 3, 4, 5].every(sl => ORDER.every(t => !S[t][sl].length));
    return S;
  }

  // Regular conjugation by pattern — used only to build "wrong group" distractors
  function build(d) {
    const inf = d.inf, S = {};
    let pp;
    if (d.type === 'er') {
      const b = inf.slice(0, -2);
      S.present = END.er.map(e => soft(b, e));
      S.imparfait = END.imp.map(e => soft(b, e));
      S.futur = END.fut.map(e => inf + e);
      S.cond = END.imp.map(e => inf + e);
      S.subj = END.subj.map(e => b + e);
      S.ps = END.ps_a.map(e => soft(b, e));
      pp = b + 'é';
    } else if (d.type === 'ir2') {
      const b = inf.slice(0, -2);
      S.present = END.ir2.map(e => b + e);
      S.imparfait = END.imp.map(e => b + 'iss' + e);
      S.futur = END.fut.map(e => inf + e);
      S.cond = END.imp.map(e => inf + e);
      S.subj = END.subj.map(e => b + 'iss' + e);
      S.ps = END.ps_i.map(e => b + e);
      pp = b + 'i';
    } else {
      const b = inf.slice(0, -2), fs = inf.slice(0, -1);
      S.present = END.re.map(e => b + e);
      S.imparfait = END.imp.map(e => b + e);
      S.futur = END.fut.map(e => fs + e);
      S.cond = END.imp.map(e => fs + e);
      S.subj = END.subj.map(e => b + e);
      S.ps = END.ps_i.map(e => b + e);
      pp = b + 'u';
    }
    for (const t in S) S[t] = S[t].map(f => [f]);
    return { inf, id: '~' + inf, refl: d.refl, aux: d.aux, S, ppA: [pp] };
  }

  const AUX_TENSE = { pc: 'present', pqp: 'imparfait', fa: 'futur', cp: 'cond' };
  const AGREE = {
    je: ['', 'e'], tu: ['', 'e'], il: [''], elle: ['e'], on: ['', 'e', 's', 'es'],
    nous: ['s', 'es'], vous: ['s', 'es', '', 'e'], ils: ['s'], elles: ['es'],
  };

  // The conjugated verb (without subject / reflexive pronoun), or null if the form doesn't exist
  function verbPart(v, tense, pronoun) {
    const S = forms(v), s = SLOT[pronoun];
    if (v.impersonal && pronoun !== 'il') return null;
    if (!AUX_TENSE[tense]) {
      const a = S[tense][s];
      return a.length ? { canon: a[0], alts: a } : null;
    }
    if (!v.ppA.length) return null;
    if (!ORDER.some(t => S[t][s].length)) return null; // impersonal verbs: only the persons that exist
    const auxes = v.aux === 'a' ? ['a'] : v.aux === 'e' ? ['e'] : ['e', 'a'];
    const alts = [];
    for (const x of auxes) {
      const af = forms(x === 'e' ? ETRE : AVOIR)[AUX_TENSE[tense]][s][0];
      for (const pp of v.ppA) {
        if (x === 'e') AGREE[pronoun].forEach(ag => alts.push(af + ' ' + pp + (pp.endsWith('s') && ag === 's' ? '' : ag)));
        else alts.push(af + ' ' + pp);
      }
    }
    const uniq = [...new Set(alts)];
    return { canon: uniq[0], alts: uniq };
  }

  const join = (a, b) => (a.endsWith("'") ? a + b : a + ' ' + b);

  // Subject (+ reflexive) pronoun with elision, given the verb part that follows
  function assemble(pronoun, v, vp) {
    let refl = v.refl ? REFL[SLOT[pronoun]] : null;
    if (refl && /^[mts]e$/.test(refl) && elides(vp, v)) refl = refl[0] + "'";
    let subj = pronoun;
    if (subj === 'je' && elides(refl || vp, v)) subj = "j'";
    const prefix = refl ? join(subj, refl) : subj;
    return { prefix, blank: vp, full: join(prefix, vp) };
  }

  function answer(v, tense, pronoun) {
    const p = verbPart(v, tense, pronoun);
    if (!p) return null;
    const main = assemble(pronoun, v, p.canon);
    return {
      prefix: main.prefix, blank: p.canon, full: main.full,
      acceptBlank: p.alts, acceptFull: p.alts.map(x => assemble(pronoun, v, x).full),
    };
  }

  const nFormsCache = {};
  function nForms(v) {
    if (nFormsCache[v.id] == null) {
      let n = 0;
      TENSES.forEach(t => SLOT_PRONOUN.forEach(p => { if (verbPart(v, t.id, p)) n++; }));
      nFormsCache[v.id] = n;
    }
    return nFormsCache[v.id];
  }

  /* ---------- English prompt ---------- */
  const EN_SUBJ = { je: 'I', tu: 'you (sing.)', il: 'he', elle: 'she', on: 'one', nous: 'we', vous: 'you (pl.)', ils: 'they (m.)', elles: 'they (f.)' };
  const EN_SELF = { je: ['myself', 'my'], tu: ['yourself', 'your'], il: ['himself', 'his'], elle: ['herself', 'her'], on: ['oneself', "one's"],
    nous: ['ourselves', 'our'], vous: ['yourselves', 'your'], ils: ['themselves', 'their'], elles: ['themselves', 'their'] };
  function english(v, tense, pronoun) {
    const [base, s3, past, pp, ing] = v.enF;
    const third = pronoun === 'il' || pronoun === 'elle' || pronoun === 'on';
    const wasP = pronoun === 'je' || third;
    const head = base.split(' ')[0], rest = base.slice(head.length);
    const be = head === 'be';
    const pres = be ? (pronoun === 'je' ? 'am' : third ? 'is' : 'are') + rest : (third ? s3 : base);
    const pst = be ? (wasP ? 'was' : 'were') + rest : past;
    const ppF = be ? 'been' + rest : pp;
    const ingF = be ? 'being' + rest : ing;
    let vp;
    switch (tense) {
      case 'present': vp = pres; break;
      case 'pc': case 'ps': vp = pst; break;
      case 'imparfait': vp = v.st ? pst : (wasP ? 'was ' : 'were ') + ingF; break;
      case 'futur': vp = 'will ' + base; break;
      case 'cond': vp = 'would ' + base; break;
      case 'pqp': vp = 'had ' + ppF; break;
      case 'fa': vp = 'will have ' + ppF; break;
      case 'cp': vp = 'would have ' + ppF; break;
      case 'subj': vp = base; break;
    }
    vp = vp.replace(/\boneself\b/g, EN_SELF[pronoun][0]).replace(/\bone's\b/g, EN_SELF[pronoun][1]);
    const end = / to$/.test(vp) ? '…' : '.';
    const subj = EN_SUBJ[pronoun];
    if (tense === 'subj') return '…that ' + subj + ' ' + vp + end;
    const s = subj + ' ' + vp;
    return s.charAt(0).toUpperCase() + s.slice(1) + end;
  }
  const englishGloss = v => 'to ' + v.enF[0];

  /* ---------- Answer checking ---------- */
  function norm(s) {
    return (s || '').normalize('NFC').toLowerCase()
      .replace(/[’‘`´ʼ]/g, "'").replace(/\s*'\s*/g, "'")
      .replace(/[.!?…]+$/, '').replace(/\s+/g, ' ').trim();
  }
  function strip(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC'); }

  // returns 'correct' | 'accent' | 'wrong'
  function check(input, ans, form) {
    const n = norm(input);
    if (!n) return 'empty';
    const acc = (form === 'fr' ? ans.acceptBlank.concat(ans.acceptFull) : ans.acceptFull).map(norm);
    if (acc.includes(n)) return 'correct';
    const ns = strip(n);
    if (acc.some(a => strip(a) === ns)) return 'accent';
    return 'wrong';
  }

  /* ---------- Multiple-choice distractors ---------- */
  const CONFUSE = {
    present: ['subj', 'ps', 'imparfait'], pc: ['pqp', 'ps', 'fa'], imparfait: ['cond', 'present', 'ps'],
    futur: ['cond', 'present'], cond: ['futur', 'imparfait'], pqp: ['pc', 'cp'], fa: ['cp', 'futur'],
    subj: ['present', 'imparfait'], cp: ['fa', 'pqp'], ps: ['imparfait', 'pc', 'present'],
  };
  const PATTERN_SUFFIX = { er: 'er', ir2: 'ir', re: 're' };
  const fakeCache = {};
  function fakeVerb(v, pattern) {
    const k = v.id + '>' + pattern;
    if (!fakeCache[k]) {
      const root = v.inf.replace(/(oir|er|ir|re)$/, '');
      fakeCache[k] = build({ inf: root + PATTERN_SUFFIX[pattern], type: pattern, aux: v.aux, refl: v.refl });
    }
    return fakeCache[k];
  }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function distractors(v, tense, pronoun) {
    const s = SLOT[pronoun];
    const p = verbPart(v, tense, pronoun);
    if (!p) return [];
    const c = p.canon;
    const vp = (vv, t, pr) => { const r = verbPart(vv, t, pr); return r ? r.canon : null; };
    const bad = new Set(p.alts.map(norm));
    const K = { accent: [], double: [], tense: [], group: [], person: [] };
    // 1. missing accent
    [...c].forEach((ch, i) => { if (/[éèêëàâîïôûùç]/.test(ch)) K.accent.push(c.slice(0, i) + strip(ch) + c.slice(i + 1)); });
    // 2. doubled ↔ single consonant
    c.replace(/([bcdfglmnprst])\1/g, (m, ch, i) => { K.double.push(c.slice(0, i) + ch + c.slice(i + 2)); return m; });
    if (!K.double.length) {
      for (let i = 1; i < c.length - 1; i++) {
        if (/[lnmtrs]/.test(c[i]) && /[aeiouéèê]/.test(c[i - 1]) && /[aeiouéèê]/.test(c[i + 1])) K.double.push(c.slice(0, i) + c[i] + c.slice(i));
      }
    }
    // 3. another tense, same person
    CONFUSE[tense].forEach(t => K.tense.push(vp(v, t, pronoun)));
    // 4. another group's regular pattern
    ['er', 'ir2', 're'].filter(t => t !== v.type).forEach(pt => K.group.push(vp(fakeVerb(v, pt), tense, pronoun)));
    // 5. wrong person
    [0, 1, 2, 3, 4, 5].filter(x => x !== s).forEach(x => K.person.push(vp(v, tense, SLOT_PRONOUN[x])));

    const out = [], seen = new Set(bad);
    const take = x => { const n = norm(x); if (!x || seen.has(n)) return false; seen.add(n); out.push(x); return true; };
    const kinds = shuffle(Object.keys(K));
    kinds.forEach(k => shuffle(K[k]));
    for (const k of kinds) { if (out.length >= 3) break; for (const x of K[k]) if (take(x)) break; }
    const rest = shuffle([].concat(...Object.values(K)));
    for (const x of rest) { if (out.length >= 3) break; take(x); }
    // last resort: other tenses
    for (const t of shuffle(TENSES.map(t => t.id))) { if (out.length >= 3) break; take(vp(v, t, pronoun)); }
    // defective verbs: invent plausible wrong endings
    for (const e of shuffle(['ons', 'ez', 'ent', 'ait', 'ra', 'it', 'ut', 'e', 's'])) { if (out.length >= 3) break; take(c.replace(/\w{1,3}$/, '') + e); }
    return out.slice(0, 3);
  }

  /* ---------- Form keys ---------- */
  const formKey = (verbId, tense, slot) => verbId + '|' + tense + '|' + slot;
  function parseKey(k) { const [id, tense, slot] = k.split('|'); return { id, tense, slot: +slot, verb: BY_ID[id] }; }
  function formLabel(k) {
    const { verb, tense, slot } = parseKey(k);
    if (!verb) return k;
    const pr = SLOT_PRONOUN[slot];
    const p = verbPart(verb, tense, pr);
    if (!p) return k;
    let full = assemble(pr, verb, p.canon).full;
    if (slot === 2) full = full.replace(/^il/, 'il/elle/on');
    if (slot === 5) full = full.replace(/^ils/, 'ils/elles');
    return full;
  }

  const API = {
    TENSES, TENSE_LABEL, PRONOUNS, SLOT, SLOT_PRONOUN, SLOT_LABEL,
    VERBS, BY_ID, COMMON, nForms, englishGloss, sortKey, verbPart, assemble, answer, english, check, norm, strip, distractors,
    formKey, parseKey, formLabel, shuffle,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Verbs = API;
})(typeof window !== 'undefined' ? window : this);

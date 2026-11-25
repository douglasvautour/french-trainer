/* Apprenez le français ! — sentences with object, reflexive, y and en pronouns */
(function (root) {
  'use strict';
  const V = root.Verbs;
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* Persons: 0 je, 1 tu, 2 il/elle/on, 3 nous, 4 vous, 5 ils/elles */
  const REFL = ['me', 'te', 'se', 'nous', 'vous', 'se'];
  const NEAR = ['me', 'te', 'nous', 'vous'];
  const PERSON_OF = { me: 0, te: 1, nous: 3, vous: 4 };
  const EN_NEAR = { me: 'me', te: 'you (sing.)', nous: 'us', vous: 'you (pl.)' };
  const AUX_TENSE = { pc: 'present', pqp: 'imparfait', fa: 'futur', cp: 'cond' };

  /* Which pronoun types (Settings checkboxes) each pattern uses */
  const CATS = { S: [], do: ['do'], io: ['io'], y: ['y'], en: ['en'], R: ['refl'] };
  const catsOf = type => [...new Set(type.split('+').flatMap(t => CATS[t] || []))];

  /* "S;do:t;do+io=({o} to {i})>give|gives|gave|given|giving" -> [{type, kind, tail, enForms}] */
  const cache = {};
  function parse(str) {
    if (cache[str]) return cache[str];
    const out = (str || '').split(';').filter(Boolean).map(p => {
      const [head, rest] = p.split(/=(.*)/s);
      const [type, kind] = head.split(':');
      let tail = rest || '', enForms = null;
      const gt = tail.indexOf('>');
      if (gt >= 0) { enForms = tail.slice(gt + 1); tail = tail.slice(0, gt); }
      tail = tail.replace(/^\((.*)\)$/, '$1');
      if (!rest) tail = { do: '{o}', io: 'to {i}', 'do+io': '{o} to {i}', S: '', R: '' }[type] || '';
      return { type, kind: kind || (type.includes('do') ? 't' : ''), tail, enForms, cats: catsOf(type) };
    });
    cache[str] = out;
    return out;
  }

  /* Choose the object pronouns for a pattern and subject */
  function makeSpec(pat, pronoun, imp) {
    const subj = V.SLOT[pronoun];
    const t = pat.type.split('+');
    const spec = {};
    // not the subject itself ("je me vois" is reflexive) nor a group that includes it ("je nous…");
    // "let's…" already includes the listener, so not "you" either ("accompagnons-toi")
    const OVERLAP = { 0: [0, 3], 1: [1, 4], 3: imp ? [3, 0, 1, 4] : [3, 0], 4: [4, 1] };
    const notSubject = p => !(p in PERSON_OF) || !(OVERLAP[subj] || []).includes(PERSON_OF[p]);
    if (t.includes('R')) spec.refl = true;
    if (t.includes('y')) spec.y = true;
    if (t.includes('en')) spec.en = true;
    if (t.includes('do')) {
      const third = t.length > 1 && !t.includes('y'); // combined with io/R/en: le, la, les only
      let kind = pat.kind === 'tp' ? pick(['t', 'p']) : pat.kind;
      if (kind === 'p' && !third) {
        const opts = ['me', 'te', 'le', 'la', 'nous', 'vous', 'les'].filter(notSubject);
        const p = pick(opts);
        spec.do = { p, g: p === 'la' ? 'f' : p === 'les' ? pick(['m', 'f']) : pick(['m', 'f']), h: true };
        if (p === 'le') spec.do.g = 'm';
      } else {
        const p = pick(['le', 'la', 'les']);
        spec.do = { p, g: p === 'la' ? 'f' : p === 'le' ? 'm' : pick(['m', 'f']), h: kind === 'p' };
      }
    }
    if (t.includes('io')) {
      const opts = ['me', 'te', 'lui', 'nous', 'vous', 'leur'].filter(notSubject);
      const p = pick(opts);
      spec.io = { p, g: pick(['m', 'f']) };
    }
    return spec;
  }

  const VOWEL = /^[aeiouyhàâäéèêëîïôöùûü]/i;
  const elides = (word, v) => VOWEL.test(word) && !(/^h/i.test(word) && v && V.isHAspire(v));

  function cliticsOf(spec, pronoun) {
    const slot = V.SLOT[pronoun];
    const c1 = spec.refl ? REFL[slot]
      : spec.do && NEAR.includes(spec.do.p) ? spec.do.p
        : spec.io && NEAR.includes(spec.io.p) ? spec.io.p : null;
    const c2 = spec.do && ['le', 'la', 'les'].includes(spec.do.p) ? spec.do.p : null;
    const c3 = spec.io && ['lui', 'leur'].includes(spec.io.p) ? spec.io.p : null;
    return [c1, c2, c3, spec.y ? 'y' : null, spec.en ? 'en' : null].filter(Boolean);
  }

  /* subject + clitics with elision, given what follows ("je l'", "nous les lui") */
  function prefixFor(pronoun, clitics, vp, v) {
    const words = [pronoun].concat(clitics);
    const out = [];
    let next = vp;
    for (let i = words.length - 1; i >= 0; i--) {
      let w = words[i];
      if (/^(je|me|te|se|le|la)$/.test(w) && elides(next, v)) w = w[0] + "'";
      out.unshift(w);
      next = w;
    }
    let s = '';
    out.forEach(w => { s += (s && !s.endsWith("'") ? ' ' : '') + w; });
    return s;
  }
  const joinPV = (prefix, vp) => prefix + (prefix.endsWith("'") ? '' : ' ') + vp;

  function doAgreement(d) {
    if (d.p === 'le') return [''];
    if (d.p === 'la') return ['e'];
    if (d.p === 'les') return [d.g === 'f' ? 'es' : 's'];
    if (d.p === 'me' || d.p === 'te') return d.g === 'f' ? ['e', ''] : ['', 'e'];
    if (d.p === 'nous') return d.g === 'f' ? ['es', 's'] : ['s', 'es'];
    return d.g === 'f' ? ['es', 's', 'e', ''] : ['s', 'es', '', 'e']; // vous
  }
  const SUBJ_AGREE = { je: ['', 'e'], tu: ['', 'e'], il: [''], elle: ['e'], on: ['', 'e', 's', 'es'], nous: ['s', 'es'], vous: ['s', 'es', '', 'e'], ils: ['s'], elles: ['es'] };

  /* The verb part, with past-participle agreement: [canonical, ...accepted] */
  function verbForms(v, tense, pronoun, spec) {
    const p = V.verbPart(v, tense, pronoun);
    if (!p) return null;
    if (!AUX_TENSE[tense]) return { forms: p.alts, plain: p.canon };
    const useAvoir = !spec.refl && (v.aux === 'a' || (v.aux === 'E' && spec.do));
    const aux = V.verbPart(V.BY_ID[useAvoir ? 'avoir' : 'être'], AUX_TENSE[tense], pronoun).canon;
    const pp = v.ppA[0];
    let agree;
    if (useAvoir || (spec.refl && v.seIndirect)) agree = spec.do ? doAgreement(spec.do) : [''];
    else if (spec.refl && spec.do) agree = doAgreement(spec.do);
    else agree = SUBJ_AGREE[pronoun];
    const agreePP = e => (!e ? pp : pp.endsWith('û') ? pp.slice(0, -1) + 'u' + e : pp.endsWith('s') && e === 's' ? pp : pp + e); // dû -> due
    const forms = [...new Set(agree.map(e => aux + ' ' + agreePP(e)))];
    return { forms, plain: aux + ' ' + pp, aux, pp };
  }

  /* English prompt */
  const EN_IO = { lui: g => (g === 'f' ? 'her' : 'him'), leur: () => 'them' };
  function enObject(d) {
    if (NEAR.includes(d.p)) return EN_NEAR[d.p];
    if (d.h) return d.p === 'le' ? 'him' : d.p === 'la' ? 'her' : `them (${d.g}.)`;
    return d.p === 'les' ? `them (${d.g}.)` : `it (${d.g}.)`;
  }
  function enIndirect(i) { return NEAR.includes(i.p) ? EN_NEAR[i.p] : EN_IO[i.p](i.g); }
  function fillTail(tail, spec) {
    return tail.replace('{o}', spec.do ? enObject(spec.do) : '').replace('{i}', spec.io ? enIndirect(spec.io) : '');
  }
  /* Subtitle cues: one entry per pronoun, labelled by type, e.g. [{t:'direct', en:'it (m.)'}, {t:'indirect', en:'to him'}] */
  const PREP = '(?:(to|for|from|at|with|of|about|on|in|by)\\s+)?';
  function cuesOf(pat, spec) {
    const out = [];
    let rest = pat.tail;
    if (spec.refl) out.push({ t: 'reflexive', en: '' });
    if (spec.do) {
      const m = rest.match(new RegExp(PREP + '\\{o\\}(\\s+(?:up|down|out|off|away|back|over|on|again))?'));
      out.push({ t: 'direct', en: (m && m[1] ? m[1] + ' ' : '') + enObject(spec.do) });
      if (m) rest = rest.replace(m[0], ' ');
    }
    if (spec.io) {
      const m = rest.match(new RegExp('(?:back\\s+)?' + PREP + '\\{i\\}'));
      out.push({ t: 'indirect', en: (m && m[1] ? m[1] + ' ' : '') + enIndirect(spec.io) });
      if (m) rest = rest.replace(m[0], ' ');
    }
    if (spec.y || spec.en) {
      const left = rest.replace(/\{[oi]\}/g, ' ').replace(/\s+/g, ' ').trim();
      out.push({ t: 'adverbial', en: left });
    }
    return out;
  }
  const PARTICLE = / (up|down|out|off|away|back|over|together|apart|again)$/;
  function english(v, tense, pronoun, spec, pat) {
    // '!' at the start of an override marks a stative verb ("was called", not "was being called")
    let vv = pat.enForms ? Object.assign({}, v, { enF: pat.enForms.replace(/^!/, '').split('|'), st: pat.enForms.startsWith('!') }) : v;
    let t = pat.tail;
    // phrasal verbs take the object before the particle: "earth it up", not "earth up it"
    const m = t === '{o}' && vv.enF[0].match(PARTICLE);
    if (m) {
      vv = Object.assign({}, vv, { enF: vv.enF.map(x => x.replace(new RegExp(' ' + m[1] + '$'), '')) });
      t = '{o} ' + m[1];
    }
    const s = V.english(vv, tense, pronoun);
    const tail = fillTail(t, spec);
    if (!tail) return s;
    const m2 = s.match(/^(.*?)([.…!])( \((?:sing|pl)\.\))?$/);
    const punct = m2[2] === '…' ? '.' : m2[2];
    return m2[1] + ' ' + tail + punct + (m2[3] || '');
  }

  /* ---------- Imperative: pronouns follow the verb (donne-le-moi, vas-y, lève-toi) ---------- */
  const IMP_REFL = { tu: 'toi', nous: 'nous', vous: 'vous' };
  // verbs whose imperative isn't used for ordinary commands
  const IMP_SKIP = new Set(['avoir', 'vouloir', 'pouvoir', 'devoir', 'valoir', 'falloir', 'sembler', 'paraître', 'naître', 'mourir', 'pleuvoir', 'neiger',
    'geler', 'savoir', 'être', 'devenir', "s'appeler", 'se sentir', 'appartenir', 'apparaître', 'ressembler', 'plaire', 'demeurer', 'assister', 'se trouver',
    // things you don't tell someone to do ("Fail!", "Be bored!", "Deserve it!")
    'arriver', 'échouer', 'se blesser', "s'ennuyer", "s'évanouir", 'ignorer', 'se tromper', 'se perdre', 'divorcer', 'glisser', 'vieillir',
    'rougir', 'trembler', 'souffrir', 'connaître', 'posséder', 'mériter', 'prévoir', 'désirer', 'douter', 'tomber', 'espérer', 'souhaiter',
    'craindre', 'intéresser', 'attirer', 'fâcher', 'ennuyer', 'manquer', 'rater', 'recevoir', 'inquiéter', 'briller', 'préférer', 'détester',
    'entendre', 'adorer']);
  // single patterns that don't work as commands ("viens-en")
  const IMP_SKIP_PAT = new Set(['venir:y', 'venir:en', 'revenir:y']);
  const STRONG = { me: 'moi', te: 'toi' };
  function impClitics(spec, pronoun) {
    const out = [];
    if (spec.refl) out.push(IMP_REFL[pronoun]);
    if (spec.do) out.push(spec.do.p);
    if (spec.io) out.push(spec.io.p);
    if (spec.y) out.push('y');
    if (spec.en) out.push('en');
    return out;
  }
  // render the pronouns after the verb: ["le","me"] -> "le-moi", ["me","en"] -> "m'en"
  function impTail(cl, strongForms = true) {
    let str = '';
    cl.forEach((w, i) => {
      const next = cl[i + 1];
      let x = w;
      if ((w === 'me' || w === 'te' || w === 'moi' || w === 'toi') && (next === 'y' || next === 'en')) x = w[0] + "'";
      else if (strongForms && STRONG[w]) x = STRONG[w];
      str += (i === 0 || str.endsWith("'") ? '' : '-') + x;
    });
    return str;
  }
  // tu-forms ending in a vowel take an s before y/en: manges-en, vas-y
  const impVerb = (form, pronoun, cl) => (pronoun === 'tu' && (cl[0] === 'y' || cl[0] === 'en') && /[ea]$/.test(form) ? form + 's' : form);

  function buildImperative(v, pronoun, pat, mode, specIn) {
    if (!['tu', 'nous', 'vous'].includes(pronoun)) return null;
    if (/R\+(y|do)|do\+y/.test(pat.type)) return null; // awkward in the imperative
    if (IMP_SKIP.has(v.id) || IMP_SKIP_PAT.has(v.id + ':' + pat.type)) return null;
    const p = V.verbPart(v, 'imperatif', pronoun);
    if (!p) return null;
    const spec = specIn || makeSpec(pat, pronoun, true);
    const cl = impClitics(spec, pronoun);
    if (mode === 'pron' && !cl.length) return null;
    const tail = impTail(cl);
    const forms = p.alts.map(f => impVerb(f, pronoun, cl));
    const fulls = forms.map(f => f + (tail ? '-' + tail : ''));
    let ans, before = '', after = '';
    if (mode === 'verb') { ans = { blank: forms[0], acceptBlank: forms, acceptFull: fulls, full: fulls[0] }; after = tail ? '-' + tail : ''; }
    else if (mode === 'pron') { ans = { blank: tail, acceptBlank: [tail], acceptFull: fulls, full: fulls[0] }; before = forms[0] + '-'; }
    else ans = { blank: fulls[0], acceptBlank: fulls, acceptFull: fulls, full: fulls[0] };
    return { ans, before, after, english: english(v, 'imperatif', pronoun, spec, pat), cues: cuesOf(pat, spec), spec, pattern: pat, clitics: cl, imp: true,
      vf: { forms }, mode };
  }
  function impWrong(q, pronoun) {
    const c = q.clitics, out = [];
    for (let i = 0; i + 1 < c.length; i++) { const d = c.slice(); [d[i], d[i + 1]] = [d[i + 1], d[i]]; out.push(impTail(d)); }
    c.forEach((w, i) => (SWAP[w] || []).concat(STRONG[w] ? [w] : []).forEach(x => { const d = c.slice(); d[i] = x; out.push(impTail(d, x !== w || !STRONG[w])); }));
    if (c.some(w => STRONG[w])) out.push(impTail(c, false)); // donne-le-me
    ['le', 'lui', 'y', 'en'].forEach(x => { if (!c.includes(x)) out.push(impTail(c.concat([x]))); });
    return out;
  }

  /**
   * Build a question. mode: 'verb' (fill in the verb), 'pron' (fill in subject + pronouns), 'both'.
   * Returns { ans, before, after, english, cues, spec, pattern } or null if the sentence doesn't exist.
   */
  function build(v, tense, pronoun, pat, mode, specIn) {
    if (tense === 'imperatif') return buildImperative(v, pronoun, pat, mode, specIn);
    if (pat.type.includes('y') && v.inf === 'aller' && (tense === 'futur' || tense === 'cond')) return null; // j'irai, not j'y irai
    const spec = specIn || makeSpec(pat, pronoun); // specIn: replaying a missed question
    const vf = verbForms(v, tense, pronoun, spec);
    if (!vf) return null;
    const clitics = cliticsOf(spec, pronoun);
    if (mode === 'pron' && !clitics.length) return null; // nothing to fill in
    const prefix = prefixFor(pronoun, clitics, vf.forms[0], v);
    const fulls = vf.forms.map(f => joinPV(prefixFor(pronoun, clitics, f, v), f));
    const full = fulls[0];
    let ans, before = '', after = '';
    if (mode === 'verb') {
      ans = { blank: vf.forms[0], acceptBlank: vf.forms, acceptFull: fulls, full };
      before = prefix;
    } else if (mode === 'pron') {
      ans = { blank: prefix, acceptBlank: [prefix], acceptFull: fulls, full };
      after = vf.forms[0];
    } else {
      ans = { blank: full, acceptBlank: fulls, acceptFull: fulls, full };
    }
    return { ans, before, after, english: english(v, tense, pronoun, spec, pat), cues: cuesOf(pat, spec), spec, pattern: pat, clitics, vf, mode };
  }


  /* ---------- Modal verbs + infinitive: je peux le faire, il faut y aller, elle veut se reposer ---------- */
  const MODALS = ['pouvoir', 'vouloir', 'devoir', 'savoir', 'falloir'];
  // verbs that need something after them, or don't make sense after a modal
  const NO_INNER = new Set(MODALS.concat(['être', 'devenir', 'sembler', 'paraître', "s'appeler", 'se sentir', 'naître', 'désirer', 'posséder', 'ignorer']));
  // things you don't want, must or need to do on purpose ("je veux tomber")
  const NON_VOL = new Set(['mourir', 'échouer', 'se blesser', "s'évanouir", 'se tromper', 'ignorer', 'rougir', 'tomber', 'glisser',
    'vieillir', 'souffrir', "s'ennuyer", 'trembler', 'apparaître', 'appartenir', 'ressembler', 'grandir', 'maigrir', 'disparaître',
    'se perdre', 'perdre', 'oublier', 'rater', 'manquer', 'craindre', 'fâcher', 'se fâcher', 'ennuyer', 'inquiéter', "s'inquiéter",
    'douter', 'regretter', 'mériter', 'tousser', 'pleurer', 'geler', 'fondre', 'apercevoir', 'prévoir', 'détester', 'adorer', 'préférer',
    'connaître', 'remarquer', 'surprendre', 'étonner', 'intéresser', 'plaire', 'hésiter']);
  // savoir + infinitive = know how to: skills only
  const SKILLS = new Set(['nager', 'conduire', 'cuisiner', 'lire', 'écrire', 'danser', 'chanter', 'skier', 'patiner', 'coudre', 'dessiner',
    'peindre', 'compter', 'jouer', 'parler', 'cuire', 'plonger', 'siffler', 'réparer', 'faire', 'utiliser', 'construire', 'prononcer',
    'traduire', 'nettoyer', 'repasser', 'grimper', 'courir', 'lancer', 'attraper']);
  const isModal = id => MODALS.includes(id);
  // can this modal go with this infinitive (and pattern)?
  function modalOk(modalId, v, pat, pronoun) {
    if (NO_INNER.has(v.id)) return false;
    V.forms(v); if (v.impersonal) return false;
    if (modalId === 'falloir' && (pronoun !== 'il' || v.id === 'avoir')) return false;
    if (modalId !== 'pouvoir' && NON_VOL.has(v.id)) return false;
    if (modalId === 'savoir' && (!SKILLS.has(v.id) || !['S', 'do'].includes(pat.type))) return false;
    if (pat.type === 'S' && (/…$/.test(pat.enForms || '') || / to$/.test(v.enF[0]) && !pat.enForms)) return false; // "able to…"
    return true;
  }

  // English: "can", "had to", "would like to"… + the infinitive phrase. P = perfect infinitive phrase ("done it")
  const MODAL_EN = {
    pouvoir: { present: 'can V', imparfait: 'could V', pc: 'WAS able to V', ps: 'WAS able to V', futur: 'will be able to V', cond: 'could V',
      pqp: 'had been able to V', fa: 'will have been able to V', cp: 'could have P', subj: 'can V' },
    devoir: { present: 'HAVE to V', imparfait: 'had to V', pc: 'had to V', ps: 'had to V', futur: 'will have to V', cond: 'should V',
      pqp: 'had had to V', fa: 'will have had to V', cp: 'should have P', subj: 'HAVE to V' },
    vouloir: { present: 'WANT to V', imparfait: 'wanted to V', pc: 'wanted to V', ps: 'wanted to V', futur: 'will want to V', cond: 'would like to V',
      pqp: 'had wanted to V', fa: 'will have wanted to V', cp: 'would have liked to V', subj: 'WANT to V' },
    savoir: { present: 'KNOW how to V', imparfait: 'knew how to V', pc: 'knew how to V', ps: 'knew how to V', futur: 'will know how to V',
      cond: 'would know how to V', pqp: 'had known how to V', fa: 'will have known how to V', cp: 'would have known how to V', subj: 'KNOW how to V' },
    falloir: { present: 'is necessary to V', imparfait: 'was necessary to V', pc: 'was necessary to V', ps: 'was necessary to V',
      futur: 'will be necessary to V', cond: 'would be necessary to V', pqp: 'had been necessary to V', fa: 'will have been necessary to V',
      cp: 'would have been necessary to V', subj: 'be necessary to V' },
  };
  const EN_SUBJ = { je: 'I', tu: 'you (sing.)', il: 'he', elle: 'she', on: 'one', nous: 'we', vous: 'you (pl.)', ils: 'they (m.)', elles: 'they (f.)' };
  const capF = x => x.charAt(0).toUpperCase() + x.slice(1);
  // the infinitive's English with its objects: "give it (m.) to him"; perfect: "given it (m.) to him"
  function innerEnglish(v, pat, spec, pronoun, perfect) {
    const subj = EN_SUBJ[pronoun];
    const s = english(v, perfect ? 'pqp' : 'subj', pronoun, spec, pat).replace(/[.!…]$/, '');
    return perfect ? s.slice((capF(subj) + ' had ').length) : s.slice(('…that ' + subj + ' ').length);
  }
  function modalEnglish(m, v, tense, pronoun, spec, pat) {
    const fal = m.id === 'falloir';
    const ep = fal ? 'on' : pronoun; // il faut se lever: "to get (oneself) up"
    const third = ['il', 'elle', 'on'].includes(pronoun), wasP = pronoun === 'je' || third;
    const subj = fal ? 'it' : EN_SUBJ[pronoun];
    const tpl = MODAL_EN[m.id][tense];
    const phrase = tpl.replace('WAS', wasP ? 'was' : 'were').replace('HAVE', third ? 'has' : 'have')
      .replace('WANT', third ? 'wants' : 'want').replace('KNOW', third ? 'knows' : 'know')
      .replace(/\bV$/, innerEnglish(v, pat, spec, ep, false)).replace(/\bP$/, innerEnglish(v, pat, spec, ep, true));
    return tense === 'subj' ? '…that ' + subj + ' ' + phrase + '.' : capF(subj) + ' ' + phrase + '.';
  }
  // pronouns in front of the infinitive, with elision: "le lui", "l'", "m'en"
  function clitStr(cl, inf, v) {
    const out = [];
    let next = inf;
    for (let i = cl.length - 1; i >= 0; i--) {
      let w = cl[i];
      if (/^(me|te|se|le|la)$/.test(w) && elides(next, v)) w = w[0] + "'";
      out.unshift(w); next = w;
    }
    let str = '';
    out.forEach(w => { str += (str && !str.endsWith("'") ? ' ' : '') + w; });
    return str;
  }
  const withInf = (cs, inf) => (cs ? joinPV(cs, inf) : inf);

  function buildModal(m, v, tense, pronoun, pat, mode, specIn) {
    if (tense === 'imperatif' || !modalOk(m.id, v, pat, pronoun)) return null;
    const mp = V.verbPart(m, tense, pronoun);
    if (!mp) return null;
    let spec = specIn || makeSpec(pat, pronoun);
    // "il faut me battre": with falloir, people as direct objects sound odd, so use it/them
    for (let k = 0; !specIn && m.id === 'falloir' && spec.do && (NEAR.includes(spec.do.p) || spec.do.h) && k < 12; k++) spec = makeSpec(pat, pronoun);
    if (m.id === 'falloir' && spec.do && (NEAR.includes(spec.do.p) || spec.do.h) && !specIn) return null;
    const cl = cliticsOf(spec, pronoun);
    if (mode === 'pron' && !cl.length) return null;
    const cs = clitStr(cl, v.inf, v), tail = withInf(cs, v.inf);
    const subjOf = f => prefixFor(pronoun, [], f, m);
    const fulls = mp.alts.map(f => joinPV(subjOf(f), f) + ' ' + tail);
    let ans, before = '', after = '';
    if (mode === 'verb') { ans = { blank: mp.canon, acceptBlank: mp.alts, acceptFull: fulls, full: fulls[0] }; before = subjOf(mp.canon); after = tail; }
    else if (mode === 'pron') { ans = { blank: cs, acceptBlank: [cs], acceptFull: fulls, full: fulls[0] }; before = joinPV(subjOf(mp.canon), mp.canon); after = v.inf; }
    else ans = { blank: fulls[0], acceptBlank: fulls, acceptFull: fulls, full: fulls[0] };
    return { ans, before, after, english: modalEnglish(m, v, tense, pronoun, spec, pat), cues: cuesOf(pat, spec), spec, pattern: pat,
      clitics: cl, vf: { forms: mp.alts }, mode, modal: m.id, inner: v.id, cs };
  }
  function modalOptions(q, m, v, tense, pronoun) {
    const cl = q.clitics, mf = q.vf.forms[0], subj = prefixFor(pronoun, [], mf, m);
    const wrongCl = [];
    for (let i = 0; i + 1 < cl.length; i++) { const d = cl.slice(); [d[i], d[i + 1]] = [d[i + 1], d[i]]; wrongCl.push(clitStr(d, v.inf, v)); }
    cl.forEach((w, i) => (SWAP[w] || []).forEach(x => { const d = cl.slice(); d[i] = x; wrongCl.push(clitStr(d, v.inf, v)); }));
    if (q.cs.includes("'")) wrongCl.push(cl.join(' '));
    ['le', 'lui', 'y', 'en'].forEach(x => { if (!cl.includes(x)) wrongCl.push(clitStr(cl.concat([x]), v.inf, v)); });
    const wrongM = V.distractors(m, tense, pronoun);
    let cands;
    if (q.mode === 'verb') cands = V.shuffle(wrongM.slice());
    else if (q.mode === 'pron') cands = V.shuffle(wrongCl);
    else {
      const tail = withInf(q.cs, v.inf);
      cands = [];
      // the classic mistake: the pronouns in front of the modal ("je le peux faire")
      if (cl.length && !AUX_TENSE[tense]) cands.push(joinPV(prefixFor(pronoun, cl, mf, m), mf) + ' ' + v.inf);
      cands = cands.concat(V.shuffle(wrongCl.map(c => joinPV(subj, mf) + ' ' + withInf(c, v.inf)).concat(wrongM.map(w => joinPV(prefixFor(pronoun, [], w, m), w) + ' ' + tail))));
    }
    const ok = new Set(q.ans.acceptBlank.map(norm));
    const out = [], seen = new Set(ok);
    for (const x of cands) { const n = norm(x); if (!x || seen.has(n)) continue; seen.add(n); out.push(x); if (out.length === 3) break; }
    return out;
  }

  /* ---------- Multiple-choice wrong answers ---------- */
  const norm = s => V.norm(s);
  const SWAP = { le: ['la', 'les', 'lui'], la: ['le', 'les', 'lui'], les: ['leur', 'le', 'la'], lui: ['le', 'leur', 'la'], leur: ['les', 'lui'],
    me: ['moi', 'te'], te: ['toi', 'me'], nous: ['vous'], vous: ['nous'], y: ['en'], en: ['y'], se: ['me', 'le'] };

  function wrongPrefixes(q, v, pronoun) {
    const c = q.clitics, vp = q.vf.forms[0], out = [];
    // wrong order
    for (let i = 0; i + 1 < c.length; i++) {
      const d = c.slice(); [d[i], d[i + 1]] = [d[i + 1], d[i]];
      out.push(prefixFor(pronoun, d, vp, v));
    }
    // wrong pronoun
    c.forEach((w, i) => (SWAP[w] || []).forEach(s => { const d = c.slice(); d[i] = s; out.push(prefixFor(pronoun, d, vp, v)); }));
    // missing elision
    const words = [pronoun].concat(c);
    if (q.ans.full.includes("'")) out.push(words.join(' '));
    // dropped pronoun
    if (c.length > 1) out.push(prefixFor(pronoun, c.slice(1), vp, v));
    // an extra pronoun, before or after
    ['le', 'lui', 'y', 'en', 'la', 'leur'].forEach(x => {
      if (c.includes(x)) return;
      out.push(prefixFor(pronoun, c.concat([x]), vp, v));
      out.push(prefixFor(pronoun, [x].concat(c), vp, v));
    });
    return out;
  }
  function wrongVerbs(q, v, tense, pronoun) {
    const out = V.distractors(v, tense, pronoun).slice();
    if (q.vf.pp) {
      // agreement mistakes
      ['', 'e', 's', 'es'].forEach(e => out.push(q.vf.aux + ' ' + q.vf.pp + (q.vf.pp.endsWith('s') && e === 's' ? '' : e)));
      if (q.vf.pp.endsWith('û')) out.push(q.vf.aux + ' ' + q.vf.pp + 'e');
      const avoirAux = V.verbPart(V.BY_ID['avoir'], AUX_TENSE[tense], pronoun).canon;
      const other = V.verbPart(V.BY_ID[q.vf.aux === avoirAux ? 'être' : 'avoir'], AUX_TENSE[tense], pronoun);
      if (other) out.push(other.canon + ' ' + q.vf.pp);
    }
    return V.shuffle(out);
  }
  function options(q, v, tense, pronoun) {
    if (q.modal) return modalOptions(q, V.BY_ID[q.modal], V.BY_ID[q.inner], tense, pronoun);
    const ok = new Set(q.ans.acceptBlank.map(norm));
    let cands = [];
    if (q.imp) {
      const vp = q.vf.forms[0], tail = q.ans.full.slice(vp.length);
      const wrongV = V.shuffle(V.distractors(v, tense, pronoun).concat(pronoun === 'tu' ? [vp.replace(/s$/, ''), vp.endsWith('s') ? vp : vp + 's'] : []));
      const wrongT = V.shuffle(impWrong(q, pronoun));
      if (q.mode === 'verb') cands = wrongV;
      else if (q.mode === 'pron') cands = wrongT;
      else cands = V.shuffle(wrongT.map(t => vp + '-' + t).concat(wrongV.map(w => w + tail)).concat(q.clitics.length ? [q.clitics.join(' ') + ' ' + vp] : []));
      const out = [], seen = new Set(ok);
      for (const x of cands) { const n = norm(x); if (!x || seen.has(n)) continue; seen.add(n); out.push(x); if (out.length === 3) break; }
      return out;
    }
    if (q.mode === 'verb') cands = wrongVerbs(q, v, tense, pronoun);
    else if (q.mode === 'pron') cands = V.shuffle(wrongPrefixes(q, v, pronoun));
    else {
      const vp = q.vf.forms[0];
      cands = V.shuffle(wrongPrefixes(q, v, pronoun).map(p => joinPV(p, vp)))
        .concat(wrongVerbs(q, v, tense, pronoun).map(w => joinPV(prefixFor(pronoun, q.clitics, w, v), w)));
      cands = V.shuffle(cands);
    }
    const out = [], seen = new Set(ok);
    for (const x of cands) {
      const n = norm(x);
      if (!x || seen.has(n)) continue;
      seen.add(n); out.push(x);
      if (out.length === 3) break;
    }
    return out;
  }

  root.Sentences = { parse, build, options, catsOf, buildModal, modalOk, isModal, MODALS, SKILLS };
})(typeof window !== 'undefined' ? window : this);

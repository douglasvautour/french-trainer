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
  function makeSpec(pat, pronoun) {
    const subj = V.SLOT[pronoun];
    const t = pat.type.split('+');
    const spec = {};
    // not the subject itself ("je me vois" is reflexive) nor a group that includes it ("je nous…")
    const OVERLAP = { 0: [0, 3], 1: [1, 4], 3: [3, 0], 4: [4, 1] };
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
  const PARTICLE = / (up|down|out|off|away|back|over|together|apart)$/;
  function english(v, tense, pronoun, spec, pat) {
    let vv = pat.enForms ? Object.assign({}, v, { enF: pat.enForms.split('|'), st: false }) : v;
    let t = pat.tail;
    // phrasal verbs take the object before the particle: "earth it up", not "earth up it"
    const m = t === '{o}' && vv.enF[0].match(PARTICLE);
    if (m) {
      vv = Object.assign({}, vv, { enF: vv.enF.map(x => x.replace(new RegExp(' ' + m[1] + '$'), '')) });
      t = '{o} ' + m[1];
    }
    let s = V.english(vv, tense, pronoun);
    const tail = fillTail(t, spec);
    if (!tail) return s;
    const end = s.endsWith('…') ? '…' : '.';
    return s.slice(0, -end.length) + ' ' + tail + (end === '…' ? '.' : end);
  }

  /**
   * Build a question. mode: 'verb' (fill in the verb), 'pron' (fill in subject + pronouns), 'both'.
   * Returns { ans, before, after, english, cue, spec, pattern } or null if the sentence doesn't exist.
   */
  function build(v, tense, pronoun, pat, mode) {
    if (pat.type.includes('y') && v.inf === 'aller' && (tense === 'futur' || tense === 'cond')) return null; // j'irai, not j'y irai
    const spec = makeSpec(pat, pronoun);
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
    const cue = pat.type === 'S' ? '' : pat.type.startsWith('R') && !fillTail(pat.tail, spec) ? 'reflexive' : fillTail(pat.tail, spec);
    return { ans, before, after, english: english(v, tense, pronoun, spec, pat), cue, spec, pattern: pat, clitics, vf, mode };
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
    const ok = new Set(q.ans.acceptBlank.map(norm));
    let cands = [];
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

  root.Sentences = { parse, build, options, catsOf };
})(typeof window !== 'undefined' ? window : this);

/* Apprenez le français ! — nouns and determiners (MIT licence; the data in nouns-data.js is CC BY-SA 4.0) */
(function (root) {
  'use strict';
  const V = root.Verbs || (typeof require !== 'undefined' ? require('./verbs.js') : null);

  /* ---------- Data ---------- */
  const NOUNS = [], BY_ID = {};
  (root.NOUN_DATA ? root.NOUN_DATA.N : '').split('\n').forEach((line, i) => {
    if (!line) return;
    const [id, w, g, pl, fem, fempl, flags, en, enpl] = line.split('\t');
    const n = { id, w, g: g[0], pluralOnly: g.endsWith('-p'), pl: pl.split(';'), fem: fem || null, fempl: fempl || null,
      person: flags.includes('P'), mass: flags.includes('M'), nopl: flags.includes('N'), h: flags.includes('H'), uq: flags.includes('U'),
      en, enpl, rank: i + 1 };
    n.group = n.rank <= 500 ? 'common' : n.rank <= 2000 ? 'g1' : 'g2';
    NOUNS.push(n); BY_ID[id] = n;
  });
  const COMMON = new Set(NOUNS.filter(n => n.group === 'common').map(n => n.id));

  /* Forms of a noun: s (singular), p (plural), fs / fp (feminine, for people: ami → amie) */
  const VARIANT_LABEL = { s: 'singular', p: 'plural', fs: 'feminine singular', fp: 'feminine plural' };
  function variants(n) {
    if (n.pluralOnly) return ['p'];
    const out = ['s'];
    if (!n.nopl) out.push('p');
    if (n.fem) { out.push('fs'); if (!n.nopl) out.push('fp'); }
    return out;
  }
  const isPlural = v => v === 'p' || v === 'fp';
  const genderOf = (n, v) => (v === 'fs' || v === 'fp' ? 'f' : n.g);
  const wordOf = (n, v) => (v === 's' ? n.w : v === 'p' ? (n.pluralOnly ? n.w : n.pl[0]) : v === 'fs' ? n.fem : n.fempl);
  const altsOf = (n, v) => (v === 'p' && !n.pluralOnly ? n.pl : [wordOf(n, v)]);
  const formKey = (id, v) => id + '|' + v;
  const parseKey = k => { const [id, v] = k.split('|'); return { id, v }; };
  const nForms = n => variants(n).length;

  /* ---------- Determiners ---------- */
  const KINDS = [
    { id: 'def', label: 'article défini', color: '#872222', set: 'le, la, l’, les' },
    { id: 'ind', label: 'article indéfini', color: '#874C22', set: 'un, une, des' },
    { id: 'part', label: 'article partitif', color: '#4C8722', set: 'du, de la, de l’' },
    { id: 'pos', label: 'déterminant possessif', color: '#225D87', set: 'mon, ma, mes…' },
    { id: 'dem', label: 'déterminant démonstratif', color: '#542287', set: 'ce, cet, cette, ces' },
  ];
  const KIND = Object.fromEntries(KINDS.map(k => [k.id, k]));
  const OWNERS = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];
  const POS = { je: ['mon', 'ma', 'mes'], tu: ['ton', 'ta', 'tes'], il: ['son', 'sa', 'ses'], nous: ['notre', 'notre', 'nos'], vous: ['votre', 'votre', 'vos'], ils: ['leur', 'leur', 'leurs'] };
  const POS_EN = { je: 'my', tu: 'your (sing.)', il: 'his', ilf: 'her', nous: 'our', vous: 'your (pl.)', ils: 'their' };
  // mass nouns that don't take "un/une" ("une eau", "un argent")
  const NO_IND = new Set(['eau', 'air', 'argent', 'sang', 'or', 'fer', 'fric', 'courage', 'confiance', 'chance', 'importance', 'honte', 'chaleur', 'musique', 'pluie', 'temps', 'monde', 'herbe', 'peur', 'travail', 'silence', 'glace', 'terre']);

  const VOWEL = /^[aeiouyàâäéèêëîïôöùûüœæ]/i;
  // does the word take l', cet, mon, de l'? vowels and the silent h (l'homme), not the aspirated h (le héros)
  const elides = (n, word) => (VOWEL.test(word) || (/^h/i.test(word) && !n.h));
  function determiner(kind, n, v, owner) {
    const g = genderOf(n, v), pl = isPlural(v), word = wordOf(n, v), el = elides(n, word);
    if (kind === 'def') return pl ? 'les' : el ? "l'" : g === 'f' ? 'la' : 'le';
    if (kind === 'ind') return pl ? 'des' : g === 'f' ? 'une' : 'un';
    if (kind === 'part') return pl ? 'des' : el ? "de l'" : g === 'f' ? 'de la' : 'du';
    if (kind === 'dem') return pl ? 'ces' : g === 'f' ? 'cette' : el ? 'cet' : 'ce';
    if (kind === 'pos') { const f = POS[owner]; return pl ? f[2] : g === 'f' && !el ? f[1] : f[0]; } // mon amie
    return '';
  }
  const join = (d, w) => (d.endsWith("'") ? d + w : d + ' ' + w);
  // the same determiner without its sound change: "le homme", "ma amie", "ce homme" (for wrong answers)
  function unchanged(kind, n, v, owner) {
    const g = genderOf(n, v), pl = isPlural(v);
    if (pl) return null;
    if (kind === 'def') return g === 'f' ? 'la' : 'le';
    if (kind === 'part') return g === 'f' ? 'de la' : 'du';
    if (kind === 'dem') return g === 'f' ? 'cette' : 'ce';
    if (kind === 'pos') return g === 'f' ? POS[owner][1] : POS[owner][0];
    return null;
  }
  // things nobody owns or points at ("notre pluie", "ce nord")
  const NO_POS = new Set(['pluie', 'vent', 'soleil', 'ciel', 'lune', 'nord', 'est', 'sud', 'ouest', 'milieu', 'reste', 'suite', 'fois', 'importance', 'hasard', 'fond', 'lendemain']);
  const NO_DEM = new Set(['nord', 'est', 'sud', 'ouest', 'milieu', 'reste', 'lendemain']);
  function kindOk(kind, n, v) {
    if (kind === 'pos' && NO_POS.has(n.id)) return false;
    if (kind === 'dem' && NO_DEM.has(n.id)) return false;
    if (kind === 'part') return n.mass && !isPlural(v);
    if (kind === 'ind') return !(n.mass && NO_IND.has(n.id));
    return true;
  }

  /* ---------- English ---------- */
  const article = e => (/^(hour|honour|honest|heir)/i.test(e) ? 'an' : /^[aeiou]/i.test(e) && !/^(uni|use|usu|eu|one|once)/i.test(e) ? 'an' : 'a');
  function nounEnglish(n, v) {
    let e = isPlural(v) || n.pluralOnly ? n.enpl : n.en;
    // people: the English doesn't say which, so add (m.) or (f.)
    if (n.person) e = e.replace(/^([^(]*?)(\s*\(.*\))?$/, (m, a, b) => a + (b || '') + (genderOf(n, v) === 'f' ? ' (f.)' : ' (m.)'));
    return e;
  }
  function detEnglish(kind, n, v, ownerEn) {
    const pl = isPlural(v) || n.pluralOnly;
    if (kind === 'def') return 'the';
    if (kind === 'ind') return pl ? 'some' : article(n.en);
    if (kind === 'part') return 'some';
    if (kind === 'dem') return pl ? 'these' : 'this';
    if (kind === 'pos') return POS_EN[ownerEn];
    return 'the';
  }

  /* ---------- Questions ---------- */
  // q: { n, v, kind, owner, ownerEn, mode } → answer, scaffold, English, cues
  function build(n, v, kind, owner, ownerEn, mode) {
    if (!variants(n).includes(v) || !kindOk(kind, n, v)) return null;
    const d = determiner(kind, n, v, owner), word = wordOf(n, v);
    const fulls = altsOf(n, v).map(w => join(d, w));
    const full = fulls[0];
    let ans, before = '', after = '';
    if (mode === 'noun') { ans = { blank: word, acceptBlank: altsOf(n, v), acceptFull: fulls, full }; before = d; }
    else if (mode === 'det') { ans = { blank: d, acceptBlank: [d], acceptFull: fulls, full }; after = word; }
    else ans = { blank: full, acceptBlank: fulls, acceptFull: fulls, full };
    const detEn = detEnglish(kind, n, v, ownerEn), nounEn = nounEnglish(n, v);
    return { ans, before, after, det: d, word, english: detEn + ' ' + nounEn, detEn, nounEn, mode, kind, v, owner, ownerEn };
  }

  // wrong answers: other forms of the same noun, other determiners, and the classic slips (le eau, ma amie, ce homme, chevals)
  function fakePlurals(n) {
    // only the slips people really make: chevals / chevaus, bijous, travails, jeus, cheveus
    const w = n.w;
    if (/al$/.test(w)) return [w + 's', w.slice(0, -1) + 'us'];
    if (/ail$/.test(w)) return [w + 's', w.slice(0, -3) + 'aux'];
    if (/(eau|au|eu)$/.test(w)) return [w + 's'];
    if (/ou$/.test(w)) return [w + 's', w + 'x'];
    if (/[^sxz]$/.test(w) && n.pl[0] !== w + 's') return [w + 's'];
    return [];
  }
  function nounCands(n, v) {
    const out = [];
    variants(n).forEach(x => altsOf(n, x).forEach(w => out.push(w)));
    if (n.fem) out.push(n.fem, n.fempl);
    if (!n.pluralOnly) { out.push(n.w); fakePlurals(n).forEach(w => out.push(w)); }
    if (n.fem && n.fem !== n.w) out.push(n.fem + 's');
    return out.filter(Boolean);
  }
  function detCands(kind, n, v, owner) {
    const out = [];
    const ch = unchanged(kind, n, v, owner); if (ch) out.push(ch);
    const g = genderOf(n, v);
    const set = {
      def: ['le', 'la', "l'", 'les'], ind: ['un', 'une', 'des', 'de'], part: ['du', 'de la', "de l'", 'des', 'de'],
      dem: ['ce', 'cet', 'cette', 'ces'], pos: POS[owner || 'je'].concat(['mon', 'ma', 'mes']),
    }[kind];
    V.shuffle(set.slice()).forEach(x => out.push(x));
    // the same gender from another kind, as a last resort
    out.push(g === 'f' ? 'la' : 'le', g === 'f' ? 'une' : 'un');
    return out;
  }
  function options(b, n, count = 3) {
    const right = new Set(b.ans.acceptBlank.map(V.norm));
    let cands;
    if (b.mode === 'noun') cands = V.shuffle(nounCands(n, b.v));
    else if (b.mode === 'det') cands = detCands(b.kind, n, b.v, b.owner);
    else {
      const ch = unchanged(b.kind, n, b.v, b.owner);
      cands = [];
      if (ch && ch !== b.det) cands.push(ch + ' ' + b.word); // le eau, ma amie, ce homme
      const dets = detCands(b.kind, n, b.v, b.owner).filter(d => d !== b.det && d !== ch);
      const nouns = V.shuffle(nounCands(n, b.v)).filter(w => w !== b.word);
      V.shuffle([...dets.slice(0, 3).map(d => join(d, b.word)), ...nouns.slice(0, 3).map(w => join(b.det, w)),
        ...(dets[0] && nouns[0] ? [join(dets[0], nouns[0])] : [])]).forEach(x => cands.push(x));
    }
    const out = [], seen = new Set(right);
    const silly = x => /'\S/.test(x) && b.mode === 'both' && !elides(n, x.slice(x.indexOf("'") + 1)); // "l'mères"
    for (const x of cands) { const k = V.norm(x); if (!x || seen.has(k) || silly(x)) continue; seen.add(k); out.push(x); if (out.length === count) break; }
    return out;
  }
  // tiles for drag and drop: one list per blank
  function tiles(b, n) {
    if (b.mode === 'both') {
      const dets = detCands(b.kind, n, b.v, b.owner).filter(d => d !== b.det);
      const nouns = V.shuffle(nounCands(n, b.v)).filter(w => w !== b.word);
      const uniq = a => [...new Set(a)];
      const nx = uniq(nouns).slice(0, 2), dx = uniq(dets).slice(0, 4 - nx.length);
      return { slots: [[b.det], altsOf(n, b.v)], extras: dx.concat(nx) };
    }
    return { slots: [b.ans.acceptBlank], extras: options(b, n, 4) };
  }

  const API = { NOUNS, BY_ID, COMMON, KINDS, KIND, OWNERS, VARIANT_LABEL, variants, isPlural, genderOf, wordOf, altsOf, formKey, parseKey, nForms,
    determiner, join, elides, kindOk, build, options, tiles, nounEnglish, POS_EN };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Nouns = API;
})(typeof window !== 'undefined' ? window : this);

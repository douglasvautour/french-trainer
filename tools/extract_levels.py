"""CEFR levels for the app's verbs and nouns, from FLELex (FLELex-TT).

FLELex: Thomas François, Nùria Gala, Patrick Watrin, Cédrick Fairon (2014), "FLELex: a graded lexical resource for French
foreign learners", LREC 2014. https://cental.uclouvain.be/flelex/ — CC BY-NC 4.0.
Level of a word = the first CEFR level at which FLELex records it at least once per million words (frequencies below that
are mostly one-off occurrences); a word never that frequent takes the level where it is most frequent.
Usage: python3 extract_levels.py FleLex_TT.csv verb_infinitives.txt noun_words.txt ../levels.js"""
import csv, sys, json, collections
src, vf, nf, out = sys.argv[1:5]
L = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
lev = {}
for r in csv.DictReader(open(src, encoding='utf-8'), delimiter='\t'):
    tag = {'VER': 'v', 'NOM': 'n'}.get(r['tag'])
    if not tag: continue
    f = [float(r['freq_' + l]) for l in L]
    if not any(f): continue
    level = next((L[i] for i, x in enumerate(f) if x >= 1), L[max(range(6), key=lambda i: f[i])])
    w = r['word'].replace('oe', 'œ') if r['word'].replace('oe', 'œ') != r['word'] else r['word']
    for k in {r['word'], w}:
        old = lev.get((tag, k))
        if not old or L.index(level) < L.index(old): lev[(tag, k)] = level
res = {'v': collections.defaultdict(list), 'n': collections.defaultdict(list)}
miss = collections.Counter()
for tag, f in (('v', vf), ('n', nf)):
    for w in open(f, encoding='utf-8').read().split('\n'):
        if not w: continue
        l = lev.get((tag, w)) or (lev.get((tag, w[:-1])) if tag == 'n' and w.endswith('s') else None)  # "vacances" → "vacance"
        if l: res[tag][l].append(w)
        else: miss[tag] += 1
js = ('/* Apprenez le français ! — CEFR levels of the verbs and nouns, from FLELex (François, Gala, Watrin & Fairon 2014,\n'
      '   https://cental.uclouvain.be/flelex/), licensed CC BY-NC 4.0. See data/FLELEX-NOTICE.txt.\n'
      '   A word\'s level is the first level where FLELex finds it at least once per million words. */\n'
      'window.LEVELS = ' + json.dumps({t: {l: ' '.join(ws) for l, ws in d.items()} for t, d in res.items()}, ensure_ascii=False) + ';\n')
open(out, 'w', encoding='utf-8').write(js)
print({t: {l: len(ws) for l, ws in sorted(d.items())} for t, d in res.items()}, 'not in FLELex:', dict(miss), 'bytes', len(js.encode()))

"""Build definitions.js from the kaikki.org (Wiktextract) dump of the English Wiktionary's French verbs.

Usage: python3 extract_defs.py kaikki.org-dictionary-French-by-pos-verb.jsonl ids.json ../definitions.js
ids.json: [[id, infinitive, reflexive(0/1)], ...] for the app's verbs.
Licence of the output: CC BY-SA 4.0 (Wiktionary contributors)."""
import json, re, sys, collections

src, idsf, out = sys.argv[1:4]
ids = json.load(open(idsf, encoding='utf-8'))
want = {i for i, _, _ in ids} | {inf for _, inf, _ in ids}
ent = collections.defaultdict(list)
for line in open(src, encoding='utf-8'):
    d = json.loads(line)
    if d.get('pos') == 'verb' and d.get('word') in want:
        ent[d['word']].append(d)

NORMAL = {'figuratively': 'figurative', 'literally': 'literal', 'ambitransitive': 'transitive & intransitive'}
SKIP_TAGS = {'form-of', 'alt-of', 'no-gloss', 'singular', 'plural', 'present', 'indicative', 'subjunctive',
             'first-person', 'second-person', 'third-person', 'imperative'}
REFL_LABEL = re.compile(r'reflexive|pronominal|reciprocal')

def labels(s):
    raw = (s.get('raw_glosses') or [''])[-1]
    m = re.match(r'^\(([^)]*)\)', raw)
    if m:
        out = [x.strip() for x in re.split(r'[,;]', m.group(1)) if x.strip()]
    else:
        out = [t for t in s.get('tags', []) if t not in SKIP_TAGS and not t.startswith('error')]
        out = [t.replace('-', ' ') if t[0].isupper() else t for t in out]
    merged = []
    for x in out:  # "(sports, games, etc.)": keep "etc." with the label before it
        if x == 'etc.' and merged: merged[-1] += ', etc.'
        else: merged.append(x)
    out = merged
    seen, res = set(), []
    for x in out:
        x = NORMAL.get(x, x)
        if x not in seen: seen.add(x); res.append(x)
    return res

def examples(s):
    out = []
    for x in s.get('examples', []):
        t = (x.get('text') or '').strip()
        en = (x.get('translation') or x.get('english') or '').strip()
        if not t: continue
        if x.get('type') == 'quotation' and (len(t) > 220 or not en): continue  # keep short, translated quotations only
        out.append([t, en] if en else [t])
        if len(out) == 3: break
    return out

def senses(entries, only_refl=False, word=''):
    res, seen = [], set()
    for e in entries:
        for s in e.get('senses', []):
            g = s.get('glosses') or []
            if not g or 'form-of' in s.get('tags', []) or s.get('form_of'): continue
            raw = labels(s)
            # "(se baigner) to go for a swim": the reflexive form as a label means a reflexive sense
            self_form = [l for l in raw if re.match(r"^(se |s')", l) or l == word]
            lab = [l for l in raw if l not in self_form]
            if any(re.match(r"^(se |s')", l) for l in self_form) and not any(REFL_LABEL.search(l) for l in lab): lab.insert(0, 'reflexive')
            if only_refl and not any(REFL_LABEL.search(l) for l in lab + s.get('tags', [])): continue
            gloss = g[-1].strip()
            key = (gloss, tuple(lab))
            if key in seen: continue
            seen.add(key)
            res.append([gloss, lab, examples(s)])
    return res

D, FROM, stats = {}, {}, collections.Counter()
for vid, inf, refl in ids:
    if refl:
        ss = senses(ent.get(vid, []), word=vid) + senses(ent.get(inf, []), only_refl=True, word=vid)
        if not ss and ent.get(inf):  # Wiktionary has no reflexive sense: show the base verb's meanings, saying so
            ss = senses(ent.get(inf, []), word=vid); FROM[vid] = inf; stats['from_base'] += 1
    else:
        ss = senses(ent.get(inf, []), word=inf)
    if ss:
        D[vid] = ss
        stats['verbs'] += 1; stats['senses'] += len(ss)
        stats['with_example'] += sum(1 for x in ss if x[2])
    else:
        stats['none'] += 1
js = ('/* Apprenez le français ! — verb meanings and examples from the English Wiktionary\n'
      '   (https://en.wiktionary.org), by Wiktionary contributors, licensed under CC BY-SA 4.0\n'
      '   (https://creativecommons.org/licenses/by-sa/4.0/). Extracted with Wiktextract (https://kaikki.org)\n'
      '   and reformatted for this app: only the infinitive’s verb senses are kept, with up to three examples each.\n'
      '   This file, unlike the app code, is licensed CC BY-SA 4.0. See data/WIKTIONARY-NOTICE.txt.\n'
      '   Format: id: [[meaning, [labels], [[French, English], …]], …] */\n'
      'window.DEFS = ' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';\n'
      '/* reflexive verbs whose meanings are listed under the base verb */\n'
      'window.DEFS_FROM = ' + json.dumps(FROM, ensure_ascii=False) + ';\n')
open(out, 'w', encoding='utf-8').write(js)
print(dict(stats), 'bytes', len(js.encode()))

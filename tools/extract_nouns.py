"""Build the noun list for the Nouns & Determiners module.

Frequency (which nouns, and their rank): Lexique 3.83 (lexique.org, CC BY-SA 4.0).
Gender, plurals, feminine forms, meanings, examples: the English Wiktionary via kaikki.org (CC BY-SA 4.0).
Usage: python3 extract_nouns.py Lexique383.tsv kaikki.org-dictionary-French-by-pos-noun.jsonl out.json [N]"""
import csv, json, re, sys, collections

lex_f, kk_f, out_f = sys.argv[1:4]
N = int(sys.argv[4]) if len(sys.argv) > 4 else 5000

# ---- frequency by lemma and gender (films + books, per million) ----
freq = collections.defaultdict(float); fg = collections.defaultdict(lambda: collections.Counter())
for r in csv.DictReader(open(lex_f, encoding='utf-8'), delimiter='\t'):
    if r['cgram'] != 'NOM': continue
    f = (float(r['freqlemfilms2'] or 0) + float(r['freqlemlivres'] or 0)) / 2
    l = r['lemme']
    freq[l] = max(freq[l], f)
    fg[l][r['genre'] or '?'] = max(fg[l][r['genre'] or '?'], f)

# ---- Wiktionary noun entries ----
BAD = {'vulgar', 'offensive', 'derogatory', 'ethnic', 'slur'}
ents = collections.defaultdict(list)
want = set(freq) | {w.replace('oe', 'œ') for w in freq if 'oe' in w}
haspire = set()
for line in open(kk_f, encoding='utf-8'):
    d = json.loads(line)
    w = d.get('word')
    if w not in want: continue
    if 'aspirated h' in json.dumps(d.get('senses', []), ensure_ascii=False) or 'aspirated h' in json.dumps(d.get('sounds', []), ensure_ascii=False): haspire.add(w)
    senses = [s for s in d.get('senses', []) if s.get('glosses') and 'form-of' not in s.get('tags', []) and not s.get('form_of')]
    if not senses: continue
    g = None
    for h in d.get('head_templates', []):
        if h.get('name') == 'fr-noun': g = h.get('args', {}).get('1')
    if not g: continue
    ents[w].append((d, senses, g))
json.dump({'haspire': sorted(haspire)}, open(out_f + '.haspire.json', 'w'), ensure_ascii=False)
print('lemmas with entries', len(ents))

# ---- hand corrections ----
FIX = {}
for line in open(__file__.rsplit('/', 1)[0] + '/noun_fixes.txt', encoding='utf-8'):
    if not line.strip() or line.startswith('#'): continue
    parts = [x.strip() for x in line.rstrip('\n').split('|')] + ['', '', '']
    FIX[parts[0]] = {'en': parts[1], 'enpl': parts[2], 'flags': set(parts[3].split())}

# ---- build the items ----
SKIP = set('peu tout bonjour nouveau meilleur moins plus merci salut oui non pire mieux ça truc bye okay ok'.split())
NORMAL = {'figuratively': 'figurative', 'literally': 'literal'}
def labels(s):
    raw = (s.get('raw_glosses') or [''])[-1]
    m = re.match(r'^\(([^)]*)\)', raw)
    out = [x.strip() for x in re.split(r'[,;]', m.group(1)) if x.strip()] if m else \
          [t for t in s.get('tags', []) if t not in ('masculine', 'feminine', 'by-personal-gender', 'countable', 'plural', 'singular') and not t.startswith('error')]
    res = []
    for x in out:
        x = NORMAL.get(x, x)
        if x == 'etc.' and res: res[-1] += ', etc.'
        elif x not in res: res.append(x)
    return res
def examples(s):
    out = []
    for x in s.get('examples', []):
        t = (x.get('text') or '').strip(); en = (x.get('translation') or x.get('english') or '').strip()
        if not t or (x.get('type') == 'quotation' and (len(t) > 220 or not en)): continue
        out.append([t, en] if en else [t])
        if len(out) == 3: break
    return out
def short(gl):
    g = re.sub(r'^(a|an|the|to) ', '', gl.strip())
    g = re.split(r'\s*[,;:(]|\s+[–—-]\s+', g)[0].strip()
    return g
def gender(g):
    g = g.split('<')[0]
    if g in ('m', 'f'): return g
    if g in ('mfbysense', 'mf', 'm,f', 'f,m', 'mfequiv'): return 'mf'
    if g in ('m-p', 'f-p'): return g
    return g[0] if g[:1] in ('m', 'f') else None

items, seen = [], set()
order = sorted(freq, key=lambda l: -freq[l])
for l in order:
    if len(items) >= N: break
    fx0 = FIX.get(l.replace('oe', 'œ')) or FIX.get(l) or {'flags': set()}
    if l in SKIP or 'skip' in fx0['flags'] or not re.match(r"^[a-zàâäçéèêëîïôöùûüÿœæ' -]+$", l): continue
    w = l.replace('oe', 'œ') if l.replace('oe', 'œ') in ents else l  # Lexique writes "oeil", Wiktionary "œil"
    if w not in ents or w in seen: continue
    seen.add(w)
    cand = []
    for d, senses, g in ents[w]:
        gg = gender(g)
        if not gg: continue
        senses = [s for s in senses if not (set(s.get('tags', [])) & BAD)]
        if not senses: continue
        cand.append((d, senses, gg))
    if not cand: continue
    # several entries with different genders (le livre / la livre): keep each gender Lexique also knows,
    # entries of the same gender are merged
    bygen = collections.OrderedDict()
    for d, senses, gg in cand: bygen.setdefault(gg[0] if gg != 'mf' else 'mf', []).append((d, senses, gg))
    lexg = fg[l]
    keep = [k for k in bygen if k == 'mf' or len(bygen) == 1 or lexg.get(k, 0) >= max(0.5, 0.05 * max(lexg.values()))] or list(bygen)[:1]
    for k in keep:
        group = bygen[k]
        d0, _, gg = group[0]
        allsenses = [s for _, ss, _ in group for s in ss]
        forms = [f for d, _, _ in group for f in d.get('forms', [])]
        okf = lambda f: not set(f.get('tags', [])) & {'alternative', 'nonstandard', 'obsolete', 'archaic', 'rare', 'dated', 'Louisiana', 'also', 'proscribed'}
        pl = [f['form'] for f in forms if 'plural' in f.get('tags', []) and 'feminine' not in f.get('tags', []) and okf(f)]
        inv = any('invariable' in s.get('tags', []) for s in allsenses) or 'invariable' in json.dumps(d0.get('head_templates', []))
        if gg.endswith('-p'): pl = [w]
        if not pl: pl = [w] if inv or re.search(r'[sxz]$', w) else [w + 's']
        pl = list(dict.fromkeys(pl))
        fem = next((f['form'] for f in forms if 'feminine' in f.get('tags', []) and 'plural' not in f.get('tags', []) and okf(f)), None)
        if fem and not fem.startswith(w[:min(3, len(w) - 1)]): fem = None  # cheval → jument, roi → reine: different words, not feminine forms
        fempl = None if not fem else next((f['form'] for f in forms if set(f.get('tags', [])) >= {'feminine', 'plural'} and okf(f)), None)
        if fem and fempl and not fempl.startswith(fem[:3]): fempl = None
        if fem and not fempl: fempl = fem if re.search(r'[sxz]$', fem) else fem + 's'
        masc = next((f['form'] for f in forms if 'masculine' in f.get('tags', []) and 'plural' not in f.get('tags', []) and okf(f)), None)
        person = gg == 'mf' or bool(fem) or bool(masc) or any('by-personal-gender' in s.get('tags', []) for s in allsenses)
        mass = any('uncountable' in s.get('tags', []) for s in allsenses[:3])
        sens, sk = [], set()
        for s in allsenses:
            gl = s['glosses'][-1].strip(); lab = labels(s)
            if (gl, tuple(lab)) in sk: continue
            sk.add((gl, tuple(lab))); sens.append([gl, lab, examples(s)])
        items.append({'id': w + ('' if len(keep) == 1 else '#' + k), 'w': w, 'g': gg if gg != 'mf' else 'mf', 'pl': pl[:2], 'fem': fem, 'fempl': fempl, 'masc': masc,
                      'person': person, 'mass': mass, 'inv': inv, 'h': w in haspire, 'rank': len(items) + 1, 'freq': round(freq[l], 2),
                      'en': short(sens[0][0]), 'senses': sens})
IRR = {'man': 'men', 'woman': 'women', 'child': 'children', 'foot': 'feet', 'tooth': 'teeth', 'person': 'people', 'life': 'lives',
       'knife': 'knives', 'wife': 'wives', 'leaf': 'leaves', 'mouse': 'mice', 'half': 'halves', 'wolf': 'wolves', 'thief': 'thieves',
       'sheep': 'sheep', 'fish': 'fish', 'deer': 'deer', 'goose': 'geese', 'ox': 'oxen', 'shelf': 'shelves', 'loaf': 'loaves', 'calf': 'calves'}
def en_plural(e):
    m = re.match(r'^(.*?)(\s*\(.*\))?$', e); head, tail = m.group(1), m.group(2) or ''
    words = head.split(' ')
    # "piece of clothing" → "pieces of clothing": the noun before "of"
    i = words.index('of') - 1 if 'of' in words else len(words) - 1
    w = words[i]
    if w in IRR: p = IRR[w]
    elif re.search(r'(s|x|z|ch|sh)$', w): p = w + 'es'
    elif re.search(r'[^aeiou]y$', w): p = w[:-1] + 'ies'
    elif re.search(r'[^aeiou]o$', w) and w not in ('photo', 'piano', 'radio', 'video', 'kilo', 'disco', 'memo', 'logo', 'zoo'): p = w + 'es'
    else: p = w + 's'
    words[i] = p
    return ' '.join(words) + tail
out = []
for it in items:
    fx = FIX.get(it['w'], {'en': '', 'enpl': '', 'flags': set()})
    f = fx['flags']
    if fx['en']: it['en'] = fx['en']
    it['en'] = re.sub(r'\.$', '', it['en'])
    if not it['en']: continue
    it['enpl'] = fx['enpl'] or en_plural(it['en'])
    if 'g=m' in f: it['g'] = 'm'
    if 'g=f' in f: it['g'] = 'f'
    if 'nofem' in f: it['fem'] = it['fempl'] = None
    if 'noperson' in f: it['person'] = False; it['fem'] = it['fempl'] = None
    if it['g'] == 'mf' and not it['fem']: it['fem'], it['fempl'] = it['w'], it['pl'][0]
    if it['g'] == 'mf': it['g'] = 'm'; it['person'] = True
    # feminine forms in -esse are often jocular or old ("ministresse"): keep only the everyday ones
    if it['fem'] and it['fem'].endswith('esse') and it['fem'] not in ('maîtresse', 'princesse', 'hôtesse', 'comtesse', 'duchesse', 'déesse', 'tigresse', 'ânesse', 'chanoinesse', 'abbesse', 'vicomtesse', 'baronne'):
        it['fem'] = it['fempl'] = None
    it['person'] = bool(it['fem'])  # gender changes with the person only when there's a feminine form
    if it['rank'] <= 500 or fx['en']: it['mass'] = 'mass' in f
    if 'count' in f: it['mass'] = False
    it['nopl'] = 'nopl' in f or (it['mass'] and 'pl' not in f)  # "some water", not "some waters"
    out.append(it)
out = out[:5000]
for n, it in enumerate(out): it['rank'] = n + 1
# English meanings shared by two nouns ("place") can't be asked in English
cnt = collections.Counter(it['en'].lower() for it in out)
for it in out: it['uq'] = cnt[it['en'].lower()] == 1
json.dump(out, open(out_f, 'w'), ensure_ascii=False)
# ---- files for the app ----
if len(sys.argv) > 5:
    app = sys.argv[5]
    lines = []
    for it in out:
        flags = ''.join(c for c, on in [('P', it['person']), ('M', it['mass']), ('N', it['nopl']), ('H', it['h']), ('U', it['uq'])] if on)
        lines.append('\t'.join([it['id'], it['w'], it['g'], ';'.join(it['pl']), it['fem'] or '', it['fempl'] or '', flags, it['en'], it['enpl']]))
    head = ('/* Apprenez le français ! — nouns, most frequent first. Frequency: Lexique 3.83 (lexique.org, CC BY-SA 4.0).\n'
            '   Gender, plurals, feminine forms: English Wiktionary via Wiktextract/kaikki.org (CC BY-SA 4.0), with hand corrections\n'
            '   (tools/noun_fixes.txt). This file is CC BY-SA 4.0: see data/NOUNS-NOTICE.txt.\n'
            '   Line: id, word, gender (m, f, m-p, f-p), plurals, feminine, feminine plural, flags, English, English plural.\n'
            '   Flags: P gender follows the person, M takes du/de la, N no plural questions, H aspirated h, U English meaning is unique. */\n')
    open(app + '/nouns-data.js', 'w', encoding='utf-8').write(head + 'window.NOUN_DATA = ' + json.dumps({'N': '\n'.join(lines)}, ensure_ascii=False) + ';\n')
    defs = {it['id']: it['senses'] for it in out}
    open(app + '/noun-defs.js', 'w', encoding='utf-8').write(
        '/* Apprenez le français ! — noun meanings and examples from the English Wiktionary (https://en.wiktionary.org), by Wiktionary\n'
        '   contributors, CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/), via Wiktextract (kaikki.org); reformatted.\n'
        '   This file is CC BY-SA 4.0: see data/NOUNS-NOTICE.txt. Format: id: [[meaning, [labels], [[French, English], …]], …] */\n'
        'window.NDEFS = ' + json.dumps(defs, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('items', len(out), 'mass', sum(i['mass'] for i in out), 'person', sum(i['person'] for i in out), 'not unique', sum(not i['uq'] for i in out))

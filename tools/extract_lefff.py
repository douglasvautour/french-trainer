"""Extract the verb conjugations the app uses from the Lefff, into data/lefff-verbs.tsv.

Usage:  python3 tools/extract_lefff.py path/to/lefff-3.4.mlex

The Lefff 3.4 (lefff-3.4.mlex) is distributed by Benoît Sagot (Inria) under the
LGPL-LR licence; a copy ships in the french-verbs-lefff package of RosaeNLG
(https://github.com/RosaeNLG/rosaenlg/tree/master/packages/french-verbs-lefff/resources).
The output file is a modified subset of the Lefff and remains under LGPL-LR (data/LICENSE-LGPLLR.txt).
"""
import os, re, sys, datetime, collections

HERE = os.path.dirname(os.path.abspath(__file__))
MLEX = sys.argv[1] if len(sys.argv) > 1 else 'lefff-3.4.mlex'
OUT = os.path.join(HERE, '..', 'data', 'lefff-verbs.tsv')

# Which infinitives to keep: those with an English gloss in glosses.txt / extras.txt
wanted = set()
for f in ('glosses.txt', 'extras.txt'):
    for line in open(os.path.join(HERE, f), encoding='utf-8'):
        if line.startswith('#') or '=' not in line: continue
        inf, g = line.rstrip('\n').split('=', 1)
        if g != '!': wanted.add(inf.lstrip('~'))

TENSE = {'P': 'present', 'I': 'imparfait', 'J': 'ps', 'F': 'futur', 'C': 'cond', 'S': 'subj', 'Y': 'imperatif'}
forms = collections.defaultdict(lambda: collections.defaultdict(list))  # lemma -> (tense, slot) -> [forms]
for line in open(MLEX, encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) < 4 or p[1] != 'v' or p[2] not in wanted: continue
    form, lemma, tag = p[0], p[2], p[3]
    if tag in ('K', 'Km', 'Kms'):
        if form not in forms[lemma][('pp', '-')]: forms[lemma][('pp', '-')].append(form)
        continue
    m = re.fullmatch(r'([PIJFCSYTKGW]+)([123]*)([mf]?)([sp]?)', tag)
    if not m: continue
    tenses, persons, _, number = m.groups()
    for t in tenses:
        if t not in TENSE or not persons or not number: continue
        for pr in persons:
            slot = int(pr) - 1 + (3 if number == 'p' else 0)
            lst = forms[lemma][(TENSE[t], str(slot))]
            if form not in lst: lst.append(form)

# Corrections to errors found in the Lefff 3.4 (listed in the output header)
CORRECTIONS = [
    ('inclure', ('pp', '-'), ['inclus']),
    ('occlure', ('pp', '-'), ['occlus']),
    ('taire', ('present', '2'), ['tait', 'taît']),
]
for lemma, key, value in CORRECTIONS:
    if lemma in forms: forms[lemma][key] = value
for lemma in ('enamourer', 'énamourer'):  # regular -er verbs, not *enameure
    for key in list(forms.get(lemma, {})):
        forms[lemma][key] = [f.replace('ameur', 'amour') for f in forms[lemma][key]]

def order(lemma, key, xs):
    """Canonical spelling first: traditional é in future/conditional (préférerai), -aie for -ayer verbs."""
    def score(x):
        s = 0
        if key[0] in ('futur', 'cond') and x.startswith(lemma[:-1]): s -= 2
        if lemma.endswith('ayer') and 'aie' in x: s -= 1
        return s
    return sorted(xs, key=score)

today = datetime.date.today().isoformat()
with open(OUT, 'w', encoding='utf-8') as o:
    o.write('# Derived from the Lefff 3.4 (Lexique des Formes Fléchies du Français) by Benoît Sagot, Inria.\n')
    o.write('# Distributed under the LGPL-LR licence: see LICENSE-LGPLLR.txt in this folder.\n')
    o.write(f'# Modified {today}: extracted the verbs used by "Apprenez le français !" (simple tenses, imperative and\n')
    o.write('# masculine singular past participle), regrouped by tense and person, alternative spellings\n')
    o.write('# joined with "/" with the traditional spelling first. Corrected: inclure/occlure past participle\n')
    o.write('# (inclus, occlus), "il tait" (taire), and the present of enamourer/énamourer (enamoure).\n')
    o.write('# Columns: infinitive, tense (present imparfait futur cond subj ps imperatif, or pp), person 0-5 (je..ils, "-" for pp), forms\n')
    for lemma in sorted(forms):
        for key in sorted(forms[lemma]):
            o.write('\t'.join([lemma, key[0], key[1], '/'.join(order(lemma, key, forms[lemma][key]))]) + '\n')
missing = sorted(w for w in wanted if w not in forms)
print('verbs found', len(forms), 'of', len(wanted), '| not in Lefff:', len(missing))
print(' '.join(missing))

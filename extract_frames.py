"""Extract, for each verb, which pronoun constructions the Lefff allows.

Usage:  python3 tools/extract_frames.py path/to/lefff-master

Reads the Lefff verb lexicons (v.ilex, v_new.ilex, v-phd.ilex, otherlex2lefff/v-lglex.lex)
and writes data/lefff-frames.tsv (LGPL-LR, derived from the Lefff).

Codes in the Lefff frames (Sagot 2010):
  Suj subject, Obj direct object, Objà indirect object (à), Objde complement with de,
  Loc locative, Dloc "from" locative, Att attribute, Obl/Obl2 other complements.
  Realizations: cla = le/la/les, cld = lui/leur, y, en, seréfl/seréc = reflexive/reciprocal se,
  sn = noun phrase, à-sn = à + noun, de-sn = de + noun, sinf = infinitive, scompl = que-clause.
  An argument in parentheses is optional. "se Lemma" + @pron = pronominal verb.
"""
import os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else 'lefff-master'
OUT = os.path.join(HERE, '..', 'data', 'lefff-frames.tsv')

wanted = set()
for f in ('glosses.txt', 'extras.txt'):
    for line in open(os.path.join(HERE, f), encoding='utf-8'):
        if line.startswith('#') or '=' not in line: continue
        inf, g = line.rstrip('\n').split('=', 1)
        if g != '!': wanted.add(inf.lstrip('~'))

ARG = re.compile(r'(Suj|Obj|Objà|Objde|Loc|Dloc|Att|Obl2|Obl):(\(?)([^,>]*?)(\)?)(?=,|>)')

def parse_frame(frame):
    """'<Suj:cln|sn,Obj:(cla|sn)>' -> {'Obj': ({'cla','sn'}, optional)}"""
    args = {}
    for fn, op, body, cl in ARG.findall(frame):
        reals = set(x.split('__')[0] for x in body.strip('()').split('|') if x)
        args[fn] = (reals, bool(op))
    return args

entries = collections.defaultdict(list)  # lemma -> [(pron, args, macros, source)]

def add(lemma, head, frame, macros, src):
    if lemma not in wanted or head == '0': return  # head 0 = light-verb use (prendre une douche)
    pron = head.startswith('se ') or '@pron' in macros
    entries[lemma].append((pron, parse_frame(frame), macros, src))

for f in ('v.ilex', 'v_new.ilex', 'v-phd.ilex'):
    for line in open(os.path.join(SRC, f), encoding='utf-8', errors='replace'):
        p = line.rstrip('\n').split('\t')
        if len(p) < 3 or line.startswith('#'): continue
        fields = p[2].split(';')
        if len(fields) < 5: continue
        add(p[0], fields[1], fields[3], fields[4], f)

# Lexicon-Grammar conversion: one line per form; keep infinitive lines only
lg = os.path.join(SRC, 'otherlex2lefff', 'v-lglex.lex')
if os.path.exists(lg):
    for line in open(lg, encoding='latin-1'):
        if '\tW\t' not in line and not line.rstrip().endswith('\tW'):
            if '\tInfinitive\tW\t' not in line: continue
        p = line.split('\t')
        m = re.search(r'pred="([^_"]*)___[^<]*(<[^>]*>)"', line)
        if not m: continue
        head = m.group(1)
        macros = line[m.end():line.find(']', m.end())]
        lemma = p[0]
        if head.startswith('ne '): continue  # negative-only expressions
        add(lemma, 'se Lemma' if head.startswith(('se ', "s'")) else 'Lemma', m.group(2), macros, 'lglex')

LOC_Y = {'y', 'à-sn', 'loc-sn', 'dans-sn', 'chez-sn', 'en-sn', 'sur-sn', 'sous-sn'}

def patterns(lemma):
    """Return the set of pronoun patterns the verb allows, plus agreement info."""
    P = set()
    se_role = set()
    for pron, a, macros, src in entries[lemma]:
        others = {k: v for k, v in a.items() if k != 'Suj'}
        all_optional = all(opt for _, opt in others.values())
        obj, objA, objD = a.get('Obj', (set(), True)), a.get('Objà', (set(), True)), a.get('Objde', (set(), True))
        loc, dloc = a.get('Loc', (set(), True)), a.get('Dloc', (set(), True))
        y = ('y' in objA[0]) or bool(loc[0] & LOC_Y)
        en = ('en' in objD[0]) or ('en' in dloc[0]) or bool(dloc[0] & {'de-sn'}) or ('en-sn' in obj[0])
        do = 'cla' in obj[0]
        io = 'cld' in objA[0]
        human = '@Objhum' in macros
        nonhuman = '@Objnonhum' in macros
        if pron:
            if all_optional: P.add('R')
            if y: P.add('R+y')
            if en: P.add('R+en')
            if do: P.add('R+do')  # se le rappeler
            se_role.add('pron')
            continue
        if all_optional: P.add('S')
        if do:
            P.add('do')
            if human: P.add('do:hum')
            if nonhuman: P.add('do:thing')
        if io: P.add('io')
        if do and io: P.add('do+io')
        if y: P.add('y')
        if en: P.add('en')
        if do and y: P.add('do+y')
        if do and en: P.add('do+en')
        if io and en: P.add('io+en')
        if 'seréfl' in obj[0] or 'seréc' in obj[0]: P.add('R'); se_role.add('direct')
        if 'seréfl' in objA[0] or 'seréc' in objA[0]: P.add('R:indirect'); se_role.add('indirect')
    # stricter view for rarer verbs: the core Lefff files only (not the Lexicon-Grammar conversion)
    core = [e for e in entries[lemma] if e[3] != 'lglex' and not e[0]]
    core_do = any('cla' in a.get('Obj', (set(), True))[0] for _, a, _, _ in core)
    core_intrans = bool(core) and not core_do and any(all(opt for k, (_, opt) in a.items() if k != 'Suj') for _, a, _, _ in core)
    if core_do: P.add('core:do')
    if core_intrans: P.add('core:S')
    return P, se_role

with open(OUT, 'w', encoding='utf-8') as o:
    o.write('# Derived from the Lefff (Benoît Sagot, Inria; LGPL-LR, see LICENSE-LGPLLR.txt): verb subcategorisation frames\n')
    o.write('# from v.ilex, v_new.ilex, v-phd.ilex and otherlex2lefff/v-lglex.lex, reduced to the pronoun patterns each verb allows.\n')
    o.write('# Patterns: S subject only; do direct object (le/la/les); io indirect object (lui/leur); y; en; R reflexive;\n')
    o.write('# combinations joined with +. Columns: infinitive, patterns (space-separated), reflexive role\n')
    for lemma in sorted(entries):
        P, se = patterns(lemma)
        o.write(f"{lemma}\t{' '.join(sorted(P))}\t{' '.join(sorted(se))}\n")

cnt = collections.Counter()
for lemma in entries:
    for x in patterns(lemma)[0]: cnt[x] += 1
print('verbs with frames', len(entries), 'of', len(wanted))
print(cnt.most_common())

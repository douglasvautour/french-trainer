"""Rebuild ../verbs-data.js from data/lefff-verbs.tsv (Lefff, LGPL-LR) and the English glosses.

Usage:  python3 tools/build.py

data/lefff-verbs.tsv  conjugations, extracted from the Lefff by tools/extract_lefff.py
glosses.txt  one line per infinitive: verb=english   (~verb = reflexive-only, "!" = leave out,
             irregular English can be given as base|3rd-person|past|participle|-ing)
extras.txt   reflexive versions of ordinary verbs (se lever, se laver…)
common.txt   the "Common Verbs" list
"""
import json, re, os, unicodedata, collections

os.chdir(os.path.dirname(os.path.abspath(__file__)))
TSV = '../data/lefff-verbs.tsv'
LEX = collections.defaultdict(dict)  # inf -> (tense, slot) -> [forms]
for line in open(TSV, encoding='utf-8'):
    if line.startswith('#'): continue
    inf, tense, slot, fs = line.rstrip('\n').split('\t')
    LEX[inf][(tense, slot)] = fs.split('/')

# ---------- glosses ----------
gloss, refl_only = {}, set()
for f in ['glosses.txt']:
    for line in open(f, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line: continue
        a, b = line.split('=', 1)
        if a.startswith('~'):
            a = a[1:]; refl_only.add(a)
        gloss[a] = b
extras = []
for line in open('extras.txt', encoding='utf-8'):
    if line.startswith('#') or not line.strip(): continue
    a, b = line.rstrip('\n').split('=', 1); extras.append((a, b))

# ---------- auxiliary ----------
ETRE = set('aller arriver venir devenir revenir parvenir survenir intervenir advenir provenir redevenir entrer rentrer '
           'naître renaître mourir partir repartir rester tomber décéder échoir apparaître réapparaître redescendre'.split())
BOTH = set('monter remonter descendre sortir ressortir retourner passer'.split())  # être canonical, avoir accepted

# ---------- forms ----------
ORDER = ['present', 'imparfait', 'futur', 'cond', 'subj', 'ps']
IMPERSONAL = set('falloir neiger grêler bruiner brumer crachiner neigeoter pleuviner pleuvioter venter pleuvoir repleuvoir'.split())

def enc(form, inf):
    n = 0
    while n < min(len(form), len(inf)) and form[n] == inf[n]: n += 1
    strip = len(inf) - n
    assert strip < 36
    return '0123456789abcdefghijklmnopqrstuvwxyz'[strip] + form[n:]

def template(inf):
    L = LEX[inf]
    out = ['/'.join(enc(x, inf) for x in L.get(('pp', '-'), []))]
    for t in ORDER:
        for s in range(6):
            out.append('/'.join(enc(x, inf) for x in L.get((t, str(s)), [])))
    return ','.join(out)

def group(inf):
    if inf.endswith('er') and inf != 'aller': return 1
    nous = LEX[inf].get(('present', '3'), [''])[0]
    if (inf.endswith('ir') or inf.endswith('ïr')) and nous.endswith('ssons'): return 2
    return 3

# ---------- English inflection ----------
IRR = {}
for line in """arise arose arisen|awake awoke awoken|be was been|bear bore borne|beat beat beaten|become became become|begin began begun|bend bent bent|bet bet bet|bid bid bid|bind bound bound|bite bit bitten|bleed bled bled|blow blew blown|break broke broken|breed bred bred|bring brought brought|broadcast broadcast broadcast|build built built|burn burned burned|burst burst burst|buy bought bought|cast cast cast|catch caught caught|choose chose chosen|cling clung clung|come came come|cost cost cost|creep crept crept|cut cut cut|deal dealt dealt|dig dug dug|do did done|draw drew drawn|dream dreamed dreamed|drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|feed fed fed|feel felt felt|fight fought fought|find found found|flee fled fled|fling flung flung|fly flew flown|forbid forbade forbidden|forecast forecast forecast|foresee foresaw foreseen|forget forgot forgotten|forgive forgave forgiven|freeze froze frozen|get got gotten|give gave given|go went gone|grind ground ground|grow grew grown|hang hung hung|have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|kneel knelt knelt|knit knitted knitted|know knew known|lay laid laid|lead led led|lean leaned leaned|leap leaped leaped|learn learned learned|leave left left|lend lent lent|let let let|lie lay lain|light lit lit|lose lost lost|make made made|mean meant meant|meet met met|mislay mislaid mislaid|mislead misled misled|mistake mistook mistaken|overcome overcame overcome|overtake overtook overtaken|pay paid paid|put put put|quit quit quit|read read read|rebuild rebuilt rebuilt|redo redid redone|relay relayed relayed|rewrite rewrote rewritten|rid rid rid|ride rode ridden|ring rang rung|rise rose risen|run ran run|saw sawed sawn|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|sew sewed sewn|shake shook shaken|shear sheared shorn|shed shed shed|shine shone shone|shoot shot shot|show showed shown|shrink shrank shrunk|shut shut shut|sing sang sung|sink sank sunk|sit sat sat|sleep slept slept|slide slid slid|sling slung slung|slit slit slit|smell smelled smelled|sow sowed sown|speak spoke spoken|speed sped sped|spell spelled spelled|spend spent spent|spill spilled spilled|spin spun spun|spit spat spat|split split split|spread spread spread|spring sprang sprung|stand stood stood|steal stole stolen|stick stuck stuck|sting stung stung|stink stank stunk|stride strode stridden|strike struck struck|string strung strung|strive strove striven|swear swore sworn|sweep swept swept|swell swelled swollen|swim swam swum|swing swung swung|take took taken|teach taught taught|tear tore torn|tell told told|think thought thought|throw threw thrown|thrust thrust thrust|tread trod trodden|undergo underwent undergone|understand understood understood|undertake undertook undertaken|undo undid undone|upset upset upset|wake woke woken|wear wore worn|weave wove woven|weep wept wept|win won won|wind wound wound|withdraw withdrew withdrawn|withhold withheld withheld|wring wrung wrung|write wrote written""".split('|'):
    b, p, pp = line.split(); IRR[b] = (p, pp)
DOUBLE = set('admit commit omit permit submit transmit refer prefer confer defer infer deter occur recur concur incur '
             'compel expel propel repel control patrol enrol rebel regret forget begin equip upset outbid'.split())

def s3(b):
    if b == 'be': return 'is'
    if b == 'have': return 'has'
    if b in ('do', 'go', 'undo', 'redo', 'undergo', 'veto', 'echo'): return b + 'es'
    if re.search(r'(s|x|z|ch|sh)$', b): return b + 'es'
    if re.search(r'[^aeiou]y$', b): return b[:-1] + 'ies'
    return b + 's'

def doubles(b):
    if b in DOUBLE: return True
    # one-syllable consonant-vowel-consonant words: stop, plan, rob, nod
    return bool(re.fullmatch(r'[^aeiou]*[aeiou][bdgklmnprt]', b)) and not b.endswith(('w', 'x', 'y'))

def past(b):
    if b in IRR: return IRR[b]
    if b.endswith('e'): p = b + 'd'
    elif re.search(r'[^aeiou]y$', b): p = b[:-1] + 'ied'
    elif doubles(b): p = b + b[-1] + 'ed'
    elif b.endswith('c'): p = b + 'ked'
    else: p = b + 'ed'
    return (p, p)

def ing(b):
    if b == 'be': return 'being'
    if b.endswith('ie'): return b[:-2] + 'ying'
    if b.endswith('e') and not b.endswith(('ee', 'oe', 'ye')) and b not in ('be',): return b[:-1] + 'ing'
    if doubles(b): return b + b[-1] + 'ing'
    if b.endswith('c'): return b + 'king'
    return b + 'ing'

STATIVE_HEADS = set('be know want like love hate need believe seem understand own prefer remember contain belong mean '
                    'deserve depend exist resemble consist cost matter suit despise doubt envy fear adore abhor loathe '
                    'imply concern include lack possess recognize require'.split())

def english(g):
    """Return [base, s3, past, pp, ing], stative flag."""
    if '|' in g:
        parts = g.split('|')
        if len(parts) == 5: f = parts
        else: raise ValueError(g)
        head = f[0].split()[0]
    else:
        words = g.split(' ', 1)
        head, tail = words[0], (' ' + words[1] if len(words) > 1 else '')
        p, pp = past(head)
        f = [g, s3(head) + tail, p + tail, pp + tail, ing(head) + tail]
    st = head in STATIVE_HEADS and not (head == 'have' and f[0] not in ('have', 'have to'))
    if f[0] == 'have to': st = True
    if head == 'be' and f[0].startswith('be '): st = True
    return f, st

# ---------- assemble ----------
VOWEL = re.compile(r'^[aeiouyhàâäéèêëîïôöùûü]', re.I)
templates, tindex = [], {}
lines = []
common = set(open('common.txt', encoding='utf-8').read().split('\n')[0].split() + open('common.txt', encoding='utf-8').read().split('\n')[2].split())
common_ids = set()
for ln in open('common.txt', encoding='utf-8').read().split('\n'):
    # second line has reflexive ids separated by spaces with "se x" pairs
    pass
reflexive_common = re.findall(r"(?:se |s')\S+", open('common.txt', encoding='utf-8').read().split('\n')[1])

def tid(inf):
    t = template(inf)
    if t not in tindex: tindex[t] = len(templates); templates.append(t)
    return tindex[t]

H_ASPIRE = set('haïr hacher hachurer haler hâler haleter hanter handicaper happer haranguer harasser harceler harnacher harponner hasarder hâter hausser héler hennir hérisser heurter hisser hocher honnir hoqueter houer houspiller huer hululer hurler'.split())
def vid(inf, refl):
    if not refl: return inf
    return ("s'" if VOWEL.match(inf) and inf not in H_ASPIRE else 'se ') + inf

out_ids = set()
for inf, g in sorted(gloss.items(), key=lambda kv: unicodedata.normalize('NFD', kv[0])):
    if g == '!' or inf not in LEX: continue
    refl = inf in refl_only
    aux = 'e' if (refl or inf in ETRE) else ('E' if inf in BOTH else 'a')
    f, st = english(g)
    gr = group(inf)
    flags = str(gr) + aux + ('r' if refl else '') + ('s' if st else '') + ('i' if inf in IMPERSONAL else '')
    i = vid(inf, refl)
    if i in out_ids: continue
    out_ids.add(i)
    lines.append('\t'.join([inf, str(tid(inf)), flags, '|'.join(f)]))
for inf, g in extras:
    i = vid(inf, True)
    if i in out_ids or inf not in LEX: print('skip extra', inf); continue
    f, st = english(g)
    flags = str(group(inf)) + 'e' + 'r' + ('s' if st else '')
    out_ids.add(i)
    lines.append('\t'.join([inf, str(tid(inf)), flags, '|'.join(f)]))

common_list = [w for w in common if w in out_ids] + [w for w in reflexive_common if w in out_ids]
missing_common = [w for w in list(common) + reflexive_common if w not in out_ids]
print('missing common:', missing_common)
common_list = sorted(set(common_list))

js = ('/* Generated by tools/build.py — do not edit by hand.\n'
      ' * Conjugations derived from the Lefff 3.4 by Benoît Sagot (Inria), distributed under the LGPL-LR\n'
      ' * licence (see data/LICENSE-LGPLLR.txt); legible source: data/lefff-verbs.tsv. This file is a\n'
      ' * modified, compressed form of that data and is also distributed under LGPL-LR. */\n'
      'window.VERB_DATA = ' + json.dumps({'T': templates, 'V': '\n'.join(lines), 'C': common_list}, ensure_ascii=False, separators=(',', ':')) + ';\n')
open('../verbs-data.js', 'w', encoding='utf-8').write(js)
print('verbs', len(lines), 'templates', len(templates), 'common', len(common_list), 'bytes', len(js.encode()))

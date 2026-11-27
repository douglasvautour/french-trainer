/* Apprenez le français ! — grammar guide content (edit freely) */
window.GUIDE = {
  verbs: [
    {
      id: 'present', title: 'présent',
      use: 'What is happening now, what happens regularly, and things that are always true. French has no separate "-ing" form, so the présent covers both "I eat" and "I am eating". It is also used with depuis for something that started in the past and is still going on.',
      form: 'Stem + present ending. Regular -er verbs: -e, -es, -e, -ons, -ez, -ent. Many common verbs are irregular (être, avoir, aller, faire).',
      ex: [['Je mange une pomme.', 'I am eating an apple.'], ['Elle travaille le lundi.', 'She works on Mondays.'], ['J’habite ici depuis deux ans.', 'I have lived here for two years.']],
    },
    {
      id: 'pc', title: 'passé composé',
      use: 'A completed action or event in the past, the everyday spoken past tense. Use it for what happened, especially one-off events or a sequence of events.',
      form: 'Present of avoir or être + past participle. Verbs of movement and change of state (aller, venir, partir, naître…) and all reflexive verbs use être, and their participle agrees with the subject. With avoir, the participle agrees with a direct object pronoun placed before it.',
      ex: [['J’ai fini mes devoirs.', 'I finished my homework.'], ['Nous sommes allés à Paris.', 'We went to Paris.'], ['Elle s’est levée tôt.', 'She got up early.']],
    },
    {
      id: 'imparfait', title: 'imparfait',
      use: 'Background and description in the past: what was going on, what things were like, and what used to happen regularly. It often sets the scene for an event in the passé composé.',
      form: 'Take the nous form of the présent, drop -ons, add -ais, -ais, -ait, -ions, -iez, -aient. Only être is irregular (j’étais).',
      ex: [['Il pleuvait quand je suis sorti.', 'It was raining when I went out.'], ['Quand j’étais petit, je jouais au foot.', 'When I was little, I used to play football.']],
    },
    {
      id: 'futur', title: 'futur simple',
      use: 'What will happen. After quand (when) and dès que (as soon as) referring to the future, French uses the futur where English uses the present.',
      form: 'Infinitive (drop the final -e of -re verbs) + -ai, -as, -a, -ons, -ez, -ont. Some stems are irregular: ir- (aller), ser- (être), aur- (avoir), fer- (faire), pourr- (pouvoir).',
      ex: [['Demain, nous partirons à huit heures.', 'Tomorrow we will leave at eight.'], ['Je t’appellerai quand j’arriverai.', 'I will call you when I arrive.']],
    },
    {
      id: 'cond', title: 'conditionnel présent',
      use: 'What would happen: hypotheses after si + imparfait, polite requests and wishes, and the future seen from the past.',
      form: 'The futur stem + the imparfait endings: -ais, -ais, -ait, -ions, -iez, -aient.',
      ex: [['Si j’avais le temps, je voyagerais.', 'If I had the time, I would travel.'], ['Je voudrais un café, s’il vous plaît.', 'I would like a coffee, please.']],
    },
    {
      id: 'pqp', title: 'plus-que-parfait',
      use: 'An action that had already happened before another past moment — "had done".',
      form: 'Imparfait of avoir or être + past participle, with the same agreement rules as the passé composé.',
      ex: [['Quand je suis arrivé, le film avait déjà commencé.', 'When I arrived, the film had already started.'], ['Elle était partie avant midi.', 'She had left before noon.']],
    },
    {
      id: 'fa', title: 'futur antérieur',
      use: 'An action that will be finished before a moment in the future — "will have done". Often used after quand or dès que.',
      form: 'Futur of avoir or être + past participle.',
      ex: [['J’aurai fini avant ce soir.', 'I will have finished before this evening.'], ['Dès qu’il sera rentré, nous mangerons.', 'As soon as he is (will have) come home, we will eat.']],
    },
    {
      id: 'subj', title: 'subjonctif présent',
      use: 'Used after que when the main clause expresses wanting, necessity, feeling, doubt or possibility (je veux que, il faut que, je suis content que, je doute que), and after some conjunctions (pour que, avant que, bien que).',
      form: 'Take the ils form of the présent, drop -ent, add -e, -es, -e, -ions, -iez, -ent. Common irregulars: être (que je sois), avoir (que j’aie), aller (que j’aille), faire (que je fasse), pouvoir (que je puisse).',
      ex: [['Il faut que tu partes.', 'You have to leave.'], ['Je veux qu’elle vienne.', 'I want her to come.'], ['Bien qu’il soit fatigué, il travaille.', 'Although he is tired, he is working.']],
    },
    {
      id: 'cp', title: 'conditionnel passé',
      use: 'What would have happened but didn’t: after si + plus-que-parfait, and for regrets and reproaches.',
      form: 'Conditionnel of avoir or être + past participle.',
      ex: [['Si tu m’avais appelé, je serais venu.', 'If you had called me, I would have come.'], ['J’aurais dû partir plus tôt.', 'I should have left earlier.']],
    },
    {
      id: 'ps', title: 'passé simple',
      use: 'The literary past tense. It does the same job as the passé composé but is used in novels, history and formal writing, not in conversation. You mostly need to recognise it.',
      form: '-er verbs: -ai, -as, -a, -âmes, -âtes, -èrent. Most -ir and -re verbs: -is, -is, -it, -îmes, -îtes, -irent. Some verbs use -us (avoir: il eut, être: il fut).',
      ex: [['Il ouvrit la porte et sortit.', 'He opened the door and went out.'], ['Ils vécurent heureux.', 'They lived happily.']],
    },
    {
      id: 'imperatif', title: 'impératif',
      use: 'Commands, instructions and suggestions. It has only three forms: tu (one person you know well), nous ("let’s") and vous (several people, or politely to one). There is no subject pronoun.',
      form: 'The present tense forms without the subject. -er verbs (and aller, offrir, ouvrir) drop the s of the tu form: mange, va. Object pronouns come after the verb, joined by hyphens, and me/te become moi/toi: donne-le-moi, lève-toi. The s comes back before y and en: vas-y, manges-en.',
      ex: [['Finis tes légumes !', 'Finish your vegetables!'], ['Allons-y !', 'Let’s go!'], ['Donnez-le-moi, s’il vous plaît.', 'Give it to me, please.']],
    },
  ],
  pronouns: [
    {
      id: 'subj', title: 'Subject pronouns',
      list: 'je, tu, il, elle, on, nous, vous, ils, elles',
      use: 'Who does the action. Use tu for one person you know well and vous for several people or politely for one. On means "one" or, in everyday speech, "we". Ils is used for a mixed group; elles only for an all-female group. Je becomes j’ before a vowel or a silent h.',
      ex: [['On va au cinéma ?', 'Shall we go to the cinema?'], ['Vous parlez français ?', 'Do you speak French?']],
    },
    {
      id: 'do', title: 'Direct object pronouns',
      list: 'me, te, le, la, nous, vous, les',
      use: 'Replace a person or thing that follows the verb directly, without a preposition (je vois Marie → je la vois). They go before the verb, and before the auxiliary in compound tenses. Le and la become l’ before a vowel. In compound tenses with avoir, the past participle agrees with a direct object pronoun: la → -e, les → -s or -es.',
      ex: [['Tu prends le livre ? — Oui, je le prends.', 'Are you taking the book? — Yes, I’m taking it.'], ['J’ai vu tes sœurs. Je les ai vues hier.', 'I saw your sisters. I saw them yesterday.'], ['Il nous regarde.', 'He is looking at us.']],
    },
    {
      id: 'io', title: 'Indirect object pronouns',
      list: 'me, te, lui, nous, vous, leur',
      use: 'Replace à + a person (je parle à Paul → je lui parle). Common verbs: parler à, donner à, téléphoner à, écrire à, obéir à, plaire à, ressembler à. Lui means "to him" and "to her"; leur means "to them". There is no agreement with indirect objects.',
      ex: [['Je téléphone à ma mère. Je lui téléphone.', 'I’m phoning my mother. I’m phoning her.'], ['Il leur a écrit.', 'He wrote to them.']],
    },
    {
      id: 'refl', title: 'Reflexive pronouns',
      list: 'me, te, se, nous, vous, se',
      use: 'Used with reflexive (pronominal) verbs, where the action comes back to the subject or is part of the verb’s meaning: se lever (to get up), se souvenir (to remember). The pronoun matches the subject. In compound tenses these verbs use être, and the participle usually agrees with the subject. In the imperative, te becomes toi: lève-toi.',
      ex: [['Je me réveille à sept heures.', 'I wake up at seven.'], ['Elles se sont amusées.', 'They had fun.'], ['Dépêchez-vous !', 'Hurry up!']],
    },
    {
      id: 'y', title: 'y',
      list: 'y',
      use: 'Replaces a place (à, en, dans, chez + place) — "there" — and à + a thing or idea (penser à quelque chose → y penser). It is not used for people: for à + a person, use lui/leur. Before the futur and conditionnel of aller, y is left out (j’irai, not j’y irai).',
      ex: [['Tu vas à Paris ? — Oui, j’y vais.', 'Are you going to Paris? — Yes, I’m going there.'], ['Je pense à mon examen. J’y pense.', 'I’m thinking about my exam. I’m thinking about it.']],
    },
    {
      id: 'en', title: 'en',
      list: 'en',
      use: 'Replaces de + a thing: a partitive (du, de la, des — "some"), a quantity (j’en ai deux), and complements with de (parler de, se souvenir de, venir de). The past participle never agrees with en.',
      ex: [['Tu veux du café ? — Oui, j’en veux.', 'Do you want some coffee? — Yes, I want some.'], ['Il parle de son voyage. Il en parle.', 'He is talking about his trip. He is talking about it.'], ['Elle revient de Lyon. Elle en revient.', 'She is coming back from Lyon. She is coming back from there.']],
    },
    {
      id: 'order', title: 'Pronoun order',
      list: 'me te se nous vous → le la les → lui leur → y → en',
      use: 'When there are several pronouns before the verb, they always come in this order. Me/te/nous/vous and lui/leur can’t be used together. In affirmative commands, pronouns go after the verb: direct object before indirect, then y, then en (donne-le-moi, donnez-leur-en).',
      ex: [['Il me le donne.', 'He gives it to me.'], ['Je la lui ai prêtée.', 'I lent it to him.'], ['Je leur en parlerai.', 'I will talk to them about it.']],
    },
  ],
};

/* Nouns & Determiners module */
window.GUIDE.nouns = [
  {
    id: 'plural', title: 'Making nouns plural',
    use: 'Most nouns add -s. The -s (or -x) is usually silent, so in speech the determiner (les, des, mes…) is what tells you it’s plural.',
    rules: [
      ['Most nouns: add -s', 'un livre → des livres'],
      ['-s, -x, -z: no change', 'un bras → des bras · une voix → des voix · un nez → des nez'],
      ['-eau, -au, -eu: add -x', 'un bateau → des bateaux · un jeu → des jeux (but des pneus, des bleus)'],
      ['-al: becomes -aux', 'un cheval → des chevaux (but des bals, des festivals, des carnavals)'],
      ['-ou: add -s', 'un trou → des trous, except seven that take -x: bijoux, cailloux, choux, genoux, hiboux, joujoux, poux'],
      ['-ail: add -s', 'un détail → des détails (but un travail → des travaux, un vitrail → des vitraux)'],
      ['Irregular', 'un œil → des yeux · monsieur → messieurs · madame → mesdames · le ciel → les cieux'],
      ['Compound nouns', 'un grand-père → des grands-pères · un rendez-vous → des rendez-vous'],
    ],
    ex: [['Les chevaux sont dans le champ.', 'The horses are in the field.'], ['J’ai mal aux yeux.', 'My eyes hurt.']],
  },
  {
    id: 'gender', title: 'Guessing the gender from the ending',
    use: 'Every noun is masculine or feminine, and no rule covers them all, so it’s best to learn each noun with its determiner (un livre, une table). Endings are a good guide, though.',
    rules: [
      ['Usually masculine', '-age (le voyage), -ment (le moment), -eau (le bateau), -isme (le tourisme), -oir (le miroir), -et (le jouet), -ier (le cahier), -al (le journal), -in (le jardin), -o (le vélo)'],
      ['Exceptions', 'la page, la plage, l’image, la cage · l’eau, la peau · la fin, la main · la photo, la radio, la moto'],
      ['Usually feminine', '-tion / -sion (la nation), -té (la liberté), -ure (la voiture), -ette (la baguette), -ance / -ence (la chance), -ie (la vie), -ée (l’année), -ade (la salade), -ude (l’habitude), -esse (la jeunesse), -ise (la surprise)'],
      ['Exceptions', 'l’été, le côté · le silence · le génie, l’incendie · le musée, le lycée · l’avion, le camion · le squelette'],
      ['-eur', 'qualities are feminine (la peur, la couleur, la chaleur) but le bonheur, le malheur, l’honneur; people and machines are masculine (le docteur, le moteur)'],
      ['Always masculine', 'days, months and seasons (le lundi, le printemps), languages (le français), trees, metals and colours (le rouge)'],
    ],
    ex: [['Le fromage et la viande', 'Cheese and meat'], ['Une décision importante', 'An important decision']],
  },
  {
    id: 'people', title: 'Nouns for people: when the gender changes',
    use: 'For people, the noun usually follows the person’s gender, in one of three ways.',
    rules: [
      ['The word changes', 'ami → amie, cousin → cousine · -eur → -euse (vendeur, vendeuse) · -teur → -trice (acteur, actrice) · -er → -ère (boulanger, boulangère) · -ien → -ienne (musicien, musicienne) · -on → -onne (patron, patronne) · -e → -esse (prince, princesse)'],
      ['Different words', 'homme / femme · frère / sœur · oncle / tante · roi / reine · neveu / nièce'],
      ['Only the determiner changes', 'un / une élève · un / une enfant · un / une journaliste · un / une collègue · un / une touriste (many end in -e)'],
      ['The gender never changes', 'une personne, une victime, une vedette, une star (even for a man) · un témoin, un bébé, un individu, un génie (even for a woman)'],
      ['Animals', 'many have one gender for both sexes (une souris, une girafe, un serpent); some have pairs (chien / chienne, lion / lionne) or two words (cheval / jument)'],
    ],
    ex: [['Mon voisin est boulanger ; sa femme est boulangère aussi.', 'My neighbour is a baker; his wife is a baker too.'], ['C’est une personne très gentille.', 'He’s (or she’s) a very kind person.']],
  },
  {
    id: 'two', title: 'Same word, two genders, two meanings',
    use: 'A few nouns mean something different in the masculine and the feminine. The app treats them as separate nouns.',
    rules: [
      ['le livre / la livre', 'book / pound'],
      ['le tour / la tour', 'turn, trip / tower'],
      ['le poste / la poste', 'job, set (TV) / post office'],
      ['le mode / la mode', 'method, mood / fashion'],
      ['le voile / la voile', 'veil / sail'],
      ['le manche / la manche', 'handle / sleeve'],
      ['le mémoire / la mémoire', 'dissertation / memory'],
    ],
    ex: [['Il habite près de la tour Eiffel.', 'He lives near the Eiffel Tower.'], ['On fait un tour ?', 'Shall we go for a walk?']],
  },
  {
    id: 'other', title: 'Other useful things to know',
    use: 'A few more patterns that come up often.',
    rules: [
      ['Only plural', 'les gens (people), les vacances (holidays), les fiançailles, les environs · some change meaning: une vacance (a vacancy) / les vacances'],
      ['Aspirated h', 'some words starting with h behave as if they started with a consonant: le héros, la haine, le hasard, la honte, le haricot (no l’, no liaison). Most are silent: l’homme, l’heure, l’hôtel'],
      ['Capitals', 'people from a country take a capital, languages and adjectives don’t: un Français parle français'],
      ['Nouns after numbers', 'there’s no extra word for “of”: trois livres, mille euros, but un million de personnes'],
    ],
    ex: [['Les gens sont partis en vacances.', 'People have gone on holiday.'], ['Le héros est arrivé à l’heure.', 'The hero arrived on time.']],
  },
];
window.GUIDE.dets = [
  {
    id: 'def', title: 'Definite articles', list: 'le, la, l’, les',
    use: '“The”, for something specific. French also uses them for things in general, where English uses no article: J’aime le café (I like coffee). Also for languages, countries, body parts and habits on days of the week (le lundi = on Mondays).',
    rules: [
      ['Before a vowel or silent h', 'le / la → l’: l’école, l’homme (but le héros, with an aspirated h)'],
      ['à and de join with le and les', 'à + le = au, à + les = aux · de + le = du, de + les = des (au cinéma, le livre du professeur)'],
    ],
    ex: [['Le livre est sur la table.', 'The book is on the table.'], ['J’aime le chocolat.', 'I like chocolate.'], ['Elle a mal à la tête.', 'She has a headache.']],
  },
  {
    id: 'ind', title: 'Indefinite articles', list: 'un, une, des',
    use: '“A” or “an”, and des for more than one, where English often uses “some” or nothing at all: J’ai des amis (I have friends).',
    rules: [
      ['After a negative', 'un, une, des → de (d’): Je n’ai pas de voiture (but with être they stay: Ce n’est pas une voiture)'],
      ['Before a plural adjective', 'des → de when the adjective comes first, in careful French: de beaux jours, de grandes maisons'],
      ['Jobs after être', 'no article: Elle est médecin (but C’est un bon médecin)'],
    ],
    ex: [['Il y a un chat dans le jardin.', 'There’s a cat in the garden.'], ['Je n’ai pas de frère.', 'I don’t have a brother.']],
  },
  {
    id: 'part', title: 'Partitive articles', list: 'du, de la, de l’',
    use: '“Some” or “any”, often nothing in English, for an amount of something you don’t count: food and drink (du pain, de l’eau), materials, and things like courage or patience. Common after manger, boire, vouloir, acheter, avoir, il y a, and faire du sport.',
    rules: [
      ['Before a vowel or silent h', 'du / de la → de l’: de l’eau, de l’argent'],
      ['After a negative', '→ de (d’): Je ne bois pas de café · Il n’y a plus d’eau'],
      ['With amounts', '→ de: beaucoup de pain, un verre d’eau, un peu de sel, assez d’argent'],
      ['Likes and dislikes', 'aimer, adorer, préférer, détester talk about things in general, so they take le / la: J’aime le pain (but Je mange du pain)'],
    ],
    ex: [['Tu veux du café ?', 'Do you want some coffee?'], ['Il faut de la patience.', 'It takes patience.'], ['Je ne mange pas de viande.', 'I don’t eat meat.']],
  },
  {
    id: 'pos', title: 'Possessive determiners', list: 'mon, ma, mes · ton, ta, tes · son, sa, ses · notre, nos · votre, vos · leur, leurs',
    use: '“My, your, his, her, our, their.” The determiner agrees with the thing owned, not the owner: son père and sa mère can both mean his or her father and mother.',
    rules: [
      ['je', 'mon (m.) · ma (f.) · mes (pl.)'], ['tu', 'ton · ta · tes'], ['il, elle, on', 'son · sa · ses'],
      ['nous', 'notre · nos'], ['vous', 'votre · vos'], ['ils, elles', 'leur · leurs'],
      ['Before a vowel or silent h', 'ma, ta, sa → mon, ton, son even for feminine nouns: mon amie, son école, ton histoire'],
      ['Body parts', 'with a reflexive verb, use le / la / les instead: Je me lave les mains (not mes mains)'],
    ],
    ex: [['Sa voiture est rouge.', 'His (or her) car is red.'], ['Mon amie Claire arrive demain.', 'My friend Claire arrives tomorrow.']],
  },
  {
    id: 'dem', title: 'Demonstrative determiners', list: 'ce, cet, cette, ces',
    use: '“This, that, these, those.” French uses the same word for “this” and “that”.',
    rules: [
      ['ce', 'masculine: ce livre'], ['cet', 'masculine before a vowel or silent h: cet homme, cet arbre (but ce héros)'],
      ['cette', 'feminine: cette maison'], ['ces', 'plural: ces livres, ces maisons'],
      ['-ci and -là', 'add them to the noun to make the difference: ce livre-ci (this book) / ce livre-là (that book)'],
    ],
    ex: [['Cet hôtel est trop cher.', 'This hotel is too expensive.'], ['Tu préfères cette robe-ci ou cette robe-là ?', 'Do you prefer this dress or that one?']],
  },
];

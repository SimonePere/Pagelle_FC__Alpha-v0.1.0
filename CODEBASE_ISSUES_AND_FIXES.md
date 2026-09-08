# 🔧 Incongruenze del codebase — cosa non va, perché, come sistemarlo

> **Data**: 8 settembre 2026
> **Origine**: emerse leggendo e testando il codice durante l'implementazione della modalità demo
> **Stato**: nessuna di queste è stata corretta — sono tutte fuori dallo scope della demo
> **Documento collegato**: [DEMO_MODE_IMPLEMENTATION_PLAN.md](DEMO_MODE_IMPLEMENTATION_PLAN.md)

---

## Come leggere questo documento

Ogni voce risponde a quattro domande: **dove** sta il problema, **cosa** succede, **perché** è un problema, **come** si sistema. Dove ho potuto verificare sul database di test, riporto la prova con i numeri reali.

Non tutto qui dentro è urgente. Anzi: **la maggior parte di queste cose non sta rompendo nulla oggi**. Sono trappole che scatteranno quando qualcuno toccherà quel codice, e il valore di scriverle è che chi ci arriverà — tu fra sei mesi, o io in una sessione futura — non ci perda un pomeriggio.

### Legenda

| Simbolo | Significato |
|---|---|
| 🔴 **Attivo** | Sta producendo un comportamento sbagliato adesso |
| 🟠 **Latente** | Il codice è sbagliato ma non viene raggiunto: scatterà appena qualcuno lo userà |
| 🟡 **Fragile** | Funziona, ma per fortuna o per una difesa messa altrove |
| 🔵 **Pulizia** | Nessun effetto, solo rumore che confonde chi legge |
| 📚 **Knowledge** | Non un bug: una trappola del framework da conoscere prima di ricascarci |

---

# Parte 1 — Le classifiche

Tre problemi distinti che vivono nello stesso file e si mascherano a vicenda. Vale la pena leggerli in ordine, perché il primo spiega perché il secondo non si è mai notato.

## 1.1 🟠 Due campi che non esistono da nessuna parte

**Dove**: [`server/src/services/LeaderboardService.js`](server/src/services/LeaderboardService.js) — righe 43, 146, 328, 332, 338, 342, 372, 375, 391

**Cosa**: il service filtra e ordina su `playerCardAverage` e `formRating`. Lo schema [`PlayerLeaderboardStats.js`](server/src/models/PlayerLeaderboardStats.js) definisce invece `playerCardTOT` e `recentForm`.

**La prova**, sul database di test:

```
Quanti documenti hanno playerCardAverage: 0
Quanti documenti hanno formRating:        0
Quanti documenti hanno playerCardTOT:    17
Quanti documenti hanno recentForm:       17
Totale documenti:                        17
```

Zero su diciassette. E non è un caso da sanare con un backfill: lo schema è in modalità **`strict`**, quindi Mongoose scarta silenziosamente qualsiasi campo non dichiarato al momento della scrittura. Quei due nomi non esistono e non possono esistere.

**Perché non se n'è mai accorto nessuno**: il percorso che il client usa davvero ha un fallback che salva la situazione — è il §1.2 qui sotto.

**Come sistemarlo**: rinominare i riferimenti nel service. `playerCardAverage` → `playerCardTOT`, `formRating` → una media calcolata da `recentForm` (che è un array di numeri, non uno scalare: serve `$avg` in aggregazione o il virtual `recentFormAverage` già definito a [riga 143](server/src/models/PlayerLeaderboardStats.js#L143) del modello).

Attenzione a non fare l'opposto — aggiungere i due campi allo schema — a meno che non si voglia davvero una media distinta dal TOT. Oggi nessun codice li calcola, quindi sarebbero sempre nulli.

## 1.2 🟡 Il fallback che nasconde il problema

**Dove**: [`LeaderboardService.js:324-345`](server/src/services/LeaderboardService.js#L324-L345), dentro `buildLeaderboardQuery`

**Cosa**: il filtro delle classifiche `playercard` e `form` è scritto con un `$or` che tenta prima il campo inesistente e poi quello vero:

```js
playercard: {
  filter: {
    ...baseFilter,
    $or: [
      { playerCardAverage: { $ne: null, $gt: 0 } },   // non matcha mai
      { playerCardTOT:     { $ne: null, $gt: 0 } }    // matcha sempre
    ]
  },
  sort: { playerCardAverage: -1, playerCardTOT: -1 }   // il 1° criterio è inerte
}
```

**Perché è un problema anche se funziona**: il risultato è corretto per il motivo sbagliato. Chi legge questo codice non ha modo di capire che il primo ramo è morto, e chiunque "semplifichi" il `$or` tenendo il ramo sbagliato romperebbe la classifica senza che nessun test lo segnali.

Lo stesso vale per il `sort`: ordina di fatto per `playerCardTOT`, perché il primo criterio è un campo assente e MongoDB tratta tutti i documenti come pari. Il comportamento è sensato per caso, non per scelta.

**Verificato**: `getLeaderboard(teamId, 'playercard', 10)` restituisce **10 risultati corretti**. La classifica che vedi nell'app funziona.

**Come sistemarlo**: dopo aver applicato il §1.1, il `$or` diventa superfluo e va collassato in un filtro semplice su `playerCardTOT`.

## 1.3 🟠 Aggregazioni che non trovano mai nulla

**Dove**:
- [`LeaderboardService.js:365-382`](server/src/services/LeaderboardService.js#L365-L382) — `getPlayercardLeaderboard()`
- [`LeaderboardService.js:384-400`](server/src/services/LeaderboardService.js#L384-L400) — `getFormLeaderboard()`
- [`LeaderboardService.js:237-300`](server/src/services/LeaderboardService.js#L237-L300) — `getAllLeaderboards()`

**Cosa**: queste tre funzioni usano `aggregate` con un `$match` su `teamId` passato come **stringa**, mentre nel modello `teamId` è un **`ObjectId`**.

**Perché è diverso dal resto del codice che funziona**: `find()` di Mongoose applica il *casting* automatico e converte la stringa in `ObjectId` prima di interrogare. **`aggregate` no**: la pipeline viene passata a MongoDB così com'è, e una stringa non è mai uguale a un `ObjectId`. Il `$match` non trova nulla, e non c'è alcun errore — solo un array vuoto.

**La prova**, misurata sul team demo (12 giocatori, tutti con dati validi):

| Funzione | Risultati |
|---|---|
| `getLeaderboard('rating')` — usa `find()` | **10** ✅ |
| `getLeaderboard('playercard')` — usa `find()` | **10** ✅ |
| `getPlayercardLeaderboard()` — usa `aggregate` | **0** ❌ |
| `getFormLeaderboard()` — usa `aggregate` | **0** ❌ |
| `getAllLeaderboards()` → rating, goals, assists, playercard, form | **tutte 0** ❌ |

Nota che in `getAllLeaderboards` sono vuote **anche `rating`, `goals` e `assists`**, che non c'entrano nulla con i campi sbagliati del §1.1: lì è solo il casting.

**Il pattern corretto esiste già nel codebase**, a [`AuthService.js:503`](server/src/services/AuthService.js#L503):

```js
this.playerStatsRepository.aggregate([
    { $match: { teamId: team._id, isActive: true } },   // ✅ ObjectId, non stringa
```

**Come sistemarlo**: convertire esplicitamente prima del `$match`.

```js
const teamObjectId = new mongoose.Types.ObjectId(teamId);
// ... { $match: { teamId: teamObjectId, isActive: true } }
```

Da fare in tutti e tre i punti. E in generale: **ogni volta che si scrive un `$match` su un `ObjectId` partendo da un parametro HTTP, va convertito a mano.**

## 1.4 🔵 Un endpoint che risponde 200 con dati vuoti

**Dove**: [`server/src/routes/leaderboards.js:78`](server/src/routes/leaderboards.js#L78) → `GET /api/v1/leaderboards/:teamId/all`

**Cosa**: la rotta è esposta e raggiungibile, ma il metodo che la serve è dichiarato inutilizzato dal suo stesso autore, a [`LeaderboardService.js:231`](server/src/services/LeaderboardService.js#L231):

> `IMPORTANTE: AL MOMENTO QUESTO METODO NON E' UTILIZZATO, viene utilizzato invece getLeaderboard con tipo (es) 'playercard' e 'goalPerMatch'`

Il client infatti chiama solo le classifiche singole ([`useHomeDashboard.ts:144`](client/src/hooks/useHomeDashboard.ts#L144)).

**Perché è un problema**: l'endpoint risponde `200` con tutte le liste vuote (§1.3). Chi domani volesse usarlo — per una nuova schermata, per un'integrazione — otterrebbe zero risultati **senza alcun errore, senza alcun log**. Sembrerebbe semplicemente che non ci siano dati.

**Come sistemarlo**: la scelta più onesta è **rimuovere** rotta, controller e metodo. Il codice vivo fa già il lavoro e nessuno li usa. Se invece si vuole tenerli, vanno prima corretti secondo §1.1 e §1.3 — altrimenti si sta solo conservando una trappola.

## 1.5 🔵 Due residui inerti

**Dove**:
- [`LeaderboardService.js:43`](server/src/services/LeaderboardService.js#L43) — `STANDARD_FIELDS` include `playerCardAverage` nella `select`. Innocuo: selezionare un campo assente non fa nulla.
- [`LeaderboardService.js:146`](server/src/services/LeaderboardService.js#L146) — un tiebreaker `return (b.playerCardAverage || 0) - (a.playerCardAverage || 0);` che calcola sempre `0 - 0 = 0`, quindi non ordina niente.

**Come sistemarlo**: si risolvono da soli applicando il §1.1.

---

# Parte 2 — Modelli e schema

## 2.1 🟡 `Match.teamId` è una stringa mentre tutto il resto usa ObjectId

**Dove**: [`server/src/models/Match.js:11-15`](server/src/models/Match.js#L11-L15)

```js
teamId: {
  type: String,   // "Mantenuto come string per compatibilità frontend"
  required: true,
  trim: true
},
```

Ogni altra collection (`VotingSession`, `VoteResult`, `Award`, `News`, `GoldenTot`, `PlayerSeasonStats`, `PlayerLeaderboardStats`) usa `ObjectId`.

**Perché è un problema**: obbliga a ricordarsi, in ogni punto che tocca `Match`, che lì il tipo è diverso. Dimenticarsene produce query che non matchano nulla **in silenzio**. Il codice difensivo che già esiste — `String(tid) === String(match.teamId)` a [`MatchService.js:947`](server/src/services/MatchService.js#L947) — è la prova che la cosa ha già morso qualcuno.

**Perché non l'ho migrato durante la demo**: sarebbe stato molto più invasivo di quanto sembri.

- Tre validazioni `typeof teamId !== 'string'` rifiuterebbero un `ObjectId`: [`MatchService.js:600`](server/src/services/MatchService.js#L600), [`LeaderboardService.js:428`](server/src/services/LeaderboardService.js#L428), [`TeamService.js:419`](server/src/services/TeamService.js#L419)
- Oltre **37 punti** del codice interrogano `Match` passando per `teamId`
- Tutti i `Match` già in produzione richiederebbero un backfill

**Come sistemarlo**, quando si deciderà di farlo: è un lavoro a sé, con un piano suo. L'ordine sensato è (1) correggere le tre validazioni perché accettino entrambi i tipi, (2) backfill dei documenti esistenti con `$toObjectId`, (3) cambio dello schema, (4) verifica dei 37 punti. Il team demo è un ottimo banco di prova: è isolato e ricostruibile con un comando.

## 2.2 🟡 La validazione email rifiuta metà dei domini esistenti

**Dove**: [`server/src/models/User.js:28`](server/src/models/User.js#L28)

```js
return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
```

**Cosa**: il TLD è vincolato a **2 o 3 caratteri**. Vengono rifiutate email perfettamente valide su `.info`, `.online`, `.store`, `.email`, `.agency`, `.tech`, `.local`…

**Come l'ho scoperto**: il seed della demo usava `@demo.pagellefc.local` e la creazione utenti falliva con *"Please enter a valid email"*. Ho ripiegato su `.app` (3 caratteri).

**Perché è un problema reale, non teorico**: un utente con `mario@studio.design` non riesce a registrarsi, e il messaggio che riceve dice solo che l'email non è valida — mentre la sua email è validissima.

**Come sistemarlo**: allargare il TLD ad almeno `{2,}`:

```js
return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(v);
```

La validazione rigorosa delle email è comunque un problema mal posto: l'unica verifica che conta davvero è mandare una mail di conferma. Meglio una regex permissiva che una che respinge utenti veri.

## 2.3 📚 Gli hook post-save creano documenti che il chiamante non vede

**Dove**: [`VoteResult.js:347`](server/src/models/VoteResult.js#L347) e [`PlayerCardResult.js:738`](server/src/models/PlayerCardResult.js#L738)

**Cosa**: entrambi hanno un hook `post('save')` che ricalcola e scrive su `PlayerLeaderboardStats`. Esiste anche un hook sulla cancellazione, che ricalcola quando i `VoteResult` vengono rimossi.

**Perché è knowledge preziosa**: chi crea un `VoteResult` sta creando, senza saperlo, **anche una riga di classifica**. È un ottimo design — i dati derivati restano sempre coerenti — ma ha una conseguenza non ovvia.

**Come è morso durante la demo**: il seed marca ogni documento con `isDemo: true` perché le cancellazioni siano sicure. Gli hook però non sanno nulla della demo e scrivono **senza quel flag**. Al primo giro sono rimaste **12 righe orfane**, invisibili alla pulizia successiva, destinate ad accumularsi a ogni ri-seed. Le ha intercettate il controllo di coerenza di fine seed.

**La regola da ricordare**: *qualunque flag o metadato custom aggiunto a un documento non si propaga ai documenti che gli hook generano per conto suo.* Se serve, va applicato a valle con un `updateMany` — che è ciò che fa `markDerivedDocsAsDemo()` in [`seedDemoData.js`](server/src/utils/seedDemoData.js).

## 2.4 📚 `deleteMany` con un valore `undefined` cancella tutto

**Dove**: ovunque si costruisca un filtro a partire da una variabile che potrebbe non essere valorizzata.

**Cosa**: Mongoose **rimuove le chiavi con valore `undefined`** dai filtri. Quindi:

```js
await Match.deleteMany({ teamId: demoTeamId });   // se demoTeamId è undefined…
```

non cancella zero documenti come ci si aspetterebbe. Diventa `deleteMany({})` e **svuota l'intera collection**.

**Perché è la trappola più pericolosa di tutte**: il codice sembra corretto, non emette warning, e il danno è totale e irreversibile.

**Come difendersi**, il pattern adottato in [`seedDemoData.js`](server/src/utils/seedDemoData.js):

```js
async function safeDelete(Model, filter, label) {
    const keys = Object.keys(filter || {});
    if (keys.length === 0) throw new Error(`ABORT ${label}: filtro vuoto`);
    for (const k of keys) {
        if (filter[k] === undefined || filter[k] === null) {
            throw new Error(`ABORT ${label}: filtro."${k}" è ${filter[k]}`);
        }
    }
    // ...
}
```

**Raccomandazione**: qualunque script che cancelli dati in blocco dovrebbe passare da una guardia così, più un dry-run di default.

## 2.5 📚 `{ campo: false }` non trova i documenti creati prima di quel campo

**Dove**: già documentato nel codebase, a [`generatePeriodicAwards.js:253-290`](server/src/jobs/generatePeriodicAwards.js#L253-L290)

**Cosa**: quando si aggiunge un campo booleano a uno schema, i documenti già esistenti **non lo hanno affatto** — non lo hanno a `false`. Un filtro `{ awardsEnabled: false }` non li trova. Il commento nel codice racconta un incidente reale in cui il valore era stato salvato come **stringa** `"true"` e il filtro booleano non matchava nulla.

**La regola**: per escludere, usare sempre `{ campo: { $ne: true } }` e mai `{ campo: false }`. La prima forma copre il campo assente, il `false` e qualunque valore anomalo. È la convenzione seguita in tutte le esclusioni della modalità demo.

---

# Parte 3 — Altro

## 3.1 🔴 `NewsRepository.getTeamAggregateStats` restituisce zero

**Dove**: [`server/src/repositories/NewsRepository.js:189-200`](server/src/repositories/NewsRepository.js#L189-L200)

**Cosa**: stessa causa del §1.3 — `aggregate` con `$match: { teamId: teamId }` senza casting.

**La prova**, sullo stesso team con 12 giocatori:

```
getTeamAggregateStats(teamId come STRINGA)  -> {"totalPlayers":0,"averageTeamRating":0}
getTeamAggregateStats(teamId come ObjectId) -> {"totalPlayers":12,"averageTeamRating":7.1675}
```

**Perché lo classifico come attivo e non latente**: la funzione è chiamata da [`NewsService.js:469`](server/src/services/NewsService.js#L469) dentro la generazione delle news di classifica. Se il chiamante passa una stringa — cosa probabile, visto che i `teamId` arrivano dai parametri HTTP — le news vengono generate con `totalPlayers: 0` e media `0`, quindi con contenuti sbagliati o soppressi.

**Da verificare prima di correggere**: quale tipo arriva effettivamente a `NewsService` lungo la catena di chiamata. Se fosse già un `ObjectId`, il difetto scenderebbe a latente. La correzione è comunque la stessa.

**Come sistemarlo**: convertire nel repository, che è il punto più difensivo — così funziona con entrambi i tipi in ingresso.

```js
const tid = typeof teamId === 'string' ? new mongoose.Types.ObjectId(teamId) : teamId;
```

## 3.2 🔴 `npm run seed` punta a un file che non esiste

**Dove**: [`server/package.json`](server/package.json) — `"seed": "node src/utils/seedData.js"` e `"seed:test"`

**Cosa**: `src/utils/seedData.js` **non esiste**. Il comando fallisce con `MODULE_NOT_FOUND`.

**Perché conta**: è documentato nel [README.md:174](README.md#L174) come passo dell'installazione (*"Popola il database con dati di test"*). Chiunque segua il readme incontra un errore al primo tentativo.

**Come sistemarlo**: rimuovere i due script, oppure farli puntare a un seed reale. Da settembre 2026 esiste `npm run seed:demo`, che però popola solo la squadra dimostrativa — è una cosa diversa da un seed di sviluppo generico. Andrebbe anche aggiornato il README.

## 3.3 🟠 `useAppData`: due funzioni leggono il team sbagliato

**Dove**: [`client/src/hooks/useAppData.ts:159-180`](client/src/hooks/useAppData.ts#L159-L180)

**Cosa**: nello stesso hook convivono due modi diversi di risolvere il team attivo.

```js
const loadNewsByCategory = (category) => {
    const teamId = activeTeamId;          // ✅ rispetta la scelta dell'utente
    // ...
};

const loadNewsByPriority = (priority) => {
    const teamId = user.teams[0].id;      // ❌ sempre il primo team
};

const loadUrgentNews = () => {
    const teamId = user.teams[0].id;      // ❌ sempre il primo team
};
```

**Perché è un problema**: per un utente con un solo team le due forme coincidono e il bug è invisibile. Per un utente con **più team** che ne ha selezionato uno diverso dal primo, queste due funzioni caricano le news del team sbagliato. L'app supporta esplicitamente i team multipli ([`useActiveTeamId`](client/src/hooks/useActiveTeamId.ts) esiste per questo), quindi è un caso reale, non ipotetico.

**Come sistemarlo**: usare `activeTeamId` in tutte e tre, con lo stesso controllo di esistenza già presente nella prima.

## 3.4 🟡 `setActiveTeamId` non fa cambiare team

**Dove**: [`client/src/hooks/useActiveTeamId.ts:34-38`](client/src/hooks/useActiveTeamId.ts#L34-L38)

```js
const setActiveTeamId = useCallback((teamId: string) => {
    localStorage.setItem(STORAGE_KEY, teamId);
    // Force re-render tramite reload dati — il consumer chiamerà window.location.reload()
    // oppure ri-dispatch dei fetch
}, []);
```

**Cosa**: la funzione scrive in `localStorage` ma non provoca alcun re-render. Il commento delega la responsabilità al chiamante, in due modi alternativi e non verificabili.

**Perché è fragile**: chi usa l'hook non ha modo di sapere che deve fare qualcosa in più, e se se ne dimentica l'interfaccia resta sul team precedente pur avendo salvato il nuovo. Il valore corretto ricomparirà solo al prossimo refresh, il che è il tipo di bug che si fatica a riprodurre.

**Come sistemarlo**: portare `activeTeamId` in Redux (dove vive già lo stato di auth) invece che in `localStorage` letto direttamente. Il cambio team diventerebbe un dispatch, e tutti i componenti si aggiornerebbero da sé. In alternativa, minimale: esporre l'aggiornamento tramite uno stato React nell'hook.

## 3.5 🔵 Import inutilizzato in `App.tsx`

**Dove**: [`client/src/App.tsx:20`](client/src/App.tsx#L20)

```js
const TestVote = lazy(() => import("./pages/TestPage.tsx"));
```

La rotta che lo usa è commentata a [riga 286-295](client/src/App.tsx#L286-L295). L'import resta, quindi il bundler continua a produrre un chunk per una pagina irraggiungibile.

**Come sistemarlo**: rimuovere import e blocco commentato. Se la pagina serve ancora come banco di prova, il posto giusto è un branch, non un commento in `App.tsx`.

---

# Riepilogo, in ordine di quanto conviene affrontarli

| # | Problema | Tipo | Sforzo | Perché farlo (o non farlo) ora |
|---|---|---|---|---|
| **3.2** | `npm run seed` rotto | 🔴 | Minuti | È nel README: chiunque segua la guida sbatte contro un errore |
| **3.1** | News di classifica a zero | 🔴 | ~1h | Va prima verificato il tipo lungo la catena di chiamata |
| **3.3** | `useAppData` legge il team sbagliato | 🟠 | Minuti | Tre righe, e il bug colpisce chi ha più team |
| **2.2** | Email con TLD lunghi rifiutate | 🟡 | Minuti | Un carattere di regex; blocca registrazioni legittime |
| **1.1 + 1.3 + 1.4** | Le classifiche | 🟠 | ~2h | Vanno insieme. Valutare prima se *rimuovere* invece di correggere |
| **3.5** | Import morto | 🔵 | Minuti | Da fare quando si passa di lì |
| **3.4** | `setActiveTeamId` inefficace | 🟡 | ~2h | Merita di aspettare un refactoring dello stato del team |
| **2.1** | `Match.teamId` stringa | 🟡 | ~1 giorno | Debito reale, ma serve un piano suo con backfill |

Le voci **📚** della Parte 2 (§2.3, §2.4, §2.5) non sono da correggere: sono trappole del framework da tenere a mente quando si scrive codice nuovo.

---

## Nota sul metodo

Tutto ciò che è marcato "verificato" o "la prova" è stato misurato sul database `Pagelle-FC-test` l'8 settembre 2026, con il team dimostrativo appena popolato (12 giocatori, 25 partite, dati completi). Le voci senza prova sono lette dal codice e segnalate come tali — dove ho un dubbio, l'ho scritto invece di affermare.

Un caso merita una precisazione, perché a prima vista sembrava peggio di com'è: le classifiche **che l'utente vede nell'app funzionano correttamente**. Il difetto dei campi inesistenti (§1.1) è mascherato da un fallback (§1.2), e le funzioni davvero rotte (§1.3) non sono raggiunte dal client. È un bug latente, non un malfunzionamento in corso.

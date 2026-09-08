# 🎬 Modalità Demo — Piano di Implementazione

> **Stato**: ✅ **FASE A COMPLETATA E VERIFICATA** su database di test — 21/21 test end-to-end passati
> **Prossimo passo**: Fase B (client)
> **Data**: 8 settembre 2026 (revisione 3)
> **Versione app**: Alpha v0.1.0
> **Obiettivo**: permettere a chiunque, senza registrarsi, di esplorare Pagelle FC e provarne le funzioni principali

---

## 0. Stato dell'implementazione

| Fase | Stato | Note |
|---|---|---|
| **A.1** Flag `isDemo` sui modelli | ✅ Fatto | 15 modelli, verificati caricando Mongoose |
| **A.2** Script di seed | ✅ Eseguito su DB test | 503 documenti demo creati, idempotenza confermata su 3 esecuzioni |
| **A.3** Endpoint `demo-login` | ✅ Fatto | Service + controller + rotta |
| **A.4** Middleware blocco scritture | ✅ Fatto | 19 test unitari + 10 end-to-end, tutti passati |
| **A.5** `requireScope` | ✅ Fatto | Messaggio neutro + **15 rotte di lettura** abilitate allo scope demo |
| **A.6** Esclusione da job e query | ✅ Fatto | 3 cron + God Dashboard + lista team pubblici |
| **B** Client | ⬜ Da fare | |
| **C** Tour guidato | ⬜ Da fare | |

**Esito della verifica sul DB di test** (`Pagelle-FC-test`, che conteneva già 2 team reali):

| Verifica | Esito |
|---|---|
| Login demo, token, scope, TTL 24h | ✅ |
| Le 9 sezioni del perimetro rispondono `200` | ✅ |
| Le 9 scritture provate rispondono `403 DEMO_READ_ONLY` | ✅ |
| Registrazione e login **non** bloccati (conversione possibile) | ✅ |
| Il cron non chiude la votazione demo | ✅ (ha chiuso una sessione reale scaduta, come doveva) |
| **Nessun dato reale toccato**, conteggi identici prima e dopo | ✅ |
| Ri-seed idempotente, nessun documento orfano | ✅ |

**File nuovi**: `server/src/middleware/blockDemoWrites.js`, `server/src/utils/seedDemoData.js`
**Script npm**: `npm run seed:demo` (dry-run) · `npm run seed:demo:confirm` (esegue)
**Branch**: `feature/demo-mode`

### Scostamenti dal piano emersi durante l'implementazione

**1. Il middleware ha una whitelist, che il piano escludeva.**
Il piano diceva "nessuna whitelist". Ma `POST /auth/register` è una scrittura,
e un visitatore che clicca "Crea il tuo team" con il token demo ancora in
localStorage riceveva `403` proprio nel momento della conversione — cioè lo scopo
di tutta la demo. Le tre rotte di sessione (`login`, `register`, `demo-login`) sono
quindi esentate. Il confronto è sul path esatto, senza query string, ed è coperto
da test apposta contro l'aggiramento (`/auth/register-x` viene bloccato).

**2. `LeaderboardService` cerca due campi che non esistono.**
Il servizio interroga `playerCardAverage` e `formRating`, ma lo schema
`PlayerLeaderboardStats` definisce `playerCardTOT` e `recentForm`. È un bug
**preesistente**, non introdotto dalla demo: le classifiche "player card" e
"forma" restituiscono verosimilmente sempre vuoto, per tutti i team. Il seed
scrive i campi veri dello schema, così i dati demo si comportano esattamente come
quelli di un team reale. Da sistemare a parte, fuori dallo scope della demo.

**3. Gli hook post-save generano documenti senza il flag demo.** ⚠️ *Il caso più istruttivo.*
`VoteResult` e `PlayerCardResult` hanno hook `post('save')` che ricalcolano
`PlayerLeaderboardStats`. Ottima notizia — i numeri risultano identici a quelli di
un team vero — ma quegli hook non conoscono la demo e **non propagano `isDemo`**.
Al primo tentativo di seed sono rimaste **12 righe orfane**, invisibili alla
pulizia successiva, che si sarebbero accumulate a ogni ri-seed. È esattamente lo
scenario previsto al §3.9, verificatosi davvero: il controllo di coerenza l'ha
intercettato subito. Risolto marcando i derivati **prima** di cancellare e **dopo**
averli creati.

**4. Le rotte di lettura non conoscevano lo scope demo.**
`requireScope('full', 'guest')` respingeva il visitatore demo su partite, team,
player card e sessioni di voto: la demo non avrebbe letto nulla. Abilitate **15
rotte di lettura**. Le scritture non sono state toccate: `blockDemoWrites` le
intercetta prima del router e risponde con il messaggio corretto.

**5. Due dettagli minori di schema.**
La regex email di `User` accetta solo TLD di 2-3 caratteri (niente `.local`), e
`eligibleVoters` è un array di `ObjectId`, non di oggetti `{userId}`.

**6. Il `LeaderboardService` era già a posto sul fronte demo.**
Il piano temeva query cross-team nelle sue tre aggregazioni: in realtà filtrano
già tutte su `teamId`. Nessuna modifica necessaria. In compenso sono emersi due
punti che il piano non aveva previsto: `TeamService.getAllPublicTeams` (dove il
team demo sarebbe comparso tra i team pubblici) e l'intero `GodRepository`, le cui
~20 metriche sono globali e avrebbero contato i dati demo nei KPI reali.

---

## 1. Obiettivo e principi guida

Chi arriva su Pagelle FC oggi trova un muro: `/login`. Non può vedere nulla prima di creare un account e un team. La modalità demo abbatte quel muro.

**Cosa deve ottenere il visitatore in 60 secondi**: capire che l'app serve a votare i compagni dopo la partita, vedere carte giocatore in stile FIFA con numeri veri, provare a trascinare uno slider di voto, e vedere una card celebrativa di un Pallone d'Oro.

**Cosa NON deve succedere mai**: che un visitatore demo scriva qualcosa nel database, veda dati di team reali, o inquini classifiche e statistiche degli utenti veri.

### I quattro principi

1. **Zero fixtures da mantenere** — i dati vengono da un team reale nel database, quindi tutte le pagine, i calcoli derivati, i grafici e le award card renderizzate da Puppeteer funzionano davvero. Nessun mock da riallineare a ogni modifica delle API.
2. **Sola lettura garantita dal server** — il blocco delle scritture non è una cortesia del client, è un middleware che risponde `403`. Anche chi apre la console del browser non riesce a scrivere.
3. **Ma l'esperienza resta interattiva** — il client intercetta le scritture *prima* che partano, aggiorna la UI in modo ottimistico e mostra un feedback. Il visitatore vota davvero, vede il risultato, e solo un toast discreto gli ricorda che è una demo.
4. **La demo è codice di produzione** — nessuna copia parallela dell'app, nessun ramo speciale. Il visitatore vede esattamente il software che gira per gli utenti veri.

---

## 2. Decisioni prese

| Aspetto | Scelta | Note |
|---|---|---|
| **Origine dati** | Team demo reale nel DB di produzione | Escluso da ogni query globale |
| **Sicurezza dati** | `isDemo: true` propagato su tutti i 15 modelli | Rende le cancellazioni del seed incapaci di toccare dati reali (§3.9) |
| **Autenticazione** | JWT con `scope: 'demo'` | Ricalca il pattern `guest` già esistente e collaudato |
| **Scritture** | Bloccate a livello server, simulate lato client | Doppia barriera: middleware + intercettore |
| **Ingresso** | Bottone su `/login` + route pubblica `/demo` | `/demo` è condivisibile su social, QR, README |
| **Accompagnamento** | Tour guidato a step + barra demo persistente | Il tour naviga davvero tra le pagine |
| **Contenuto** | 2 stagioni, 12 giocatori, ~25 partite | Con stagione precedente chiusa → award e Golden TOT visibili |
| **Sessione** | Token 24h in `localStorage`, reset manuale | Resiste al refresh, si azzera dalla barra demo |
| **Lingua** | Solo italiano | — |
| **Analytics** | Fuori scope per ora | Rivalutabile in un secondo momento |
| **God Dashboard** | Fuori dalla demo | Resta console riservata al creatore |

### Perimetro funzionale

| Sezione | In demo | Comportamento |
|---|---|---|
| Home / Dashboard | ✅ | Completa, con news e prossima partita |
| Storico partite | ✅ | ~25 partite navigabili su 2 stagioni |
| Player Cards | ✅ | 12 carte con radar chart, una con Golden TOT `+3` |
| Statistiche | ✅ | Grafici, trend, confronti, selettore stagione |
| Team | ✅ | Rosa completa, in sola lettura |
| Votazione | ✅ | Sessione attiva permanente, voto simulato |
| Awards | ✅ | Bacheca, card, reveal con confetti |
| Creazione partita | ✅ | Wizard completo fino alla generazione del link invito, che è **simulato** |
| Profilo | ⚠️ | Visibile ma non modificabile |
| God Dashboard | ❌ | Rotta bloccata lato client e server |

---

## 3. Vincoli emersi dall'analisi del codice

Questi sono i punti scoperti leggendo il codice esistente. **Sono la parte più importante del piano**: ognuno di essi, se ignorato, produce un bug in produzione.

### 3.1 🔴 Il calendario delle stagioni è globale, i dati dentro sono di ogni team

[`Season.js:5-19`](server/src/models/Season.js#L5-L19) — le stagioni funzionano **come i mesi dell'anno**: sono un calendario unico e uguale per tutti, contiguo, dal 1 luglio al 1 luglio, con una sola stagione `active` alla volta.

Su quel calendario condiviso, **ogni team vede soltanto le proprie partite, i propri voti e i propri trofei**. La collection `Season` è pura anagrafica: i record transazionali (`Match`, `VotingSession`, `VoteResult`, `Award`) si limitano a denormalizzare la stringa `seasonId`, senza referenziare il documento.

**Conseguenza pratica**: il seed demo **non crea nuove stagioni** — sarebbe come inventare un tredicesimo mese, e lo vedrebbero anche gli utenti veri. Data invece le partite del team demo dentro gli intervalli del calendario esistente:

- **`2025-26`** (archiviata) → ~15 partite del team demo, con Pallone d'Oro e Scarpa d'Oro di fine stagione
- **`2026-27`** (attiva) → ~10 partite del team demo, più la sessione di voto aperta

Il team demo avrà quindi il suo storico su due stagioni, esattamente come ce l'ha un team reale, senza che nulla del calendario condiviso venga alterato.

Prima del seed va verificato che entrambe le stagioni esistano in `Season`. Se mancano, si usa lo script ufficiale già presente [`scripts/seed-seasons.js`](server/scripts/seed-seasons.js) — perché quella è anagrafica che serve a tutti, non solo alla demo.

### 3.2 🔴 Il cron chiuderebbe la sessione di voto demo

[`closeExpiredVotingSessions.js:59-62`](server/src/jobs/closeExpiredVotingSessions.js#L59-L62) — ogni 5 minuti il job cerca ogni `VotingSession` con `status: 'active'` e `deadline` passata, e la chiude d'ufficio.

**Conseguenza**: la sessione di voto della demo si chiuderebbe da sola, e la demo perderebbe la sua funzione più importante. Servono **due protezioni insieme**:
1. La sessione demo nasce con `deadline: null` (la query esclude già i null grazie a `$exists: true, $ne: null`)
2. Il job esclude comunque in modo esplicito le sessioni dei team demo — cintura e bretelle, come già fa il resto del codebase

> 📌 Per chiarezza: **il cron non viene spento.** Continua a girare normalmente per tutti i team reali, che devono assolutamente conservare la chiusura automatica delle votazioni scadute. È solo il team demo a essere escluso dalla sua scansione. Lo stesso vale per tutti gli altri job del §3.3.

### 3.3 🟠 I cron degli award opererebbero sul team demo

[`generatePeriodicAwards.js:57`](server/src/jobs/generatePeriodicAwards.js#L57) e [`seasonRolloverJob.js:108`](server/src/jobs/seasonRolloverJob.js#L108) — il primo cerca `Team.find({ awardsEnabled: true })`, il secondo addirittura `Team.find({})`.

**Conseguenza**: il team demo riceverebbe nuovi award generati dal cron, che ne altererebbero il contenuto curato nel tempo. Tutte le `Team.find` dei job vanno filtrate con `isDemo: { $ne: true }`.

> ⚠️ Nota storica utile: il commento a [`generatePeriodicAwards.js:253-290`](server/src/jobs/generatePeriodicAwards.js#L253-L290) documenta un bug già capitato, in cui `awardsEnabled` era salvato come **stringa** `"true"` e il filtro booleano non matchava nulla. Per `isDemo` usiamo `{ $ne: true }` proprio per non ripetere quella classe di errore: esclude solo chi è esplicitamente demo e ignora ogni altra rappresentazione.

### 3.4 🟠 `Team.name` è unico e ha un limite di 50 caratteri

[`Team.js:59-66`](server/src/models/Team.js#L59-L66) — il nome del team è `unique`.

**Conseguenza**: `"I Bomber (Demo)"` va bene (15 caratteri), ma il seed deve essere **idempotente**: se rilanciato, aggiorna il team esistente invece di fallire su chiave duplicata. Lo stesso vale per `inviteCode`, anch'esso unico.

### 3.5 🟠 Gli utenti demo non hanno email né password reali

[`User.js:11-80`](server/src/models/User.js#L11-L80) — `email`, `password` e `birthdate` sono obbligatori tranne quando `isGuest: true`.

**Conseguenza**: i 12 giocatori demo devono essere creati con email interne segnaposto (es. `simo@demo.pagellefc.local`) e password casuali lunghe mai comunicate, **oppure** riusando la logica `isGuest`. La prima strada è preferibile: mantiene i giocatori demo indistinguibili da utenti veri nella UI, senza il badge "Ospite" che comparirebbe con `isGuest`.

### 3.6 🟡 Il team attivo viene da `localStorage`

[`useActiveTeamId.ts:19-28`](client/src/hooks/useActiveTeamId.ts#L19-L28) — legge `activeTeamId` da `localStorage` e verifica che sia tra i team dell'utente.

**Conseguenza**: entrando in demo va scritto l'id del team demo in quella chiave, e all'uscita va ripulita insieme al token. Altrimenti un visitatore che prima esplora la demo e poi si registra si ritrova puntato a un team che non è suo (il fallback lo salverebbe, ma è fragile appoggiarcisi).

### 3.7 🟡 Tutte le chiamate passano da un solo file

[`api.ts:15-77`](client/src/lib/api.ts#L15-L77) — `apiCall` è l'unico punto di uscita verso il backend.

**Conseguenza**: ottima notizia. Un solo punto da intercettare per simulare le scritture. **Unica eccezione da non dimenticare**: l'upload avatar in [`authSlice.ts:229-238`](client/src/redux/slices/authSlice.ts#L229-L238) usa `fetch` diretto perché invia `FormData`. Va bloccato a parte.

### 3.8 🟢 Il fallback avatar esiste già

`AvatarFallback` con iniziali su gradiente è già usato in `AppSidebar`, `DashboardLayout`, `Home`, `HeroCard`, `PodiumCard`.

**Conseguenza**: **nessuna immagine da produrre per la demo.** I giocatori senza foto mostrano le iniziali, esattamente come un team vero appena creato.

### 3.9 🔴 CRITICO — `isDemo` da solo non basta a rendere sicura la cancellazione

Il ragionamento *"metto il flag `isDemo` e cancello solo chi ce l'ha"* è corretto per `Team` e `User`, ma **non regge sul resto dei dati**. È il punto più pericoloso dell'intero progetto e va capito bene prima di scrivere una riga di seed.

**Il problema in tre passaggi.**

**1. Le collection figlie non hanno un flag, hanno un `teamId`.** `Match`, `VotingSession`, `VoteResult`, `Award`, `News`, `GoldenTot`, `PlayerSeasonStats`, `PlayerLeaderboardStats` si agganciano al team tramite `teamId`. La loro cancellazione non è quindi `deleteMany({ isDemo: true })` ma `deleteMany({ teamId: <id del team demo> })` — una query che dipende interamente dall'aver risolto correttamente quell'id.

**2. Quattro collection non hanno nemmeno il `teamId`.** Verificato leggendo i modelli:

| Collection | Come si aggancia | Come si cancella |
|---|---|---|
| `VoteSubmission` | `votingSessionId` + `voterId` | Via id delle sessioni demo |
| `PlayerCardSubmission` | `votingSessionId` + `voterId` + `targetPlayerId` | Via id delle sessioni demo |
| `Avatar` | `ownerId` (+ `ownerType`) | Via id degli utenti demo |
| `MatchNotification` | `userId` + `matchId` | Via id delle partite demo |

Vanno ripulite **in cascata**, raccogliendo prima gli id dei genitori demo. Se si dimentica questo passaggio restano documenti orfani che a ogni ri-seed si accumulano.

**3. Il rischio vero: un filtro che diventa vuoto.** Se il lookup del team demo fallisce e `demoTeamId` risulta `undefined`, Mongoose **rimuove le chiavi `undefined` dal filtro**. Il che significa che questa riga:

```js
await Match.deleteMany({ teamId: demoTeamId });   // demoTeamId === undefined
```

non cancella zero documenti come si potrebbe sperare. Diventa `deleteMany({})` e **svuota l'intera collection delle partite di tutti gli utenti.**

### ✅ La soluzione adottata: `isDemo` propagato su tutto

**Decisione presa**: il flag `isDemo: true` viene scritto su **ogni documento** che appartiene alla demo, non solo su `Team` e `User`.

È tecnicamente ridondante — l'informazione sarebbe già deducibile risalendo il `teamId` — ma sposta la sicurezza da *"lo script è scritto bene"* a *"la query non può fare danni per costruzione"*. Ogni cancellazione diventa:

```js
await Model.deleteMany({ isDemo: true });
```

che nel caso peggiore **non cancella nulla**, mai troppo. Se il flag non fosse valorizzato, il filtro resta comunque restrittivo invece di collassare su `{}`. È esattamente l'opposto del comportamento pericoloso descritto sopra.

**I 15 modelli che ricevono il campo:**

| Categoria | Modelli |
|---|---|
| Anagrafica | `Team`, `User` |
| Partite e voti | `Match`, `VotingSession`, `VoteSubmission`, `VoteResult` |
| Player Cards | `PlayerCardSubmission`, `PlayerCardResult` |
| Statistiche | `PlayerSeasonStats`, `PlayerLeaderboardStats` |
| Contenuti | `Award`, `News`, `GoldenTot` |
| Accessori | `Avatar`, `MatchNotification` |

**L'unico escluso è `Season`**, che è calendario globale condiviso con gli utenti reali (§3.1) e non appartiene a nessun team.

Il campo è identico ovunque:

```js
// === DEMO ===
// Marca il documento come appartenente alla modalità demo pubblica.
// Ridondante rispetto al teamId, ma volutamente: rende ogni cancellazione
// del seed { isDemo: true }, cioè intrinsecamente incapace di toccare
// dati reali. Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §3.9
isDemo: {
  type: Boolean,
  default: false,
  index: true
}
```

**Le tre protezioni restano comunque**, perché la ridondanza funziona solo se il flag viene effettivamente scritto, e basta un `create` distratto nel seed per lasciare un documento senza:

1. **Guardia d'ingresso, non negoziabile.** Lo script si ferma prima di qualunque scrittura se il team demo non è risolto in modo inequivocabile:

```js
const demoTeam = await Team.findOne({ isDemo: true });
if (!demoTeam?._id) throw new Error('ABORT: team demo non trovato — nessuna cancellazione eseguita');
if (demoTeam.isDemo !== true) throw new Error('ABORT: il team risolto non è demo');
```

2. **Ogni filtro validato prima dell'uso.** Una `safeDelete(Model, filter)` che rifiuta di eseguire se il filtro è vuoto o contiene valori `undefined`/`null`. Tutte le cancellazioni passano da lì, nessuna esclusa.

3. **Dry-run obbligatorio.** Lo script gira per default in simulazione, stampa quanti documenti cancellerebbe per collection, e cancella davvero solo con `--confirm`.

**Una verifica in più resa possibile dal flag**: a fine seed, lo script controlla che il numero di documenti con `isDemo: true` corrisponda a quanti ne ha creati. Se non torna, qualche `create` ha dimenticato il flag e lo si scopre subito invece che al ri-seed successivo.

### 3.10 🟡 `Match.teamId` è `String` mentre tutto il resto usa `ObjectId`

[`Match.js:11-15`](server/src/models/Match.js#L11-L15) dichiara `teamId` come `String`, con il commento *"Mantenuto come string per compatibilità frontend"*. Ogni altra collection usa `ObjectId`.

**Per la demo la soluzione è banale**: nel seed si scrive `String(demoTeamId)`. Senza la conversione il filtro non matcha nulla, in silenzio e senza errori.

**Vale la pena migrarlo a `ObjectId`? Non adesso.** L'analisi del codice dice che sarebbe un intervento molto più ampio di quanto sembri:

- Esistono **validazioni esplicite** `typeof teamId !== 'string'` che rifiuterebbero un `ObjectId`, in [`MatchService.js:600`](server/src/services/MatchService.js#L600), [`LeaderboardService.js:428`](server/src/services/LeaderboardService.js#L428) e [`TeamService.js:419`](server/src/services/TeamService.js#L419)
- Oltre **37 punti** del codice interrogano `Match` passando per `teamId`
- Tutti i `Match` già in produzione andrebbero convertiti con un backfill
- Esiste già codice difensivo che normalizza il confronto, come `String(tid) === String(match.teamId)` a [`MatchService.js:947`](server/src/services/MatchService.js#L947): segno che l'incoerenza è nota e già gestita dove serviva

È un debito tecnico reale e andrebbe sanato, ma è **un lavoro indipendente dalla demo**, con un rischio suo e un backfill suo. Infilarlo dentro questa implementazione significherebbe mettere una migrazione di schema in produzione sul percorso critico di una feature che non ne ha bisogno: se qualcosa va storto, non si capisce più se il problema è la demo o la migrazione.

**Raccomandazione**: la demo usa `String(demoTeamId)` e non tocca lo schema. La migrazione a `ObjectId` merita un piano a sé — a quel punto anche con il vantaggio di avere il team demo già disponibile come banco di prova sicuro.

---

## 4. Architettura

```
VISITATORE
    │
    ├─ apre /demo  ─────────────┐
    └─ clicca "Prova la demo"   │
       su /login ───────────────┤
                                ▼
                POST /api/v1/auth/demo-login
                    (pubblica, rate-limited)
                                │
                                ▼
              JWT { scope: 'demo', teamId: <demo> }
                    salvato in localStorage
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
   LETTURE (GET)                              SCRITTURE (POST/PUT/DELETE)
        │                                               │
   passano al backend                        intercettate in api.ts
   invariate                                 PRIMA della fetch
        │                                               │
        ▼                                               ▼
   dati reali del                            risposta simulata +
   team demo                                 toast "sei in demo"
        │                                               │
        │                                     (se qualcosa sfugge)
        │                                               ▼
        │                                    middleware server → 403
        ▼                                               │
        └───────────────► UI ◄──────────────────────────┘
                           │
              barra demo fissa + tour guidato
```

**Le due barriere sono indipendenti.** Il client intercetta per dare una bella esperienza; il server blocca per garantire la sicurezza. Se il client fallisce, il server tiene. Se il server fosse permissivo, il client eviterebbe comunque la chiamata. Nessuna delle due si fida dell'altra.

---

## 5. FASE A — Backend

> Obiettivo: esiste un team demo popolato, ci si autentica, e nessuno può scriverci.
> Verificabile da sola con `curl`, senza toccare il client.

### A.1 — Flag `isDemo` su tutti i 15 modelli

**File**: i 15 modelli elencati al §3.9 — tutti tranne `Season`.

Lo stesso campo, identico ovunque:

```js
// === DEMO ===
// Marca il documento come appartenente alla modalità demo pubblica.
// Ridondante rispetto al teamId, ma volutamente: rende ogni cancellazione
// del seed { isDemo: true }, cioè intrinsecamente incapace di toccare
// dati reali. Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §3.9
isDemo: {
  type: Boolean,
  default: false,
  index: true
}
```

L'indice serve perché il filtro `isDemo: { $ne: true }` finirà in query eseguite di frequente.

**Nessuna migrazione dei dati esistenti**: `default: false` fa sì che i documenti già in produzione si comportino da subito come non-demo, senza bisogno di toccarli. Il campo comparirà solo sui documenti scritti da qui in avanti, e per quelli vecchi `{ isDemo: { $ne: true } }` restituisce comunque il risultato corretto perché il campo assente non è mai `true`.

> ⚠️ **Attenzione a `default: false` vs campo assente** — è la trappola già documentata a [`generatePeriodicAwards.js:253-290`](server/src/jobs/generatePeriodicAwards.js#L253-L290), dove un filtro booleano non matchava documenti storici. Per questo tutte le esclusioni usano `{ $ne: true }` e mai `{ isDemo: false }`: la prima forma copre sia il campo assente, sia `false`, sia qualunque valore anomalo. La seconda no.

### A.2 — Script di seed

**File nuovo**: `server/src/utils/seedDemoData.js`
**Script npm**: `"seed:demo": "node src/utils/seedDemoData.js"`

> 💡 Nota: `package.json` dichiara già `"seed": "node src/utils/seedData.js"`, ma **quel file non esiste**. Lo script demo è quindi il primo seed reale del progetto. Vale la pena scriverlo pulito e riusabile.

**Deve essere idempotente**: rilanciandolo, cancella e ricostruisce solo i dati demo. È la parte più delicata dell'intero piano, perché gira contro il database di produzione — **prima di scriverlo va letto il §3.9**, che spiega perché il solo flag `isDemo` non basta a rendere sicure le cancellazioni.

Sequenza:

1. **Guardia d'ingresso** — risolve il team demo e si ferma con `ABORT` se non lo trova o se il documento risolto non ha `isDemo === true`. Nessuna scrittura prima di questo controllo (§3.9).
2. **Verifica stagioni** — controlla che `2025-26` e `2026-27` esistano in `Season`. Se mancano, ferma tutto con un messaggio che rimanda a `seed-seasons.js`. Non le crea da sé: sono il calendario globale condiviso con gli utenti veri.
3. **Pulizia** — un `deleteMany({ isDemo: true })` per ciascuno dei 15 modelli, tramite `safeDelete`. Grazie al flag propagato (§3.9) non serve più raccogliere gli id dei genitori né ragionare sull'ordine delle dipendenze: ogni collection si ripulisce da sola, e le quattro senza `teamId` non sono più un caso speciale. In dry-run stampa solo i conteggi.
4. **Team** — crea `I Bomber (Demo)` con `isDemo: true`, `awardsEnabled: false` (il cron è già escluso, ma è la seconda bretella), colori sociali, `seasonEndDate` coerente con la stagione archiviata.
5. **Utenti** — 12 giocatori con `isDemo: true`. Il capitano **Ale** è l'identità in cui entra il visitatore.
6. **Partite** — ~25 `Match` distribuite sulle due stagioni, con `seasonId` denormalizzato calcolato da `SeasonService.resolveSeasonId(date)` come fa il codice di produzione. Attenzione al `teamId` come stringa (§3.9).
7. **Voti** — per ogni partita conclusa, `VotingSession` completata + `VoteSubmission` di ogni partecipante + `VoteResult` aggregato.
8. **Player Cards** — `PlayerCardSubmission` e `PlayerCardResult` per tutti e 12.
9. **Statistiche** — `PlayerSeasonStats` e `PlayerLeaderboardStats`, generate **riusando i service esistenti** e non scrivendo direttamente i documenti, così i numeri sono coerenti con quelli che l'app calcola da sola.
10. **Awards** — `MATCH_RECAP` recenti, `MONTHLY_MVP`, e per la stagione chiusa `BALLON_DOR` + `GOLDEN_BOOT`.
11. **Golden TOT** — record che dà `+3 TOT` e `+2 fin` ai vincitori, validi nella stagione corrente.
12. **News** — qualche news generata via `NewsService` per popolare la home.
13. **Sessione di voto aperta** — l'ultima partita resta con una `VotingSession` `status: 'active'` e **`deadline: null`**, così il cron non la tocca mai (vedi §3.2).

Alla fine stampa un riepilogo con l'id del team, così è subito utilizzabile per i test.

### A.3 — Endpoint di login demo

**File**: `server/src/routes/auth.js`, `server/src/controllers/AuthController.js`, `server/src/services/AuthService.js`

```js
// @route   POST /api/v1/auth/demo-login
// @desc    Autentica un visitatore nella modalità demo → JWT scope demo
// @access  Public
router.post('/demo-login', authController.demoLogin);
```

Il service:
1. Trova il team con `isDemo: true` (se manca → `503` con messaggio chiaro: la demo non è stata seedata)
2. Trova il capitano demo
3. Firma un JWT `{ id, scope: 'demo', teamId }` con scadenza **24h**
4. Restituisce `{ user, token, teamId }` nella stessa forma di `login`, così il client non ha bisogno di un percorso separato

**Rate limiting**: la rotta è pubblica e crea un token. Va aggiunto un limiter dedicato più stretto del globale (indicativamente 10 richieste per IP ogni 15 minuti) in [`app.js:36-46`](server/src/app.js#L36-L46). Non è un endpoint costoso, ma è pubblico e senza credenziali.

### A.4 — Middleware di blocco scritture

**File nuovo**: `server/src/middleware/blockDemoWrites.js`

```js
/**
 * blockDemoWrites — Rende la modalità demo strutturalmente read-only.
 *
 * Va montato PRIMA di tutte le rotte API, DOPO auth.
 * Blocca ogni metodo che modifica stato quando lo scope del JWT è 'demo'.
 * È la barriera di sicurezza: il client intercetta già le scritture per
 * simularle, ma non ci fidiamo del client.
 */
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const blockDemoWrites = (req, res, next) => {
  if (req.user?.scope !== 'demo') return next();
  if (!WRITE_METHODS.includes(req.method)) return next();

  return res.status(403).json({
    error: 'DEMO_READ_ONLY',
    message: 'Sei in modalità demo: le modifiche non vengono salvate. Registrati per creare il tuo team!'
  });
};
```

Nessuna whitelist: in demo **nessuna** scrittura è ammessa. Se in futuro servisse un'eccezione, si aggiunge qui in un punto solo.

### A.5 — Estensione di `requireScope`

**File**: `server/src/middleware/requireScope.js`

Il middleware funziona già per allowlist, quindi non va modificato nella logica. Va invece rivisto **rotta per rotta** chi accetta `'demo'` accanto a `'full'` e `'guest'`. Regola generale: tutte le `GET` del perimetro demo lo accettano; le rotte `god` no, mai.

Il messaggio d'errore attuale dice *"Accesso non consentito per utenti ospite"*: va reso neutro, ora che gli scope ristretti sono due.

### A.6 — Esclusione dai job e dalle query globali

| File | Modifica |
|---|---|
| [`jobs/generatePeriodicAwards.js:57,124-133`](server/src/jobs/generatePeriodicAwards.js#L57) | Aggiungere `isDemo: { $ne: true }` a tutte e quattro le `Team.find` |
| [`jobs/seasonRolloverJob.js:108`](server/src/jobs/seasonRolloverJob.js#L108) | `Team.find({})` → `Team.find({ isDemo: { $ne: true } })` |
| [`jobs/closeExpiredVotingSessions.js:59`](server/src/jobs/closeExpiredVotingSessions.js#L59) | Escludere le sessioni dei team demo |
| `services/LeaderboardService.js` | Verificare le tre `aggregate` (righe 246, 367, 386): se attraversano più team, filtrare |
| `god/**` | Escludere il team demo dai KPI, altrimenti gonfia le metriche reali |

> 🔍 Questa tabella va **riverificata durante l'implementazione** con una ricerca sistematica di tutte le query cross-team. L'elenco qui sopra è quello emerso dall'analisi statica, ma va confermato caso per caso.

---

## 6. FASE B — Client

> Obiettivo: si entra in demo, si naviga tutto, si prova a votare e l'app risponde.

### B.1 — Stato demo in Redux

**File**: `client/src/redux/slices/authSlice.ts`

Ricalca in modo pedissequo quanto già fatto per `isGuest`, che è il modello da seguire:

- `AuthState` guadagna `isDemo: boolean` e `demoTeamId: string | null`
- Nuovo thunk `demoLogin` (gemello di `guestLogin` a [`authSlice.ts:180-192`](client/src/redux/slices/authSlice.ts#L180-L192))
- `initializeAuth` legge `scope === 'demo'` dal payload JWT, come già fa per `guest` a [`authSlice.ts:300-302`](client/src/redux/slices/authSlice.ts#L300-L302)
- Nuova action `exitDemo`: pulisce token, user, **`activeTeamId`** (vedi §3.6) e lo stato della demo

### B.2 — Intercettore delle scritture

**File nuovo**: `client/src/lib/demoMode.ts`
**File modificato**: `client/src/lib/api.ts`

Il cuore dell'interattività. In `apiCall`, prima della `fetch`:

```
se (demo attiva) e (metodo è di scrittura):
    → non chiamare il backend
    → emetti un evento che la barra demo intercetta per mostrare il toast
    → restituisci una risposta simulata coerente con la forma attesa dal chiamante
```

`demoMode.ts` contiene:
- `isDemoActive()` — legge lo scope dal JWT in `localStorage`
- `simulateWrite(endpoint, method, body)` — genera la risposta finta
- un piccolo registro di risposte simulate per gli endpoint che il visitatore può davvero raggiungere

Gli endpoint da simulare, in ordine di importanza:

| Endpoint | Risposta simulata |
|---|---|
| `POST /voting-sessions/:id/submit` | Successo, con i voti inviati riflessi nella UI |
| `POST /matches` | Partita finta con id `demo-*`, aggiunta allo storico locale |
| `POST /player-card-sessions/*` | Successo con attributi aggiornati |
| `PUT /auth/profile` | Successo senza persistenza |
| `POST /invite/*` | **Link finto** (vedi §B.5) |
| `DELETE` di qualunque tipo | Successo, elemento nascosto solo localmente |

**Non dimenticare**: l'upload avatar bypassa `apiCall` con `fetch` diretto ([`authSlice.ts:229`](client/src/redux/slices/authSlice.ts#L229)). Va intercettato a parte, dentro il thunk.

> ⚠️ Il punto più delicato di questa fase è la **forma** delle risposte simulate. Se differisce da quella reale, i reducer Redux vanno in errore. Vanno lette le risposte vere prima di scriverle, non indovinate.

### B.3 — Barra demo

**File nuovo**: `client/src/components/DemoBanner.tsx`

Barra fissa, sempre visibile, che non copra la navigazione mobile ([`BottomNav.tsx`](client/src/components/BottomNav.tsx) occupa già il fondo schermo — la barra demo va in alto).

Contiene:
- Etichetta `👁 Modalità demo — i dati non vengono salvati`
- **CTA primaria** `Crea il tuo team` → `/login` con tab registrazione già aperta
- Menu con `Riavvia tour` ed `Esci dalla demo`
- Ascolta gli eventi dell'intercettore e mostra i toast delle azioni simulate

### B.4 — Rotte

**File**: `client/src/App.tsx`, `client/src/pages/Login.tsx`

- Nuova rotta pubblica `/demo` → componente che chiama `demoLogin`, mostra uno stato di caricamento e reindirizza a `/` a token ottenuto
- `ProtectedRouteRedux` ([`ProtectedRouteRedux.tsx:29-31`](client/src/components/ProtectedRouteRedux.tsx#L29-L31)) non va toccato: l'utente demo **è** autenticato e passa il gate da sé. Elegante.
- La rotta `/god-dashboard` va invece esclusa esplicitamente per gli utenti demo
- In `Login.tsx`, un separatore e un bottone secondario `Guarda la demo` sotto le tab esistenti

### B.5 — Il caso dell'invito ospiti

Il wizard di creazione partita arriva a generare un link `/join?token=XXX`. In demo il flusso si percorre **tutto**, fino alla schermata del link, ma:

- il token è finto e visibilmente tale (es. `demo-invito-non-attivo`)
- il link è mostrato e copiabile, ma non funziona
- un riquadro informativo spiega: *"In modalità demo l'invito non viene inviato davvero. Con un account reale, il tuo compagno riceverebbe questo link, voterebbe la partita e se poi si registrasse manterrebbe tutto lo storico."*

Così si mostra la feature — che è un buon argomento di vendita — senza aprire nessuna scrittura reale.

---

## 7. FASE C — Tour guidato

> Obiettivo: chi non conosce l'app non si perde e arriva alle parti migliori.

**File**: nuovo `client/src/components/DemoTour.tsx`, più `client/src/data/demo-tour-steps.ts`

L'[`OnboardingTutorial`](client/src/components/OnboardingTutorial.tsx) esistente resta com'è, per gli utenti registrati. Il tour demo è un componente distinto, perché fa una cosa che quello non fa: **naviga davvero tra le pagine**.

Ogni step porta il visitatore su una rotta, evidenzia un elemento con un tooltip e attende. Sequenza proposta:

| # | Rotta | Cosa evidenzia | Messaggio |
|---|---|---|---|
| 1 | — | Modale di benvenuto | Cos'è Pagelle FC, in due frasi |
| 2 | `/` | Dashboard e prossima partita | "Qui vedi la vita del tuo team" |
| 3 | `/player-cards` | Carta con radar chart | "Ogni giocatore ha la sua carta, votata dai compagni" |
| 4 | `/player-cards` | Badge Golden TOT `+3` | "Chi vince il Pallone d'Oro parte avvantaggiato la stagione dopo" |
| 5 | `/vote` | Slider di voto | **"Provaci: vota un compagno"** — step interattivo |
| 6 | `/stats` | Grafici e selettore stagione | "Ogni prestazione diventa un numero" |
| 7 | `/awards` | Bacheca trofei | "E i momenti migliori diventano card da condividere" |
| 8 | — | Modale finale | CTA: `Crea il tuo team` |

Requisiti: sempre saltabile, indicatore di avanzamento, riavviabile dalla barra demo, e uno stato in `sessionStorage` così non riparte a ogni cambio pagina.

Lo step 5 è il momento chiave della demo: è dove il visitatore passa da spettatore a partecipante. Vale la pena curarlo più degli altri.

---

## 8. Contenuto del seed

### Il team

| Campo | Valore |
|---|---|
| Nome | `I Bomber (Demo)` |
| Descrizione | `Squadra dimostrativa di Pagelle FC — esplora liberamente!` |
| Città | `Milano` |
| Colori | Primario `#2563eb`, secondario `#f59e0b` |
| `isDemo` | `true` |
| `awardsEnabled` | `false` |

### I 12 giocatori

Nomi corti, diminutivi, massimo 6 lettere, senza cognomi. Nessun avatar: il fallback a iniziali fa già il suo lavoro (§3.8).

| Nome | Ruolo | Piede | Note |
|---|---|---|---|
| **Simo** | POR | dx | Portiere, attributi specifici (tuffo, presa, riflessi) |
| **Teo** | POR | dx | Secondo portiere |
| **Ale** | DIF | sx | 👤 Capitano e **admin del team — è l'identità in cui entra ogni visitatore**, così vede tutte le funzioni |
| **Gabri** | DIF | dx | |
| **Nico** | DIF | dx | |
| **Manu** | DIF | sx | |
| **Fede** | CEN | dx | |
| **Lore** | CEN | sx | Regista, visione alta |
| **Cri** | CEN | dx | |
| **Miki** | CEN | both | |
| **Johnny** | ATT | dx | 🏆 **Pallone d'Oro 2025-26** → Golden TOT `+3` |
| **Ricky** | ATT | sx | 👟 **Scarpa d'Oro 2025-26** → `+2` su `fin` |

Johnny e Ricky sono scelti come vincitori perché i loro premi sono visibili sulle carte con badge e glow dorato: sono la prova concreta che il sistema di award incide davvero sul gioco.

### Le partite

| Stagione | Stato | Partite | Contenuto |
|---|---|---|---|
| `2025-26` | Archiviata | ~15 | Tutte concluse, con voti, MVP e award di fine stagione |
| `2026-27` | Attiva | ~10 | Concluse tranne l'ultima, che ha la sessione di voto **aperta** |

Campi con nomi credibili (`Centro Sportivo Meazza`, `Campo Comunale`, `Arena Sport Village`), formato prevalente 8 giocatori, risultati vari — vittorie, pareggi e sconfitte, perché un team che vince sempre non è credibile e i grafici di trend risultano piatti.

I voti vanno generati con una distribuzione realistica: media intorno a 6.5, code fino a 4 e 9, e qualche astensione — l'astensione è una feature dell'app e va mostrata. Ogni giocatore mantiene un carattere coerente nel tempo, così i grafici di trend raccontano qualcosa invece di essere rumore.

---

## 9. Verifiche prima del rilascio

### Sicurezza — nessuna di queste deve passare

- [ ] `POST /api/v1/matches` con token demo → `403 DEMO_READ_ONLY`
- [ ] `PUT /api/v1/auth/profile` con token demo → `403`
- [ ] `DELETE` su qualunque risorsa con token demo → `403`
- [ ] Rotte `god` con token demo → `403`
- [ ] Token demo che tenta di leggere un team **non** demo → negato
- [ ] Upload avatar (che bypassa `apiCall`) → bloccato
- [ ] Token demo scaduto dopo 24h → richiede nuovo `demo-login`

### Isolamento dei dati

- [ ] Un utente reale non vede mai il team demo in classifiche, ricerche o statistiche
- [ ] `generatePeriodicAwards` non produce award per il team demo
- [ ] `seasonRolloverJob` salta il team demo
- [ ] La sessione di voto demo è ancora `active` dopo oltre 24h (il cron non l'ha chiusa)
- [ ] I KPI della God Dashboard non contano il team demo

### Esperienza

- [ ] `/demo` funziona da link diretto, anche da browser in incognito
- [ ] Il bottone su `/login` porta in demo in un solo clic
- [ ] Tutte le sezioni del perimetro si aprono senza errori in console
- [ ] Il voto simulato aggiorna la UI e mostra il toast
- [ ] **Le azioni da admin sono tutte intercettate**: elimina partita, rimuovi membro dalla rosa, chiudi votazione, modifica dati team (§13.1)
- [ ] Il refresh mantiene la sessione demo
- [ ] `Esci dalla demo` pulisce token **e `activeTeamId`**
- [ ] Chi si registra dopo la demo atterra sul **proprio** team, non su quello demo
- [ ] Il tour è saltabile in ogni momento e riavviabile
- [ ] Tutto verificato su mobile: la barra demo non copre la `BottomNav`
- [ ] La demo funziona come PWA installata

### Robustezza del seed — da provare su DB di test, mai direttamente in produzione

- [ ] Rilanciare il seed due volte di fila non produce errori né duplicati
- [ ] **Ogni documento creato dal seed ha `isDemo: true`** — il conteggio finale corrisponde a quanti ne ha creati (§3.9)
- [ ] Dopo un ri-seed nessuna delle 15 collection contiene documenti demo residui
- [ ] Nessuna esclusione usa `{ isDemo: false }`: tutte usano `{ $ne: true }` (§A.1)
- [ ] Il dry-run stampa i conteggi e **non** cancella nulla senza `--confirm`
- [ ] `safeDelete` rifiuta un filtro vuoto o con valore `undefined` (da testare apposta, forzando il caso)
- [ ] Con il team demo assente, lo script aborta **prima** di qualunque scrittura
- [ ] Conteggio dei documenti delle collection principali identico prima e dopo un seed, al netto dei soli dati demo
- [ ] Se il team demo non esiste, `/demo` mostra un errore comprensibile e non una pagina bianca
- [ ] Rate limiting attivo su `demo-login`

---

## 10. Rischi noti

| Rischio | Impatto | Come lo gestiamo |
|---|---|---|
| **Il seed cancella dati reali** | 🔴 → 🟢 | Era il rischio numero uno. La propagazione di `isDemo` su tutti i 15 modelli (§3.9) lo neutralizza alla radice: ogni cancellazione è `deleteMany({ isDemo: true })`, che nel caso peggiore non cancella nulla. Restano come rete guardia d'ingresso, `safeDelete` e dry-run. Prima prova su DB di test, backup con `npm run db:backup` e solo allora la produzione. |
| Un `create` del seed dimentica il flag | 🟡 Medio | Il documento resterebbe orfano e invisibile alle pulizie. Intercettato dal controllo di coerenza a fine seed (§3.9) |
| Il cron chiude la sessione di voto demo | 🟠 Alto | Doppia protezione: `deadline: null` + esclusione esplicita nel job (§3.2) |
| Risposte simulate di forma sbagliata | 🟠 Alto | Leggere le risposte reali prima di scrivere quelle finte, non indovinarle |
| Una query cross-team dimenticata | 🟠 Alto | Ricerca sistematica delle aggregazioni cross-team durante l'implementazione |
| Carico sul DB di produzione | 🟡 Medio | Le letture demo sono cacheable; `CacheService` esiste già |
| Abuso della rotta pubblica | 🟡 Medio | Rate limiting dedicato |
| La demo invecchia | 🟢 Basso | Le date sono relative al momento del seed. Non è un problema di manutenzione periodica: basta che i dati ci siano e che la sessione di voto resti aperta. Si rilancia il seed quando fa comodo, non a scadenza. |

---

## 11. Riepilogo dei file

### Nuovi

| File | Fase |
|---|---|
| `server/src/utils/seedDemoData.js` | A |
| `server/src/middleware/blockDemoWrites.js` | A |
| `client/src/lib/demoMode.ts` | B |
| `client/src/components/DemoBanner.tsx` | B |
| `client/src/pages/Demo.tsx` | B |
| `client/src/components/DemoTour.tsx` | C |
| `client/src/data/demo-tour-steps.ts` | C |

### Modificati

| File | Modifica | Fase |
|---|---|---|
| **15 modelli** in `server/src/models/` | Campo `isDemo` — tutti tranne `Season` (§3.9) | A |
| `server/src/routes/auth.js` | Rotta `demo-login` | A |
| `server/src/controllers/AuthController.js` | Handler `demoLogin` | A |
| `server/src/services/AuthService.js` | Logica del token demo | A |
| `server/src/middleware/requireScope.js` | Messaggio d'errore neutro | A |
| `server/src/app.js` | Montaggio middleware + rate limiter | A |
| `server/src/jobs/generatePeriodicAwards.js` | Esclusione demo | A |
| `server/src/jobs/seasonRolloverJob.js` | Esclusione demo | A |
| `server/src/jobs/closeExpiredVotingSessions.js` | Esclusione demo | A |
| `server/src/services/LeaderboardService.js` | Esclusione demo (da verificare) | A |
| `server/package.json` | Script `seed:demo` | A |
| `client/src/redux/slices/authSlice.ts` | Stato e thunk demo | B |
| `client/src/lib/api.ts` | Intercettore scritture | B |
| `client/src/App.tsx` | Rotta `/demo` + barra demo | B |
| `client/src/pages/Login.tsx` | Bottone demo | B |
| `README.md` | Link a `/demo` nella riga di navigazione in cima (§13.2) | C |

Più le rotte a cui va aggiunto `'demo'` in `requireScope`, da censire durante la Fase A.

---

## 12. Ordine di lavoro

Le tre fasi sono sequenziali ma ognuna è verificabile da sola.

**Fase A** — al termine: `curl -X POST .../auth/demo-login` restituisce un token, quel token legge i dati del team demo, e ogni tentativo di scrittura risponde `403`. Il client non è ancora stato toccato.

**Fase B** — al termine: si apre `/demo` nel browser, si naviga tutta l'app, si prova a votare e l'app risponde. Senza tour.

**Fase C** — al termine: il visitatore viene accompagnato dal primo schermo alla CTA finale.

Consiglio pratico: **fermarsi dopo ogni fase e provarla insieme**, invece di procedere fino in fondo. La Fase A in particolare va provata su database di test prima di girare in produzione, e conviene fare un backup con `npm run db:backup` prima del primo seed in prod.

---

## 13. Decisioni chiuse

Le domande lasciate aperte nella prima stesura sono state risolte:

1. **Identità del visitatore → Ale, il capitano.** ✅ Ogni visitatore entra sempre come Ale, che è admin del team. Così ha accesso all'intero ventaglio di funzioni — creazione partita, gestione rosa, apertura votazioni — e nessuna parte dell'app resta nascosta dietro un permesso mancante.

   ⚠️ **Ha una conseguenza sulla Fase B**: da admin, l'interfaccia espone anche le azioni distruttive (elimina partita, rimuovi membro, chiudi votazione). Tutte queste vanno intercettate e simulate, non solo quelle di creazione. La checklist del §9 ne tiene conto.

2. **Link alla demo nel `README.md` → sì.** ✅ Un link a `/demo` in cima al readme, dove oggi c'è la riga di navigazione `[🚀 Inizia] • [🎯 Features] • ...`, più la bio Instagram e LinkedIn.

3. **Frequenza del re-seed → nessuna cadenza fissa.** ✅ Non è un requisito di manutenzione. Serve solo che i dati ci siano e che ci sia sempre **una partita con la votazione aperta**, perché quello è il cuore della dimostrazione. Il seed si rilancia quando fa comodo.

---

## 14. Riepilogo delle correzioni alla prima stesura

Modifiche introdotte dopo la revisione:

| § | Correzione |
|---|---|
| 3.1 | Riformulato il vincolo sulle stagioni: il **calendario** è globale come i mesi dell'anno, ma **ogni team vede i propri dati** al suo interno. La prima stesura era ambigua sul punto. |
| 3.2 | Chiarito che il cron **non viene spento**: continua a servire i team reali, è solo il team demo a esserne escluso. |
| 3.9 | **Sezione nuova e critica.** Il flag `isDemo` è sufficiente per `Team` e `User`, ma non per le collection figlie — otto si agganciano via `teamId`, e quattro (`VoteSubmission`, `PlayerCardSubmission`, `Avatar`, `MatchNotification`) non hanno nemmeno quello. Documentato il rischio che un filtro con valore `undefined` diventi una cancellazione totale, con le tre protezioni da adottare. |
| 5 / A.2 | Sequenza del seed aggiornata con guardia d'ingresso e pulizia a cascata. |
| 9, 10 | Checklist e rischi allineati. |
| 13 | Le tre domande aperte sono state chiuse. |

**Revisione 3** — dopo la seconda revisione:

| § | Correzione |
|---|---|
| 3.9 | **Adottata la propagazione totale di `isDemo`** su tutti i 15 modelli tranne `Season`. Ogni cancellazione del seed diventa `deleteMany({ isDemo: true })`, incapace per costruzione di toccare dati reali. Le tre protezioni restano come rete di sicurezza sul caso in cui il flag non venga scritto. |
| 3.10 | Sezione nuova su `Match.teamId`. La migrazione a `ObjectId` è **rimandata**: tre validatori `typeof === 'string'` la rifiuterebbero, 37+ punti del codice sono coinvolti e servirebbe un backfill in produzione. La demo usa `String(demoTeamId)` e non tocca lo schema. |
| A.1 | Esteso a 15 modelli, con la nota sul perché le esclusioni usano `{ $ne: true }` e mai `{ isDemo: false }`. |
| A.2 | Pulizia semplificata: il flag propagato elimina la necessità della cancellazione a cascata. |
| 9, 11 | Checklist e file allineati. |

---

*Piano redatto l'8 settembre 2026, alla terza revisione — da approvare prima dell'implementazione.*

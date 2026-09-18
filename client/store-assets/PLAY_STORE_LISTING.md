# Materiale per Play Console — Pagelle FC

Bozze pronte da copiare/incollare in Play Console. Verificale e adattale prima
di pubblicare: sono un punto di partenza onesto basato sul codice reale
dell'app, non testo definitivo.

---

## 1. Titolo e descrizioni (scheda Store)

**Titolo** (max 30 caratteri):
```
Pagelle FC
```

**Descrizione breve** (max 80 caratteri):
```
Vota le pagelle di squadra dopo ogni partita: classifiche, stats e premi.
```
(73 caratteri)

**Descrizione lunga** (max 4000 caratteri):
```
Pagelle FC è l'app per votare e confrontare le prestazioni della tua squadra
di calcio amatoriale, partita dopo partita.

⚽ VOTA DOPO OGNI PARTITA
Assegna un voto a ciascun compagno di squadra al termine della partita.
I voti dei membri del team si combinano per generare la pagella ufficiale
di ognuno.

📊 STATISTICHE E STORICO
Consulta lo storico di tutte le partite, i voti ricevuti e l'andamento nel
tempo. Le player card riassumono in un colpo d'occhio il rendimento di ogni
giocatore nella stagione.

🏆 PREMI E TROFEI
A fine mese e a fine stagione vengono assegnati automaticamente i trofei
della squadra: MVP del mese, Pallone d'Oro, Scarpa d'Oro e il podio di ogni
partita. Ogni premio genera una card condivisibile su WhatsApp, Telegram e
Instagram.

👥 GESTIONE SQUADRA
Chi amministra il team può creare partite, invitare compagni e gestire
l'elenco giocatori. È previsto anche un accesso "ospite" a scope ridotto per
far votare chi non ha ancora un account.

🎬 PROVALA SENZA REGISTRARTI
La modalità demo ti fa esplorare l'app con dati di esempio, senza creare un
account.

Nessuna pubblicità. Nessun tracciamento di terze parti.
```

---

## 2. Asset grafici (già generati)

| File | Dimensione | Dove va caricato in Console |
|---|---|---|
| `client/store-assets/icon-512x512.png` | 512×512 | Presenza nello Store → **Icona dell'app** |
| `client/store-assets/feature-graphic-1024x500.png` | 1024×500 | Presenza nello Store → **Immagine di anteprima (feature graphic)** |

**Screenshot (2–8, telefono)**: da fare tu — vedi istruzioni passo-passo più sotto.

---

## 3. Data Safety form — risposte suggerite

Basato sull'analisi reale del codice (`server/src/models/*`, nessun SDK di
analytics/ads/crash-reporting nelle dipendenze):

| Domanda Console | Risposta | Motivo (dal codice) |
|---|---|---|
| L'app raccoglie o condivide dati utente? | **Sì** | Vedi sotto |
| Dati raccolti — Informazioni personali | **Nome**, **Indirizzo email**, **Data di nascita** | `server/src/models/User.js`: `name`, `email`, `birthdate` obbligatori per utenti registrati |
| Dati raccolti — Foto | **Foto del profilo** | Avatar utente (`Avatar` model, upload via `AvatarUploader.tsx`) |
| Dati raccolti — Attività nell'app | **Contenuti generati dall'utente** (voti, bio profilo, nome/descrizione team) | `VoteSubmission`, `profile.bio` (200 char), `Team.description` |
| Dati raccolti — Identificatori | **ID utente** | ObjectId Mongo interno, JWT |
| Dati condivisi con terze parti | **No** | Nessun SDK analytics/ads/crash trovato in `package.json` (client e server) |
| Dati crittografati in transito | **Sì** | HTTPS + JWT Bearer (`Authorization` header), nessun cookie |
| Gli utenti possono richiedere l'eliminazione dei dati? | **Sì, via richiesta email** (non self-service in-app) | `Privacy.tsx` rimanda a `pagelleFC@proton.me` — nessun endpoint di cancellazione automatica in-app |
| Scopo della raccolta | Funzionalità core dell'app (voting, classifiche), personalizzazione account | — |
| Dati per pubblicità | **No** | Nessun ads SDK |

> Nota: in Console, alla domanda "Gli utenti possono richiedere che i dati
> vengano eliminati" seleziona l'opzione che descrive una richiesta **manuale**
> (via email), non un flusso automatico in-app. Non c'è una funzione di
> autocancellazione account nel codice — è una scelta accettata per ora.

---

## 4. Content Rating (questionario IARC) — risposte suggerite

| Categoria | Risposta |
|---|---|
| Violenza | Nessuna |
| Contenuti sessuali | Nessuno |
| Linguaggio volgare | Nessuno *generato dall'app* (ma bio/nome team sono testo libero non moderato — vedi nota) |
| Sostanze controllate | Nessuna |
| Gioco d'azzardo simulato | Nessuno |
| Contenuti generati dagli utenti (UGC) non moderati | **Sì** — bio profilo (200 car.) e descrizione team sono testo libero senza moderazione automatica |
| Interazione tra utenti / condivisione posizione | Nessuna condivisione di posizione. Interazione limitata al team (voti, non chat aperta) |
| Acquisti in-app | Nessuno |
| Accesso a internet non ristretto (browser) | No |

Nota: dichiarare onestamente la presenza di UGC non moderato (bio/nome team)
di solito porta al massimo a un rating "PEGI 3" con nota USK/IARC su
"comunicazione tra utenti", non blocca la pubblicazione.

---

## 5. Note per i reviewer (campo "App access" in Console)

```
L'app richiede login. Per testare senza creare un account, usare la modalità
demo pubblica: aprire l'app e selezionare "Prova la demo" (o navigare
direttamente a /demo sulla versione web: https://pagelleclientfc.vercel.app/demo).
La demo carica un team con dati di esempio (partite, voti, storico, premi)
già popolati, senza richiedere registrazione.
```

---

## 6. Privacy Policy URL (da incollare in Console)

```
https://pagelleclientfc.vercel.app/privacy
```
Confermata raggiungibile in produzione (Privacy, Terms, Cookie Policy).

# 📋 DOCUMENTAZIONE news-templates.json

## Panoramica
Il file `news-templates.json` contiene tutti i template per la generazione automatica di notizie nell'applicazione **Pagelle FC**. È organizzato in **9 categorie principali** con un totale di **32 sottocategorie**.

## 📊 ANALISI COMPLETA DELLE CATEGORIE

### 1. **leaderboard** (7 sottocategorie)
Gestisce le notizie relative alle classifiche e posizioni dei giocatori:

- **`new_leader`**: Annunci per nuovo leader della classifica generale
- **`position_gained`**: Notizie per scalate di posizioni in classifica
- **`goals_leader`**: Template per il capocannoniere
- **`assists_leader`**: Template per il leader degli assist
- **`competitive_leaderboard`**: Situazioni di classifica equilibrata
- **`dominant_leader`**: Leader dominante con ampio vantaggio
- **`podium_battle`**: Battaglia tra i primi 3 della classifica

### 2. **match_creation** (19 sottocategorie)
La categoria più ricca, gestisce tutti gli aspetti della creazione di un match:

#### Generali
- **`general`**: Annunci generici di nuovo match
- **`field`**: Focus sul campo di gioco
- **`motivational`**: Messaggi motivazionali

#### Tempistiche
- **`date_urgent`**: Match imminente (entro 24 ore)
- **`date_soon`**: Match programmato a breve
- **`weekend`**: Match del fine settimana

#### Partecipazione
- **`participants_5v5`**: Match 5 contro 5
- **`participants_8v8`**: Match 8 contro 8  
- **`participants_11v11`**: Match 11 contro 11
- **`full_squad`**: Squadra al completo

#### Situazioni Speciali
- **`weather`**: Condizioni meteo generali
- **`weather_january`**: Template specifico per gennaio
- **`weather_february`**: Template specifico per febbraio
- **`weather_march`**: Template specifico per marzo
- **`weather_april`**: Template specifico per aprile
- **`weather_may`**: Template specifico per maggio
- **`weather_june`**: Template specifico per giugno
- **`weather_july`**: Template specifico per luglio
- **`weather_august`**: Template specifico per agosto
- **`weather_september`**: Template specifico per settembre
- **`weather_october`**: Template specifico per ottobre
- **`weather_november`**: Template specifico per novembre
- **`weather_december`**: Template specifico per dicembre
- **`absences`**: Gestione assenze
- **`funny_abstainers`**: Commenti ironici sugli indecisi

### 3. **match_completed** (12 sottocategorie)
Template per match conclusi e relative statistiche:

#### Prestazioni Individuali
- **`mvp_performance`**: Prestazione da MVP
- **`flop_performance`**: Prestazioni deludenti
- **`top_scorer`**: Miglior marcatore del match
- **`assist_man`**: Miglior assistman

#### Prestazioni di Squadra
- **`team_performance`**: Performance generale della squadra
- **`balanced_performance`**: Prestazioni equilibrate di tutti
- **`multiple_high_ratings`**: ✨ **NUOVO** - Più giocatori con votazioni alte

#### Tipologie di Match
- **`goals_fest`**: Match con molti gol
- **`high_scoring`**: Match ad alto punteggio
- **`low_scoring`**: Match a basso punteggio
- **`late_night`**: Match notturni conclusi

#### Statistiche
- **`funny_stats`**: Statistiche curiose/divertenti

### 4. **playercard_creation** (7 sottocategorie)
Gestisce la creazione e valutazione delle schede giocatore:

- **`session_started`**: Inizio sessione di valutazione
- **`high_rating`**: Valutazioni molto alte
- **`rookie_player`**: Giocatori esordienti
- **`balanced_player`**: Giocatori equilibrati
- **`specialist_player`**: Giocatori specialisti
- **`special_position`**: Posizioni speciali/rare
- **`welcome_player`**: Benvenuto a nuovi giocatori
- **`balanced_rating`**: Valutazioni equilibrate

### 5. **streaks** (2 sottocategorie)
Template per serie e record:

- **`winning_streak`**: Serie di prestazioni positive
- **`record_broken`**: Nuovo record personale stabilito

### 6. **debuts** (1 sottocategoria)
- **`debut`**: Template per i debutti nel team

### 7. **milestones** (1 sottocategoria)
- **`milestone`**: Traguardi e anniversari (es. numero di presenze)

### 8. **rivalries** (1 sottocategoria)  
- **`rivalry`**: Sfide dirette tra giocatori

### 9. **fun_facts** (1 sottocategoria)
- **`fun_fact`**: Curiosità e statistiche divertenti

## 📈 STATISTICHE GENERALI

- **Totale categorie**: 9
- **Totale sottocategorie**: 33
- **Categoria più ricca**: `match_creation` (19 sottocategorie)
- **Seconda categoria più ricca**: `match_completed` (12 sottocategorie)

## 🌦️ TEMPLATE METEO MENSILI

Il sistema include template specifici per ogni mese dell'anno:
- 12 sezioni weather_[mese] per personalizzare le notizie in base al periodo
- Template tematici che riflettono l'atmosfera di ogni mese
- Emoji e messaggi contestualizzati alle stagioni

## 🎯 STRUTTURA DI OGNI TEMPLATE

Ogni template contiene:
- **`text`**: Il messaggio con placeholder per variabili dinamiche
- **`category`**: Categoria di appartenenza
- **`type`**: Sottocategoria specifica
- **`priority`**: Priorità del messaggio (urgent, high, medium, low)
- **`icon`**: Emoji rappresentativa
- **`style`**: Stile grafico (success, warning, info, danger, secondary, default)

## 🔄 UTILIZZO

I template vengono utilizzati dal sistema di generazione notizie per:
1. Selezionare il template appropriato in base al contesto
2. Sostituire i placeholder con i dati reali
3. Generare notizie dinamiche per gli utenti
4. Mantenere coerenza nel tono e nello stile comunicativo

## ✂️ MODIFICHE RECENTI

**1 gennaio 2026**:
- ❌ Rimossi template per orari specifici: `time_evening`, `time_morning`, `time_lunch`
- ❌ Rimossi template partecipazione: `high_participation`, `low_participation` 
- ❌ Rimosso template: `special_notes`
- ✅ Aggiunti template meteo per tutti i 12 mesi dell'anno
- ✅ **NUOVO**: Aggiunta sottocategoria `multiple_high_ratings` con 5 template per celebrare più giocatori con votazioni alte
- 📊 Aggiornamento da 32 a 33 sottocategorie totali

---
*Ultimo aggiornamento: 1 gennaio 2026*
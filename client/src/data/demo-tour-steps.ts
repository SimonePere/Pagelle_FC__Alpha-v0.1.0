/**
 * 🎬 Tour guidato della modalità demo — contenuto e interruttore.
 *
 * Cinque schermate che raccontano l'app al visitatore appena entrato, sulla
 * falsariga di OnboardingTutorial: un riquadro al centro, si legge e si va
 * avanti. Niente navigazione automatica fra le pagine, niente elementi
 * evidenziati — meno parti in movimento, meno cose che possono rompersi
 * quando il layout cambia.
 *
 * I testi stanno qui, separati dal componente, per due motivi:
 *   1. si rileggono e si correggono senza aprire il codice di rendering;
 *   2. l'interruttore DEMO_TOUR_ENABLED è un punto solo, facile da trovare.
 *
 * Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §7
 */

import { Trophy, Vote, Star, Medal, Sparkles, type LucideIcon } from 'lucide-react';

/**
 * Interruttore del tour — l'unica riga da cambiare per accenderlo o spegnerlo.
 *
 * A `false` la demo torna esattamente com'era prima della Fase C: nessun
 * riquadro all'ingresso e la voce "Rivedi il tour guidato" sparisce dal menu
 * della barra demo, invece di restare lì a non fare nulla.
 */
export const DEMO_TOUR_ENABLED = true;

/**
 * Il tour si considera visto per la durata della scheda, non per sempre:
 * chi riapre la demo domani lo rivede, chi cambia pagina adesso no.
 * `sessionStorage` e non `localStorage` proprio per questo.
 */
export const DEMO_TOUR_STORAGE_KEY = 'pagellefc:demo-tour-seen';

/**
 * Evento che riavvia il tour. Lo emette la voce di menu in DemoBanner,
 * lo ascolta DemoTour. Vive qui e non nel banner perché è il tour a definire
 * il proprio contratto, non chi lo invoca.
 */
export const DEMO_TOUR_RESTART_EVENT = 'pagellefc:demo-tour-restart';

export interface DemoTourStep {
    /** Identificativo stabile, usato come key di React. */
    id: string;
    icon: LucideIcon;
    /** Classi Tailwind del colore d'accento della schermata. */
    color: string;
    bgColor: string;
    title: string;
    body: string;
    /** Etichetta del bottone di avanzamento, quando "Avanti" non basta. */
    nextLabel?: string;
}

/**
 * Cinque schermate, non otto.
 *
 * La sequenza del piano originale arrivava al voto al quinto passo, dopo
 * quattro tappe di sola lettura. Ma il voto è la cosa che il visitatore deve
 * *fare*: arriva secondo, subito dopo il benvenuto. Carte e trofei diventano
 * allora la risposta alla domanda che il voto solleva da sé — "e adesso che
 * fine fa quel voto?".
 *
 * Restano fuori storico e statistiche: raccontano meno del tempo che chiedono,
 * e chi è incuriosito ci arriva dal menu.
 */
export const DEMO_TOUR_STEPS: DemoTourStep[] = [
    {
        id: 'welcome',
        icon: Trophy,
        color: 'text-primary',
        bgColor: 'bg-primary/20',
        title: 'Benvenuto in Pagelle FC',
        body: 'Dopo ogni partita i giocatori si votano a vicenda, e da quei voti nascono statistiche, carte giocatore e trofei. Stai esplorando una squadra di esempio: guarda pure ovunque, nulla viene salvato.',
        nextLabel: 'Fammi vedere',
    },
    {
        id: 'vote',
        icon: Vote,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/20',
        title: 'Tocca a te: vota un compagno',
        body: 'Nella sezione Vota trovi la partita appena giocata, e manca solo il tuo voto. Trascina lo slider e invia: la sessione si chiude e compaiono le medie finali. È il giro completo che l\'app fa ogni settimana.',
    },
    {
        id: 'player-card',
        icon: Star,
        color: 'text-accent',
        bgColor: 'bg-accent/20',
        title: 'I voti diventano una carta',
        body: 'Ogni giocatore ha la sua carta in stile FIFA, con gli attributi votati dai compagni. Chi vince il Pallone d\'Oro si porta un bonus nella stagione successiva: lo riconosci dal badge dorato.',
    },
    {
        id: 'awards',
        icon: Medal,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/20',
        title: 'E i momenti migliori restano',
        body: 'Migliore in campo, MVP del mese, Pallone d\'Oro di fine stagione: i trofei si generano da soli e diventano card da condividere fuori dall\'app.',
    },
    {
        id: 'explore',
        icon: Sparkles,
        color: 'text-primary',
        bgColor: 'bg-primary/20',
        title: 'Ora tocca a te',
        body: 'Muoviti liberamente: tutto quello che vedi funziona davvero, solo che non viene salvato. Quando vuoi la stessa cosa con la tua squadra, il pulsante "Crea il tuo team" ti aspetta nella barra qui sopra.',
        nextLabel: 'Esplora la demo',
    },
];

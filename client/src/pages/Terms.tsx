import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Data dell'ultima revisione sostanziale del documento (non la data di rendering).
const LAST_UPDATED = '13 settembre 2026';
const CONTACT_EMAIL = 'pagelleFC@proton.me';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4" /> Torna alla home</Link></Button>
        <article className="prose prose-invert max-w-none">
          <h1 className="font-display text-4xl font-bold text-foreground">Termini di Servizio</h1>
          <p className="text-sm text-muted-foreground">Ultimo aggiornamento: {LAST_UPDATED}</p>
          <p className="text-muted-foreground">
            I presenti Termini regolano l'utilizzo di <strong>Pagelle FC</strong> (di seguito il &laquo;Servizio&raquo;),
            disponibile come applicazione web e come app Android. Utilizzando il Servizio accetti i presenti Termini.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">1. Oggetto e titolare</h2>
          <p className="text-muted-foreground">
            Pagelle FC è un servizio per la valutazione collaborativa delle prestazioni dei giocatori in squadre di calcio
            amatoriale: consente di creare carte giocatore in stile videogioco, votare le partite, gestire la squadra,
            consultare statistiche e generare card celebrative. Il Servizio è fornito da <strong>Simone Mele</strong>
            (&laquo;noi&raquo;), come progetto personale non professionale. Contatto:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">2. Versione Alpha</h2>
          <p className="text-muted-foreground">
            Il Servizio è attualmente in versione <strong>Alpha</strong>: è in continua evoluzione e può contenere errori,
            subire interruzioni o modifiche delle funzionalità. In questa fase non possiamo garantire la conservazione
            permanente dei dati; ti invitiamo a non affidare al Servizio informazioni di cui non possiedi altra copia.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">3. Account e registrazione</h2>
          <p className="text-muted-foreground">
            Per usare le funzionalità principali devi creare un account fornendo dati veritieri (nome, email, data di nascita)
            e mantenendo riservata la password. Sei responsabile di tutte le attività svolte tramite il tuo account. Il
            Servizio è riservato agli utenti di età pari o superiore a <strong>16 anni</strong>; i minori di 16 anni possono
            registrarsi solo con il consenso di chi esercita la responsabilità genitoriale.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">4. Giocatori ospiti e modalità Demo</h2>
          <p className="text-muted-foreground">
            Un amministratore di squadra può aggiungere <strong>giocatori ospiti</strong> senza registrazione tramite un link
            di invito: gli ospiti hanno permessi di sola lettura e possono votare la partita a cui sono invitati.
            La <strong>modalità Demo</strong> (<code>/demo</code>) permette di provare il Servizio senza account, in sola
            lettura e con dati dimostrativi. Chi aggiunge un ospite dichiara di averne titolo e di rispettarne i diritti.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">5. Servizio gratuito e supporto volontario</h2>
          <p className="text-muted-foreground">
            Pagelle FC è <strong>gratuito</strong>: non è previsto alcun pagamento obbligatorio per accedere alle funzionalità.
          </p>
          <p className="text-muted-foreground mt-2">
            Se il Servizio ti piace, puoi supportarlo in modo del tutto volontario tramite la funzione &laquo;Offrimi un
            caffè&raquo; nella barra laterale, che rimanda alla piattaforma esterna <strong>Ko-fi</strong>. Si tratta di una
            donazione libera, non vincolata ad alcun servizio o vantaggio aggiuntivo e non rimborsabile in quanto atto liberale.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">6. Contenuti degli utenti</h2>
          <p className="text-muted-foreground">
            Resti titolare dei contenuti che carichi (foto profilo, biografia) e generi (voti, carte giocatore). Concedi a
            noi una licenza limitata, gratuita e non esclusiva a trattare, elaborare e mostrare tali contenuti nell'ambito del
            Servizio (ad esempio per calcolare statistiche e generare le card). Garantisci di avere il diritto di caricare i
            contenuti e di non violare diritti di terzi. I voti sono valutazioni personali e soggettive tra membri del team.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">7. Condivisione delle card celebrative</h2>
          <p className="text-muted-foreground">
            Le card celebrative dispongono di una pagina pubblica condivisibile senza login. Scegliendo di condividere una
            card ne rendi il contenuto (inclusi nome, foto e statistiche in essa presenti) accessibile a chiunque disponga del
            link. Condividi tali contenuti in modo responsabile e nel rispetto delle persone coinvolte.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">8. Condotta degli utenti</h2>
          <p className="text-muted-foreground">
            È vietato usare il Servizio per attività illecite, offensive, diffamatorie, fraudolente o lesive di terzi, per
            caricare contenuti che violino diritti altrui, o per tentare di comprometterne la sicurezza. Le valutazioni devono
            essere espresse nel rispetto dei compagni. Possiamo sospendere o chiudere gli account in caso di violazione.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">9. Proprietà intellettuale</h2>
          <p className="text-muted-foreground">
            Tutti i diritti sul software, sul marchio, sulla grafica e sui contenuti del Servizio appartengono al titolare. I
            contenuti caricati dagli utenti restano di loro proprietà, come indicato al punto 6.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">10. Distribuzione tramite app store</h2>
          <p className="text-muted-foreground">
            La versione Android è distribuita tramite <strong>Google Play</strong>. All'installazione e all'uso tramite lo
            store si applicano anche i termini e le condizioni della relativa piattaforma, in aggiunta ai presenti Termini.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">11. Limitazione di responsabilità</h2>
          <p className="text-muted-foreground">
            Il Servizio è fornito &laquo;così com'è&raquo; (as is), senza garanzie di continuità, disponibilità o assenza di
            errori. Nei limiti consentiti dalla legge, escludiamo ogni responsabilità per danni indiretti o per la perdita di
            dati. Nulla nei presenti Termini limita i diritti inderogabili riconosciuti ai consumatori dalla legge.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">12. Modifiche, legge applicabile e foro</h2>
          <p className="text-muted-foreground">
            Possiamo modificare i presenti Termini: la versione aggiornata sarà pubblicata in questa pagina. Ai presenti
            Termini si applica la <strong>legge italiana</strong>. Per gli utenti consumatori è competente, in via esclusiva,
            il foro del luogo di residenza o domicilio del consumatore; per gli altri utenti è competente il foro del luogo di
            residenza del titolare.
          </p>
        </article>
      </div>
    </div>
  );
}

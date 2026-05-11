import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4" /> Torna alla home</Link></Button>
        {/* TODO: far revisionare a un legale prima del lancio in produzione */}
        <article className="prose prose-invert max-w-none">
          <h1 className="font-display text-4xl font-bold text-foreground">Termini di Servizio</h1>
          <p className="text-sm text-muted-foreground">Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>

          <h2 className="text-2xl font-bold text-foreground mt-8">1. Oggetto</h2>
          <p className="text-muted-foreground">
            Pagelle FC è un servizio web per la valutazione collaborativa delle prestazioni dei giocatori in squadre amatoriali.
            Fornito da <strong>[NOME COMPLETO]</strong> ("noi").
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">2. Account</h2>
          <p className="text-muted-foreground">
            Per usare il servizio devi creare un account fornendo dati veritieri e mantenendo riservata la password.
            Sei responsabile di tutte le attività svolte tramite il tuo account.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">3. Servizio gratuito e supporto volontario</h2>
          <p className="text-muted-foreground">
            Pagelle FC è un servizio <strong>completamente gratuito</strong>, nato dalla passione per il calcio e creato nel tempo libero.
            Non è previsto alcun pagamento obbligatorio per accedere alle funzionalità dell'app.
          </p>
          <p className="text-muted-foreground mt-2">
            Se l'app ti piace e vuoi dimostrare il tuo apprezzamento, puoi farlo in modo del tutto volontario tramite
            la funzione <strong>"Offrimi un caffè"</strong> presente nella barra laterale. Si tratta di una donazione libera,
            non vincolata ad alcun servizio o vantaggio aggiuntivo, effettuata tramite la piattaforma Buy Me a Coffee.
            Le donazioni non sono rimborsabili in quanto atto liberale volontario.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">4. Comportamento utenti</h2>
          <p className="text-muted-foreground">
            È vietato usare il servizio per attività illecite, offensive, fraudolente o lesive di terzi.
            Possiamo sospendere o chiudere account in caso di violazione.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">5. Proprietà intellettuale</h2>
          <p className="text-muted-foreground">
            Tutti i diritti sul software, sul marchio e sui contenuti del servizio appartengono al titolare.
            I contenuti caricati dagli utenti restano di loro proprietà.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">6. Limitazione di responsabilità</h2>
          <p className="text-muted-foreground">
            Il servizio è fornito "as is". Non garantiamo continuità di servizio o assenza di errori.
            Nei limiti consentiti dalla legge, escludiamo ogni responsabilità per danni indiretti.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">7. Modifiche e foro competente</h2>
          <p className="text-muted-foreground">
            Possiamo modificare i presenti termini. La versione aggiornata sarà pubblicata in questa pagina.
            Per i consumatori si applica la legge italiana e il foro del consumatore. Per gli altri utenti, foro competente: <strong>[FORO]</strong>.
          </p>
        </article>
      </div>
    </div>
  );
}

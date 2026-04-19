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

          <h2 className="text-2xl font-bold text-foreground mt-8">3. Pagamento una tantum</h2>
          <p className="text-muted-foreground">
            L'accesso completo richiede un pagamento una tantum di importo indicato nella pagina di sblocco.
            Il pagamento è <strong>non rimborsabile</strong> salvo i casi previsti dalla normativa applicabile a tutela del consumatore
            (artt. 52–58 D.lgs. 206/2005 ove applicabile).
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

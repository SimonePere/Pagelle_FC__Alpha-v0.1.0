import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4" /> Torna alla home</Link></Button>
        {/* TODO: far revisionare a un legale prima del lancio in produzione */}
        <article className="prose prose-invert max-w-none">
          <h1 className="font-display text-4xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>

          <h2 className="text-2xl font-bold text-foreground mt-8">1. Titolare del trattamento</h2>
          <p className="text-muted-foreground">
            Titolare: <strong>[NOME COMPLETO]</strong>, con sede in <strong>[INDIRIZZO]</strong>, P.IVA/C.F. <strong>[P.IVA]</strong>.
            Contatto: <strong>[EMAIL CONTATTO]</strong>.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">2. Dati raccolti</h2>
          <ul className="text-muted-foreground list-disc pl-6">
            <li>Dati di registrazione: nome, email, password (in forma hash sul server)</li>
            <li>Foto profilo (caricata volontariamente)</li>
            <li>Dati di utilizzo: voti dati ai compagni, partite create, statistiche</li>
            <li>Dati tecnici: cookie tecnici / localStorage per il funzionamento del servizio</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8">3. Finalità e base giuridica</h2>
          <p className="text-muted-foreground">
            I dati sono trattati per fornire il servizio (esecuzione del contratto, art. 6.1.b GDPR), per adempiere obblighi di legge,
            e con il tuo consenso quando richiesto. Nessuna profilazione automatica. Nessun marketing.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">4. Conservazione</h2>
          <p className="text-muted-foreground">
            I dati sono conservati per la durata dell'account. Puoi eliminare l'account in qualsiasi momento dalla pagina Profilo,
            ottenendo la cancellazione di tutti i tuoi dati personali (diritto all'oblio).
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">5. Diritti dell'interessato</h2>
          <p className="text-muted-foreground">
            Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione (artt. 15–22 GDPR).
            Per esercitarli scrivi a <strong>[EMAIL CONTATTO]</strong>. Hai anche diritto di reclamo al Garante Privacy.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">6. Trasferimenti e terze parti</h2>
          <p className="text-muted-foreground">
            Non condividiamo i tuoi dati con terze parti per finalità di marketing. I dati possono essere ospitati presso
            fornitori di hosting cloud (es. MongoDB Atlas) all'interno dello Spazio Economico Europeo.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">7. Sicurezza</h2>
          <p className="text-muted-foreground">
            Adottiamo misure tecniche e organizzative adeguate per proteggere i dati. Le password sono memorizzate in forma cifrata.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">8. Donazioni volontarie</h2>
          <p className="text-muted-foreground">
            Pagelle FC è un progetto gratuito. È possibile supportarlo con una donazione libera tramite la piattaforma
            Buy Me a Coffee (<a href="https://buymeacoffee.com/simonemele" target="_blank" rel="noopener noreferrer" className="text-primary underline">buymeacoffee.com/simonemele</a>).
            Le donazioni sono atti liberali volontari: non raccogliamo dati di pagamento — la transazione avviene interamente
            sulla piattaforma esterna Buy Me a Coffee, soggetta alla propria privacy policy.
            Non condividiamo né trattiamo alcun dato finanziario del donatore.
          </p>
        </article>
      </div>
    </div>
  );
}

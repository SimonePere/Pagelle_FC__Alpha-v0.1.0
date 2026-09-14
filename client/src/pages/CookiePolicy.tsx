import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Data dell'ultima revisione sostanziale del documento (non la data di rendering).
const LAST_UPDATED = '13 settembre 2026';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4" /> Torna alla home</Link></Button>
        <article className="prose prose-invert max-w-none">
          <h1 className="font-display text-4xl font-bold text-foreground">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Ultimo aggiornamento: {LAST_UPDATED}</p>
          <p className="text-muted-foreground">
            Questa pagina spiega quali cookie e tecnologie simili (come la memoria locale del browser) utilizza
            <strong> Pagelle FC</strong>. Per il trattamento dei dati personali vedi la{' '}
            <Link to="/privacy" className="text-primary underline">Informativa sulla Privacy</Link>.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">Cosa usiamo</h2>
          <p className="text-muted-foreground">
            Utilizziamo esclusivamente strumenti <strong>tecnici</strong>, necessari al funzionamento del Servizio:
          </p>
          <ul className="text-muted-foreground list-disc pl-6">
            <li><strong>Token di sessione (JWT):</strong> salvato nella memoria locale (<code>localStorage</code>) del browser per mantenerti autenticato tra una pagina e l'altra.</li>
            <li><strong>Preferenze e cache:</strong> nella memoria locale salviamo alcune preferenze (es. tema chiaro/scuro, tour di benvenuto già visto, squadra attiva) e una cache di dati per rendere l'app più veloce.</li>
            <li><strong>Cookie <code>sidebar:state</code>:</strong> un cookie tecnico che ricorda se la barra laterale è aperta o chiusa (durata 7 giorni).</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8">Servizi esterni</h2>
          <p className="text-muted-foreground">
            Alcune risorse sono caricate da fornitori esterni per far funzionare l'interfaccia. Questi non installano cookie
            di profilazione, ma la connessione ai loro server comporta la comunicazione dell'indirizzo IP del tuo dispositivo:
          </p>
          <ul className="text-muted-foreground list-disc pl-6">
            <li><strong>Google Fonts</strong> — i caratteri tipografici sono serviti dai server di Google, che riceve pertanto il tuo indirizzo IP.</li>
            <li><strong>Ko-fi</strong> — raggiunto solo se scegli di aprire la pagina delle donazioni.</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8">Cosa NON usiamo</h2>
          <ul className="text-muted-foreground list-disc pl-6">
            <li>❌ Cookie di profilazione</li>
            <li>❌ Cookie di marketing o pubblicitari (Facebook, Google Ads, ecc.)</li>
            <li>❌ Strumenti di analytics di terze parti (Google Analytics e simili)</li>
            <li>❌ Pixel di tracciamento pubblicitari</li>
          </ul>

          <p className="text-muted-foreground mt-6">
            Poiché usiamo solo strumenti tecnici necessari al funzionamento, non è richiesto il consenso ai sensi
            dell'art. 122 del Codice Privacy. Mostriamo comunque un'informativa al primo accesso, per trasparenza.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">Gestione</h2>
          <p className="text-muted-foreground">
            Puoi cancellare i cookie e i dati salvati localmente in qualsiasi momento dalle impostazioni del tuo browser, o
            eliminando l'account dalla pagina <strong>Profilo</strong>. La disattivazione degli strumenti tecnici può però
            impedire il corretto funzionamento del Servizio (ad esempio l'accesso).
          </p>
        </article>
      </div>
    </div>
  );
}

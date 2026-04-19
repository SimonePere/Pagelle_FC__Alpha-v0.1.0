import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4" /> Torna alla home</Link></Button>
        {/* TODO: far revisionare a un legale prima del lancio in produzione */}
        <article className="prose prose-invert max-w-none">
          <h1 className="font-display text-4xl font-bold text-foreground">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>

          <h2 className="text-2xl font-bold text-foreground mt-8">Cosa usiamo</h2>
          <p className="text-muted-foreground">
            Pagelle FC utilizza esclusivamente <strong>cookie tecnici</strong> e localStorage del browser per:
          </p>
          <ul className="text-muted-foreground list-disc pl-6">
            <li>Mantenere la sessione di accesso (login)</li>
            <li>Salvare le tue preferenze (tema, onboarding visto)</li>
            <li>Memorizzare lo stato di sblocco app</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8">Cosa NON usiamo</h2>
          <ul className="text-muted-foreground list-disc pl-6">
            <li>❌ Cookie di profilazione</li>
            <li>❌ Cookie di marketing</li>
            <li>❌ Tracker di terze parti</li>
            <li>❌ Pixel pubblicitari (Facebook, Google Ads, ecc.)</li>
          </ul>

          <p className="text-muted-foreground mt-6">
            Poiché usiamo solo cookie tecnici necessari al funzionamento, non è richiesto il consenso ai sensi
            dell'art. 122 Codice Privacy. Mostriamo comunque un'informativa al primo accesso per trasparenza.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">Gestione</h2>
          <p className="text-muted-foreground">
            Puoi cancellare i dati locali in qualsiasi momento dalle impostazioni del browser, o eliminando l'account dalla pagina Profilo.
          </p>
        </article>
      </div>
    </div>
  );
}

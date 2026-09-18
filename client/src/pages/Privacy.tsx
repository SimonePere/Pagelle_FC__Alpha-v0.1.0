import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Data dell'ultima revisione sostanziale del documento (non la data di rendering).
const LAST_UPDATED = '13 settembre 2026';
const CONTACT_EMAIL = 'pagelleFC@proton.me';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4" /> Torna alla home</Link></Button>
        <article className="prose prose-invert max-w-none">
          <h1 className="font-display text-4xl font-bold text-foreground">Informativa sulla Privacy</h1>
          <p className="text-sm text-muted-foreground">Ultimo aggiornamento: {LAST_UPDATED}</p>
          <p className="text-muted-foreground">
            La presente informativa descrive come vengono trattati i dati personali degli utenti di <strong>Pagelle FC</strong>,
            applicazione web e mobile (Android) per la valutazione collaborativa delle prestazioni nelle squadre di calcio
            amatoriale. Il trattamento avviene nel rispetto del Regolamento (UE) 2016/679 (&laquo;GDPR&raquo;) e del
            D.lgs. 196/2003 (&laquo;Codice Privacy&raquo;).
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">1. Titolare del trattamento</h2>
          <p className="text-muted-foreground">
            Titolare del trattamento è <strong>Simone Mele</strong>, persona fisica che sviluppa e gestisce Pagelle FC come
            progetto personale non professionale. Per qualsiasi richiesta relativa ai tuoi dati o per esercitare i tuoi
            diritti puoi scrivere a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">2. Dati che raccogliamo</h2>
          <p className="text-muted-foreground">Trattiamo esclusivamente i dati necessari a far funzionare il servizio:</p>
          <ul className="text-muted-foreground list-disc pl-6">
            <li><strong>Dati di registrazione:</strong> nome, indirizzo email, data di nascita e password (memorizzata solo in forma cifrata con hash bcrypt, mai in chiaro).</li>
            <li><strong>Dati di profilo (facoltativi):</strong> ruolo/posizione in campo, piede preferito, breve biografia e foto profilo, che carichi volontariamente.</li>
            <li><strong>Dati generati dall'uso:</strong> voti dati e ricevuti (scala 1&ndash;10), nomine MVP e &laquo;Man of the Match&raquo;, partite, carte giocatore collaborative, statistiche, classifiche e news.</li>
            <li><strong>Data di nascita:</strong> utilizzata per le funzioni legate all'età (es. bonus &laquo;esperienza&raquo;) e per verificare il requisito di età minima; non viene usata per profilazione.</li>
            <li><strong>Dati tecnici:</strong> un token di autenticazione (JWT) e alcune preferenze/cache salvati nella memoria locale del tuo browser (vedi la <Link to="/cookie-policy" className="text-primary underline">Cookie Policy</Link>).</li>
            <li><strong>Metriche aggregate:</strong> statistiche d'uso e di condivisione delle card celebrative (numero di visualizzazioni, condivisioni per canale, visite alle pagine pubbliche), trattate a fini statistici e di miglioramento del servizio.</li>
          </ul>
          <p className="text-muted-foreground">
            Non raccogliamo categorie particolari di dati (dati sanitari, opinioni, ecc.) e non ti chiediamo dati di
            pagamento. I voti sono valutazioni soggettive espresse dai membri del tuo team.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">3. Giocatori ospiti (External Player)</h2>
          <p className="text-muted-foreground">
            Un amministratore di squadra può aggiungere <strong>giocatori ospiti</strong> senza registrazione, per farli
            votare una singola partita tramite un link di invito personale. Per gli ospiti trattiamo il solo nome scelto
            dall'amministratore e un token di invito temporaneo (con permessi di sola lettura). Se in futuro l'ospite si
            registra, il relativo storico viene collegato al nuovo account.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">4. Modalità Demo</h2>
          <p className="text-muted-foreground">
            La modalità dimostrativa (rotta pubblica <code>/demo</code>) mostra una squadra di esempio con dati fittizi e
            funziona in sola lettura: non richiede registrazione e non raccoglie dati personali del visitatore oltre ai dati
            tecnici minimi necessari alla connessione.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">5. Finalità e basi giuridiche</h2>
          <ul className="text-muted-foreground list-disc pl-6">
            <li><strong>Erogazione del servizio</strong> (creazione account, votazioni, statistiche): esecuzione del contratto — art. 6.1.b GDPR.</li>
            <li><strong>Foto profilo e biografia:</strong> tuo consenso, prestato caricandole e revocabile in ogni momento rimuovendole — art. 6.1.a GDPR.</li>
            <li><strong>Sicurezza, prevenzione degli abusi e statistiche aggregate di utilizzo:</strong> nostro legittimo interesse — art. 6.1.f GDPR.</li>
            <li><strong>Adempimento di obblighi di legge</strong>, ove applicabili — art. 6.1.c GDPR.</li>
          </ul>
          <p className="text-muted-foreground">Non effettuiamo profilazione automatizzata né attività di marketing.</p>

          <h2 className="text-2xl font-bold text-foreground mt-8">6. Contenuti condivisibili (Pagelle FC Awards)</h2>
          <p className="text-muted-foreground">
            L'app genera automaticamente card celebrative (premi, riepiloghi partita) che possono contenere nome, foto e
            statistiche dei giocatori. Ogni card ha una <strong>pagina pubblica</strong> (<code>/c/&lt;id&gt;</code>) accessibile
            senza login. La pagina resta privata finché <strong>tu o un membro del team scegliete di condividerla</strong>
            (es. su WhatsApp, Telegram, Instagram): da quel momento chiunque disponga del link può vederla. Le card sono
            &laquo;fotografie&raquo; storiche e immutabili di un momento; se elimini l'account, i dati personali associati vengono
            rimossi come descritto al punto 8.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">7. Destinatari e fornitori</h2>
          <p className="text-muted-foreground">
            Non vendiamo i tuoi dati e non li condividiamo con terzi per finalità di marketing. Per erogare il servizio ci
            avvaliamo dei seguenti fornitori, che agiscono come responsabili del trattamento o titolari autonomi per le
            rispettive infrastrutture:
          </p>
          <ul className="text-muted-foreground list-disc pl-6">
            <li><strong>MongoDB Atlas</strong> — database che ospita account, voti, statistiche e le immagini (foto profilo e card celebrative).</li>
            <li><strong>Render</strong> — hosting del server applicativo (backend).</li>
            <li><strong>Vercel</strong> — hosting dell'applicazione web (frontend).</li>
            <li><strong>Google Fonts</strong> — i caratteri tipografici sono caricati dai server di Google, che per ciò riceve l'indirizzo IP del tuo dispositivo.</li>
            <li><strong>Ko-fi</strong> — piattaforma esterna usata solo per le donazioni volontarie (punto 11).</li>
            <li><strong>Google Play</strong> — distribuzione della versione Android dell'app.</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8">8. Trasferimenti extra-UE</h2>
          <p className="text-muted-foreground">
            Alcuni dei fornitori sopra indicati possono trattare i dati anche al di fuori dello Spazio Economico Europeo (ad
            esempio negli Stati Uniti). In tali casi il trasferimento avviene sulla base di adeguate garanzie previste dal
            GDPR, in particolare le <strong>Clausole Contrattuali Standard</strong> approvate dalla Commissione europea (artt.
            44&ndash;49 GDPR).
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">9. Conservazione</h2>
          <p className="text-muted-foreground">
            Conserviamo i dati per tutta la durata del tuo account. Puoi richiedere la cancellazione del tuo account in
            qualsiasi momento scrivendo a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>: la cancellazione
            comporta la rimozione dei tuoi dati personali (diritto all'oblio). Copie tecniche residue nei backup vengono
            sovrascritte nei normali cicli di ripristino. I dati puramente statistici e aggregati, che non ti identificano,
            possono essere conservati anche successivamente.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">10. Minori</h2>
          <p className="text-muted-foreground">
            Il servizio è destinato a utenti di età pari o superiore a <strong>16 anni</strong>. I minori di 16 anni possono
            registrarsi solo con il consenso di chi esercita la responsabilità genitoriale. Se ritieni che un minore ci abbia
            fornito dati senza tale consenso, scrivici a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a> e provvederemo alla cancellazione.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">11. Diritti dell'interessato</h2>
          <p className="text-muted-foreground">
            Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione (artt. 15&ndash;22 GDPR),
            oltre al diritto di revocare in ogni momento i consensi prestati. Per esercitarli scrivi a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>. Hai inoltre diritto di
            proporre reclamo all'Autorità Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-primary underline">garanteprivacy.it</a>).
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">12. Sicurezza</h2>
          <p className="text-muted-foreground">
            Adottiamo misure tecniche e organizzative adeguate: le password sono salvate solo come hash (bcrypt), le
            comunicazioni avvengono su connessione cifrata (HTTPS), e il server applica protezioni contro gli abusi (rate
            limiting, header di sicurezza). Nessun sistema è però sicuro al 100%.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">13. Donazioni volontarie</h2>
          <p className="text-muted-foreground">
            Pagelle FC è un progetto gratuito. Puoi supportarlo con una donazione libera tramite la piattaforma esterna{' '}
            <a href="https://ko-fi.com/simonemele" target="_blank" rel="noopener noreferrer" className="text-primary underline">Ko-fi</a>.
            Le donazioni sono atti liberali volontari: la transazione avviene interamente su Ko-fi, soggetta alla propria
            privacy policy. Non raccogliamo né trattiamo alcun dato di pagamento del donatore.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8">14. Modifiche</h2>
          <p className="text-muted-foreground">
            Possiamo aggiornare la presente informativa; la versione vigente è sempre pubblicata in questa pagina, con la data
            di ultimo aggiornamento indicata in alto. In caso di modifiche sostanziali ne daremo evidenza nell'app.
          </p>
        </article>
      </div>
    </div>
  );
}

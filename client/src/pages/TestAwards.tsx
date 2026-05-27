/**
 * TestAwards — Pagina di anteprima per i componenti Pagelle FC Awards.
 *
 * Pagina TEMPORANEA, da rimuovere prima del rilascio in produzione.
 * Mostra PodiumCard + HeroCard (3 varianti) con MOCK data e controlli
 * per cambiare zoom/scala e visualizzare le card a diverse dimensioni.
 *
 * URL: /test-awards  (pubblica, nessun login richiesto per comodità dev)
 */
import { useState } from 'react';
import PodiumCard, { MOCK_PODIUM_DATA } from '@/components/PodiumCard';
import HeroCard, {
    MOCK_MONTHLY_MVP,
    MOCK_BALLON_DOR,
    MOCK_GOLDEN_BOOT,
} from '@/components/HeroCard';
import AwardCardThumbnail, { MOCK_THUMBNAILS } from '@/components/AwardCardThumbnail';
import ShareSheet, { MOCK_SHARE_PROPS } from '@/components/ShareSheet';
import AwardCardModal, {
    MOCK_MODAL_PODIUM,
    MOCK_MODAL_MVP,
    MOCK_MODAL_BALLON,
    MOCK_MODAL_BOOT,
    type AwardCardModalProps,
} from '@/components/AwardCardModal';
import BachecaAwards, { MOCK_BACHECA_AWARDS } from '@/components/BachecaAwards';
import AwardReveal, { MOCK_REVEAL_PODIUM, MOCK_REVEAL_MVP, MOCK_REVEAL_BALLON } from '@/components/AwardReveal';
import PublicCardPage, {
    MOCK_PUBLIC_PODIUM,
    MOCK_PUBLIC_MVP,
    MOCK_PUBLIC_BALLON,
    MOCK_PUBLIC_BOOT,
    MOCK_PUBLIC_LOADING,
    MOCK_PUBLIC_ERROR,
    type PublicCardState,
} from '@/components/PublicCardPage';
import { Button } from '@/components/ui/button';

const SCALE_PRESETS = [
    { label: 'Thumb (0.15)', value: 0.15 },
    { label: 'Small (0.25)', value: 0.25 },
    { label: 'Medium (0.35)', value: 0.35 },
    { label: 'Large (0.5)', value: 0.5 },
    { label: 'Full (1.0)', value: 1.0 },
];

export default function TestAwards() {
    const [scale, setScale] = useState(0.35);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareMinimal, setShareMinimal] = useState(false);
    const [modalProps, setModalProps] = useState<Omit<AwardCardModalProps, 'open' | 'onOpenChange'> | null>(null);
    const [publicState, setPublicState] = useState<PublicCardState>(MOCK_PUBLIC_PODIUM);
    const [revealOpen, setRevealOpen] = useState(false);
    const [revealVariant, setRevealVariant] = useState<'podium' | 'mvp' | 'ballon'>('podium');

    return (
        <div className="min-h-screen bg-background text-foreground p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header */}
                <header className="space-y-3">
                    <h1
                        className="text-4xl font-extrabold tracking-tight"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}
                    >
                        🏆 PAGELLE FC AWARDS — TEST PAGE
                    </h1>
                    <p className="text-muted-foreground">
                        Anteprima dei componenti generati con Lovable. Pagina temporanea per validazione design.
                    </p>
                </header>

                {/* Scale controls */}
                <section className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-border bg-card/50">
                    <span className="text-sm font-semibold text-muted-foreground mr-2">SCALA:</span>
                    {SCALE_PRESETS.map((preset) => (
                        <Button
                            key={preset.value}
                            size="sm"
                            variant={scale === preset.value ? 'default' : 'outline'}
                            onClick={() => setScale(preset.value)}
                        >
                            {preset.label}
                        </Button>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">
                        Dimensione renderizzata: {Math.round(1080 * scale)} × {Math.round(1920 * scale)} px
                    </span>
                </section>

                {/* PodiumCard — Il Podio della Partita */}
                <CardSection
                    title="1. PodiumCard — Il Podio della Partita"
                    subtitle="Tipo MATCH_RECAP · Tema BLU · Mostra il podio dei 3 migliori della partita."
                >
                    <PodiumCard {...MOCK_PODIUM_DATA} scale={scale} />
                </CardSection>

                {/* HeroCard — 3 varianti */}
                <CardSection
                    title="2. HeroCard — MVP del Mese (tema VIOLA)"
                    subtitle="Tipo MONTHLY_MVP · Generata automaticamente il 1° del mese."
                >
                    <HeroCard {...MOCK_MONTHLY_MVP} scale={scale} />
                </CardSection>

                <CardSection
                    title="3. HeroCard — Pallone d'Oro (tema ORO)"
                    subtitle="Tipo BALLON_DOR · Generata automaticamente a fine stagione."
                >
                    <HeroCard {...MOCK_BALLON_DOR} scale={scale} />
                </CardSection>

                <CardSection
                    title="4. HeroCard — Scarpa d'Oro (tema ORO-ROSSO)"
                    subtitle="Tipo GOLDEN_BOOT · Generata automaticamente a fine stagione."
                >
                    <HeroCard {...MOCK_GOLDEN_BOOT} scale={scale} />
                </CardSection>

                {/* Comparative grid - small */}
                <CardSection
                    title="5. Confronto rapido (scala 0.18 fissa)"
                    subtitle="Le 4 card affiancate per vedere coerenza grafica e differenze di tema."
                >
                    <div className="flex flex-wrap gap-6 justify-center">
                        <PodiumCard {...MOCK_PODIUM_DATA} scale={0.18} />
                        <HeroCard {...MOCK_MONTHLY_MVP} scale={0.18} />
                        <HeroCard {...MOCK_BALLON_DOR} scale={0.18} />
                        <HeroCard {...MOCK_GOLDEN_BOOT} scale={0.18} />
                    </div>
                </CardSection>

                {/* AwardCardThumbnail — medium */}
                <CardSection
                    title="6. AwardCardThumbnail — size «medium» (200×355)"
                    subtitle="Mini-card cliccabile per Bacheca Team / Storico. Badge tipo colorato, data, indicatore «Nuovo» pulsante. Click → alert demo."
                >
                    <div className="flex flex-wrap gap-5 justify-center">
                        {MOCK_THUMBNAILS.map((t, i) => (
                            <AwardCardThumbnail
                                key={`thumb-md-${i}`}
                                {...t}
                                size="medium"
                                onClick={() => alert(`Click su: ${t.typeLabel} — ${t.dateLabel}`)}
                            />
                        ))}
                    </div>
                </CardSection>

                {/* AwardCardThumbnail — small */}
                <CardSection
                    title="7. AwardCardThumbnail — size «small» (120×214)"
                    subtitle="Versione compatta per liste fitte (es. riga Storico Partite, anteprima profilo)."
                >
                    <div className="flex flex-wrap gap-4 justify-center">
                        {MOCK_THUMBNAILS.map((t, i) => (
                            <AwardCardThumbnail
                                key={`thumb-sm-${i}`}
                                {...t}
                                size="small"
                                onClick={() => alert(`Click su: ${t.typeLabel} — ${t.dateLabel}`)}
                            />
                        ))}
                    </div>
                </CardSection>

                {/* ShareSheet — versione completa */}
                <CardSection
                    title="8. ShareSheet — bottom-sheet condivisione (tutti i pulsanti)"
                    subtitle="Drawer mobile-first con preview + 4 social + download. Su desktop appare comunque dal basso, su mobile drag-to-close."
                >
                    <div className="flex flex-col items-center gap-4">
                        <Button size="lg" onClick={() => { setShareMinimal(false); setShareOpen(true); }}>
                            Apri ShareSheet (completo)
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Prova «Copia link» → dovrebbe apparire un toast.
                        </p>
                    </div>
                </CardSection>

                {/* ShareSheet — versione ridotta (solo copia link, no download) */}
                <CardSection
                    title="9. ShareSheet — versione minimale"
                    subtitle="Esempio con solo callback abilitati: WhatsApp + Copia link. I pulsanti non passati spariscono."
                >
                    <Button size="lg" variant="outline" onClick={() => { setShareMinimal(true); setShareOpen(true); }}>
                        Apri ShareSheet (minimale)
                    </Button>
                </CardSection>

                {/* Mount unico del drawer, props variabili */}
                <ShareSheet
                    open={shareOpen}
                    onOpenChange={setShareOpen}
                    shareUrl={MOCK_SHARE_PROPS.shareUrl}
                    previewImageUrl={MOCK_SHARE_PROPS.previewImageUrl}
                    cardTitle={MOCK_SHARE_PROPS.cardTitle}
                    onShareWhatsApp={MOCK_SHARE_PROPS.onShareWhatsApp}
                    onShareInstagram={shareMinimal ? undefined : MOCK_SHARE_PROPS.onShareInstagram}
                    onShareTelegram={shareMinimal ? undefined : MOCK_SHARE_PROPS.onShareTelegram}
                    onCopyLink={MOCK_SHARE_PROPS.onCopyLink}
                    onDownloadImage={shareMinimal ? undefined : MOCK_SHARE_PROPS.onDownloadImage}
                />

                {/* AwardCardModal — modale fullscreen con card grande */}
                <CardSection
                    title="10. AwardCardModal — visualizzazione fullscreen"
                    subtitle="Si apre cliccando una thumbnail. Card scalata per riempire viewport (resize live), header con «Chiudi», footer con «Condividi» che apre lo ShareSheet integrato."
                >
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Button onClick={() => setModalProps(MOCK_MODAL_PODIUM)}>
                            Apri Il Podio della Partita
                        </Button>
                        <Button variant="secondary" onClick={() => setModalProps(MOCK_MODAL_MVP)}>
                            Apri MVP del Mese
                        </Button>
                        <Button variant="secondary" onClick={() => setModalProps(MOCK_MODAL_BALLON)}>
                            Apri Pallone d'Oro
                        </Button>
                        <Button variant="secondary" onClick={() => setModalProps(MOCK_MODAL_BOOT)}>
                            Apri Scarpa d'Oro
                        </Button>
                    </div>
                </CardSection>

                {modalProps && (
                    <AwardCardModal
                        {...modalProps}
                        open={modalProps !== null}
                        onOpenChange={(o) => { if (!o) setModalProps(null); }}
                    />
                )}

                {/* BachecaAwards — sezione team con filtri */}
                <CardSection
                    title="11. BachecaAwards — sezione completa (9 trofei)"
                    subtitle="Griglia responsive 2/3/4/5 col. Filtri tipo (Tutti·Partite·MVP·Stagionali) + anno (2025·2026). Click → apre AwardCardModal con share integrato."
                >
                    <div className="w-full">
                        <BachecaAwards
                            awards={MOCK_BACHECA_AWARDS}
                            onMarkSeen={(id) => console.log('mark seen:', id)}
                            onShareWhatsApp={(a) => console.log('share WA:', a.cardTitle)}
                            onShareInstagram={(a) => console.log('share IG:', a.cardTitle)}
                            onShareTelegram={(a) => console.log('share TG:', a.cardTitle)}
                            onCopyLink={(a) => navigator.clipboard?.writeText(a.shareUrl)}
                            onDownloadImage={(a) => console.log('download:', a.cardTitle)}
                        />
                    </div>
                </CardSection>

                {/* BachecaAwards — stato loading */}
                <CardSection
                    title="12. BachecaAwards — stato loading"
                    subtitle="Skeleton 8 placeholder mentre si scarica la lista dal backend."
                >
                    <div className="w-full">
                        <BachecaAwards awards={[]} loading />
                    </div>
                </CardSection>

                {/* BachecaAwards — stato vuoto */}
                <CardSection
                    title="13. BachecaAwards — stato vuoto (nessun trofeo)"
                    subtitle="Team appena creato, ancora nessuna partita giocata."
                >
                    <div className="w-full">
                        <BachecaAwards awards={[]} />
                    </div>
                </CardSection>

                {/* PublicCardPage — anteprima embedded */}
                <CardSection
                    title="14. PublicCardPage — pagina pubblica /c/:slug"
                    subtitle="Pagina raggiungibile via QR/link, no login. Cambia stato dai bottoni qui sotto per vedere le varianti."
                >
                    <div className="w-full space-y-4">
                        <div className="flex flex-wrap gap-2 justify-center">
                            <Button size="sm" onClick={() => setPublicState(MOCK_PUBLIC_PODIUM)}>Recap</Button>
                            <Button size="sm" variant="secondary" onClick={() => setPublicState(MOCK_PUBLIC_MVP)}>MVP Mese</Button>
                            <Button size="sm" variant="secondary" onClick={() => setPublicState(MOCK_PUBLIC_BALLON)}>Pallone d'Oro</Button>
                            <Button size="sm" variant="secondary" onClick={() => setPublicState(MOCK_PUBLIC_BOOT)}>Scarpa d'Oro</Button>
                            <Button size="sm" variant="outline" onClick={() => setPublicState(MOCK_PUBLIC_LOADING)}>Loading</Button>
                            <Button size="sm" variant="outline" onClick={() => setPublicState(MOCK_PUBLIC_ERROR)}>Error</Button>
                        </div>

                        {/* Anteprima embedded — mostra a finta dimensione mobile */}
                        <div className="flex justify-center">
                            <div
                                className="w-[390px] h-[780px] border-4 border-border rounded-[40px] overflow-hidden shadow-2xl"
                                style={{ resize: 'both' }}
                            >
                                <div className="w-full h-full overflow-y-auto">
                                    <PublicCardPage state={publicState} />
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                            Anteprima 390×780 (iPhone 13 circa). Il bordo serve solo a inquadrare — la pagina reale occupa 100vh/100vw.
                        </p>
                    </div>
                </CardSection>

                {/* AwardReveal — animazione cerimoniale */}
                <CardSection
                    title="15. AwardReveal — animazione cerimoniale"
                    subtitle="Click su un bottone per aprire l'animazione fullscreen (6s). Skippabile con X o click sullo sfondo."
                >
                    <div className="w-full space-y-4">
                        <div className="flex flex-wrap gap-2 justify-center">
                            <Button size="sm" onClick={() => { setRevealVariant('podium'); setRevealOpen(true); }}>Reveal Recap</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setRevealVariant('mvp'); setRevealOpen(true); }}>Reveal MVP</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setRevealVariant('ballon'); setRevealOpen(true); }}>Reveal Pallone d'Oro</Button>
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                            L'animazione si chiude automaticamente dopo 7s oppure premendo X / tap sullo sfondo.
                        </p>
                    </div>
                </CardSection>

                {/* AwardReveal Portal — vive fuori dal flusso */}
                <AwardReveal
                    open={revealOpen}
                    onComplete={() => setRevealOpen(false)}
                    onShareClick={() => { setRevealOpen(false); console.log('[test] share from reveal'); }}
                    card={
                        revealVariant === 'podium'
                            ? MOCK_REVEAL_PODIUM.card
                            : revealVariant === 'mvp'
                                ? MOCK_REVEAL_MVP.card
                                : MOCK_REVEAL_BALLON.card
                    }
                    heroName={
                        revealVariant === 'podium'
                            ? 'Marco'
                            : revealVariant === 'mvp'
                                ? 'Marco'
                                : 'Luca'
                    }
                />

                {/* Footer dev info */}
                <footer className="pt-10 text-xs text-muted-foreground border-t border-border">
                    <p>
                        File: <code>client/src/pages/TestAwards.tsx</code> ·{' '}
                        <span className="text-red-400">RIMUOVERE PRIMA DEL DEPLOY PRODUZIONE</span>
                    </p>
                </footer>
            </div>
        </div>
    );
}

function CardSection({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex justify-center p-6 rounded-lg bg-muted/30 border border-border">
                {children}
            </div>
        </section>
    );
}


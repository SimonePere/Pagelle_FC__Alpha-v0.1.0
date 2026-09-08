/**
 * AwardRevealManager — overlay top-level che gestisce il "cerimoniale"
 * di rivelazione dei nuovi trofei (confetti, fanfara, countdown).
 *
 * Flusso:
 *  1. Si sottoscrive a `state.awards.pendingAwards` (poll in AppSidebar +
 *     polling qui mount + 60s + focus + visibility).
 *  2. Mostra il primo award READY non ancora visto dal backend (`viewedBy`).
 *  3. Su `onComplete` / chiusura ShareSheet → `markAwardViewed(id)` → il
 *     backend aggiorna `viewedBy`, l'award esce da pendingAwards → next.
 *  4. Su `onShareClick` → chiude reveal, apre ShareSheet inline.
 *
 * POLICY: TUTTI gli award pending vengono mostrati in coda (dal più recente
 * al più vecchio). Il cuore del prodotto è che ogni membro del team viva il
 * cerimoniale di ogni trofeo: nessun auto-dismiss silenzioso. Se un utente
 * non ha aperto l'app per giorni e si sono accumulati 5 trofei, ne vedrà 5
 * uno dopo l'altro.
 *
 * Anti-replay: stato IN-MEMORIA `dismissedIds` (NON sessionStorage — persisteva
 * tra refresh causando reveal mancati). Il backend `viewedBy` è l'unica fonte
 * di verità cross-device/cross-session: gli altri membri del team vedono il
 * reveal al prossimo focus/poll finché non lo aprono loro stessi.
 *
 * Disabilitato per: guest, visitatori in modalità demo, non autenticati,
 * pagine pubbliche `/c/:id` e auth.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import type { RootState } from '@/redux/store/store';
import { markAwardViewed, fetchPendingAwards } from '@/redux/slices/awardsSlice';
import AwardReveal from '@/components/AwardReveal';
import ShareSheet from '@/components/ShareSheet';
import type { AwardModalCard } from '@/components/AwardCardModal';
import { mapAwardToCard, getAwardTitle } from '@/utils/awardMapping';
import { useAwardShareActions } from '@/hooks/useAwardShareActions';

export default function AwardRevealManager() {
    const dispatch = useDispatch();
    const location = useLocation();

    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
    const isGuest = useSelector((s: RootState) => s.auth.isGuest);
    const isDemo = useSelector((s: RootState) => s.auth.isDemo);
    const pendingAwards = useSelector((s: RootState) => s.awards.pendingAwards);

    const {
        shareWhatsApp,
        shareTelegram,
        shareInstagram,
        copyLink,
        downloadImage,
        resolveShareUrl,
    } = useAwardShareActions();

    // ID già "dismissed" in questa esecuzione del processo (anti-replay durante
    // la finestra tra dispatch(markAwardViewed) e il poll che rinfresca la lista).
    // NON persistente: dopo F5 il backend è l'unica fonte di verità.
    const dismissedIds = useRef<Set<string>>(new Set());
    // Trigger di re-render manuale quando aggiungiamo a dismissedIds
    const [dismissBump, setDismissBump] = useState(0);

    // Disabilita reveal su pagine pubbliche / auth
    const isOnPublicCard = location.pathname.startsWith('/c/');
    const isOnAuthPage = location.pathname.startsWith('/login')
        || location.pathname.startsWith('/register')
        || location.pathname.startsWith('/promote-guest');
    // 🎬 In modalità demo il cerimoniale è SPENTO, ma i trofei restano.
    //
    //    La policy normale è mostrare in coda tutti gli award non ancora
    //    visti: giusto per un membro del team, che ne accumula qualcuno
    //    saltando un paio di partite. Ma il visitatore della demo non ne ha
    //    visto NESSUNO, quindi al primo ingresso si beccherebbe l'intera
    //    bacheca uno dopo l'altro — confetti e fanfara compresi — senza
    //    poter fare altro. Un muro, proprio nel momento in cui dovrebbe
    //    farsi un'idea dell'app.
    //
    //    Le card restano visibili e sfogliabili nella bacheca /awards, dove
    //    il visitatore le apre quando vuole lui.
    const enabled = isAuthenticated && !isGuest && !isDemo && !isOnPublicCard && !isOnAuthPage;

    // Poll dei pending awards: anche se AppSidebar fa già lo stesso, lo replichiamo
    // qui per garantire la consegna del reveal a TUTTI i membri del team anche
    // su pagine senza sidebar (es. PublicCard non rientra perché enabled=false).
    // Frequenze identiche: mount + 60s + window focus + visibility change.
    useEffect(() => {
        if (!enabled) return;
        const refetch = () => {
            // @ts-expect-error redux-thunk typing
            dispatch(fetchPendingAwards());
        };
        refetch();
        const intervalId = window.setInterval(refetch, 60_000);
        const onFocus = () => refetch();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') refetch();
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, dispatch]);

    // Trova il prossimo award da rivelare.
    // POLICY: mostriamo TUTTI gli award pending in coda, dal più recente al
    // più vecchio (pendingAwards è già DESC per generatedAt dal backend).
    // Il cuore del prodotto è che i membri del team vivano il "cerimoniale"
    // per ogni nuovo trofeo — non vogliamo perdere reveal silenziosamente.
    // Dopo cleanup(), il bump del memo trova il prossimo non-dismissed e
    // l'effect di apertura lo mostra automaticamente.
    const next = useMemo(() => {
        if (!enabled) return null;
        const candidates = pendingAwards.filter(
            a => a.status === 'READY' && !dismissedIds.current.has(a.id),
        );
        return candidates[0] || null;
        // dismissBump forza il ricalcolo quando dismissedIds.current cambia (ref non triggera memo)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, pendingAwards, dismissBump]);

    const [revealOpen, setRevealOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Quando arriva un award nuovo, apri il reveal.
    // Marca SUBITO come dismissed (in-memoria) così nessun re-render / poll
    // può riaprire lo stesso award mentre è a schermo. Il cleanup finale
    // notificherà il backend (markAwardViewed) per persistere.
    useEffect(() => {
        if (next && !revealOpen && !shareOpen && !dismissedIds.current.has(next.id)) {
            dismissedIds.current.add(next.id);
            setCurrentId(next.id);
            setRevealOpen(true);
        }
    }, [next, revealOpen, shareOpen]);

    if (!enabled || !currentId) return null;

    // Trova l'award corrente (può essere stato rimosso da markViewed)
    const award = pendingAwards.find(a => a.id === currentId);
    if (!award) {
        if (revealOpen) setRevealOpen(false);
        if (shareOpen) setShareOpen(false);
        return null;
    }

    const card = mapAwardToCard(
        award.type,
        award.payload,
        award.shareUrl || '',
    ) as AwardModalCard;

    const heroName = award.payload.hero?.name || award.payload.podium?.[0]?.name;
    const shareUrl = resolveShareUrl(award);
    const cardTitle = getAwardTitle(award.type, award.payload);
    const previewImageUrl = award.imageSquareUrl || award.imageUrl || undefined;

    const cleanup = () => {
        // dismissedIds già popolato all'apertura. Bump per forzare il memo a
        // ricalcolare e trovare il prossimo award (se esiste).
        setDismissBump(b => b + 1);
        // Marca visto sul backend (idempotente). L'award esce da pendingAwards.
        // @ts-expect-error redux-thunk typing
        dispatch(markAwardViewed(currentId));
        setCurrentId(null);
    };

    const handleRevealComplete = () => {
        // Fine animazione / skip senza click "Condividi"
        setRevealOpen(false);
        cleanup();
    };

    const handleShareClick = () => {
        // Chiude reveal, apre ShareSheet (NON naviga via). Manteniamo currentId
        // attivo finché il ShareSheet non viene chiuso, così l'utente può usare
        // tutte le azioni di share contro lo stesso award.
        setRevealOpen(false);
        setShareOpen(true);
    };

    const handleShareSheetClose = (open: boolean) => {
        if (!open) {
            setShareOpen(false);
            // Solo ora marchiamo come visto (l'utente ha completato il flusso)
            cleanup();
        }
    };

    return (
        <>
            <AwardReveal
                open={revealOpen}
                onComplete={handleRevealComplete}
                onShareClick={handleShareClick}
                card={card}
                heroName={heroName}
            />
            <ShareSheet
                open={shareOpen}
                onOpenChange={handleShareSheetClose}
                shareUrl={shareUrl}
                previewImageUrl={previewImageUrl}
                cardTitle={cardTitle}
                onShareWhatsApp={() => shareWhatsApp(award)}
                onShareTelegram={() => shareTelegram(award)}
                onShareInstagram={() => shareInstagram(award)}
                onCopyLink={() => copyLink(award)}
                onDownloadImage={() => downloadImage(award)}
            />
        </>
    );
}

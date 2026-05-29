/**
 * PublicCard — wrapper della pagina pubblica `/c/:cardId`.
 *
 * Responsabilità:
 *  - Legge `:cardId` dalla URL
 *  - Dispatcha `fetchPublicAward` (endpoint senza auth)
 *  - Mappa `award.payload` → props di PodiumCard/HeroCard via `mapAwardToCard`
 *  - Passa lo stato a `PublicCardPage` (loading / error / data)
 *  - Recupera anche il nome del team (necessario per il titolo "Generata da ...") —
 *    al momento non disponibile nell'endpoint pubblico, quindi usiamo un fallback
 *    generico "una squadra di Pagelle FC". TODO: arricchire endpoint backend.
 *
 * NOTA: questa pagina NON richiede login. È il punto d'arrivo di:
 *  - QR code stampato sulla card
 *  - link condivisi via WhatsApp/Telegram/etc.
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/redux/store/store';
import { fetchPublicAward, clearPublicAward } from '@/redux/slices/awardsSlice';
import PublicCardPage, { type PublicCardState } from '@/components/PublicCardPage';
import { mapAwardToCard, getAwardTitle } from '@/utils/awardMapping';

export default function PublicCard() {
    const { cardId } = useParams<{ cardId: string }>();
    const dispatch = useDispatch();
    const { publicAward, isLoadingPublic, error } = useSelector((s: RootState) => s.awards);

    useEffect(() => {
        if (cardId) {
            // @ts-expect-error redux-thunk typing
            dispatch(fetchPublicAward(cardId));
        }
        return () => {
            dispatch(clearPublicAward());
        };
    }, [cardId, dispatch]);

    // Costruisci lo stato per PublicCardPage in base al caricamento
    const state: PublicCardState = (() => {
        if (isLoadingPublic || (!publicAward && !error)) {
            return { kind: 'loading' };
        }
        if (error || !publicAward) {
            return { kind: 'error', message: error || undefined };
        }
        // Se l'award è ancora in generazione mostra loading "soft"
        if (publicAward.status !== 'READY') {
            return { kind: 'loading' };
        }

        const card = mapAwardToCard(
            publicAward.type,
            publicAward.payload,
            publicAward.shareUrl || window.location.href,
        );

        return {
            kind: 'data',
            card,
            cardTitle: getAwardTitle(publicAward.type, publicAward.payload),
            // Endpoint pubblico non espone il nome team (privacy/scope) → fallback generico.
            // Future: aggiungere `teamName` (non identificabile) al payload pubblico.
            teamName: 'una squadra Pagelle FC',
            generatedAt: new Date(publicAward.generatedAt),
        };
    })();

    return (
        <PublicCardPage
            state={state}
            appStoreUrl="#"
            playStoreUrl="#"
        />
    );
}

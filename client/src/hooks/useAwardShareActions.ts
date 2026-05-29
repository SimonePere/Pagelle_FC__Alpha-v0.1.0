/**
 * useAwardShareActions — hook che incapsula tutte le azioni di condivisione
 * di un Award. Centralizza la logica (toast, fallback URL, tracking) così
 * che la pagina Bacheca e l'overlay di Reveal usino lo stesso codice.
 *
 * Pattern: passa l'award al momento della chiamata (NON al momento dell'hook),
 * perché spesso lo stesso componente ne condivide tanti.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useToast } from '@/hooks/use-toast';
import { trackAwardShare } from '@/redux/slices/awardsSlice';
import { getAwardTitle } from '@/utils/awardMapping';
import type { Award } from '@/types/award';

type Channel = 'whatsapp' | 'instagram' | 'telegram' | 'copyLink' | 'download';

export function useAwardShareActions() {
    const dispatch = useDispatch();
    const { toast } = useToast();

    const track = useCallback((awardId: string, channel: Channel) => {
        // @ts-expect-error redux-thunk typing
        dispatch(trackAwardShare({ awardId, channel }));
    }, [dispatch]);

    // shareUrl può essere null se l'award è ancora PENDING → fallback su /c/:id
    const resolveShareUrl = useCallback((award: Award): string =>
        award.shareUrl || `${window.location.origin}/c/${award.id}`,
        []);

    const shareWhatsApp = useCallback((award: Award) => {
        const url = resolveShareUrl(award);
        const text = `${getAwardTitle(award.type, award.payload)} — guarda su Pagelle FC: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        track(award.id, 'whatsapp');
    }, [resolveShareUrl, track]);

    const shareTelegram = useCallback((award: Award) => {
        const url = resolveShareUrl(award);
        const text = `${getAwardTitle(award.type, award.payload)} — guarda su Pagelle FC`;
        window.open(
            `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
            '_blank',
        );
        track(award.id, 'telegram');
    }, [resolveShareUrl, track]);

    const shareInstagram = useCallback((award: Award) => {
        // Instagram NON espone un share-to-story URL su web. Su mobile esiste un
        // deeplink `instagram-stories://share?...` MA richiede che l'immagine sia
        // già nel device come file (e funziona solo se IG app è installata).
        // Workaround robusto cross-platform: copia link + istruisce l'utente.
        const url = resolveShareUrl(award);
        navigator.clipboard?.writeText(url).catch(() => { /* noop */ });
        toast({
            title: 'Link copiato',
            description: 'Apri Instagram e incollalo nella tua Storia!',
        });
        track(award.id, 'instagram');
    }, [resolveShareUrl, track, toast]);

    const copyLink = useCallback((award: Award) => {
        // NB: la COPIA effettiva avviene in ShareSheet (textarea interno al
        // Drawer per evitare il focus trap di Radix che faceva fallire
        // execCommand su HTTP/mobile). Qui solo tracking analytics.
        track(award.id, 'copyLink');
    }, [track]);

    const downloadImage = useCallback((award: Award) => {
        // Rotta backend dedicata: invia PNG con Content-Disposition: attachment.
        // Vantaggi: download nativo browser, niente CORS, raggiungibile da mobile LAN.
        // variant=story (1080x1920) = la card "principale" mostrata nel reveal.
        // (square=1080x1080 è la versione croppata per IG feed/WhatsApp anteprima)
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
        const downloadUrl = `${apiBase}/awards/public/${award.id}/download?variant=story`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `pagelle-fc-${award.id}.png`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        track(award.id, 'download');
    }, [track]);

    return {
        shareWhatsApp,
        shareTelegram,
        shareInstagram,
        copyLink,
        downloadImage,
        resolveShareUrl,
    };
}

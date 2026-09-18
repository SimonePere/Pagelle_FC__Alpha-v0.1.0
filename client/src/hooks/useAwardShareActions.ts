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
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useToast } from '@/hooks/use-toast';
import { trackAwardShare } from '@/redux/slices/awardsSlice';
import { getAwardTitle } from '@/utils/awardMapping';
import type { Award } from '@/types/award';

// blob → base64 senza prefisso "data:...,"
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

type Channel = 'whatsapp' | 'instagram' | 'telegram' | 'copyLink' | 'download';

export function useAwardShareActions() {
    const dispatch = useDispatch();
    const { toast } = useToast();

    const track = useCallback((awardId: string, channel: Channel) => {
        // @ts-expect-error redux-thunk typing
        dispatch(trackAwardShare({ awardId, channel }));
    }, [dispatch]);

    // Per social preview coerenti, preferiamo una pagina share lato backend con OG dinamico.
    // Fallback: shareUrl persistita (storica) o route pubblica frontend /c/:id.
    const resolveShareUrl = useCallback((award: Award): string => {
        const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
        if (apiBase) {
            return `${apiBase}/awards/public/${award.id}/share`;
        }
        return award.shareUrl || `${window.location.origin}/c/${award.id}`;
    }, []);

    // Foglio di condivisione nativo (mostra WhatsApp, Telegram, Instagram, ecc.
    // già installati) invece di aprire la pagina web dentro il WebView.
    const nativeShare = useCallback(async (award: Award) => {
        const url = resolveShareUrl(award);
        await Share.share({
            title: 'Pagelle FC',
            text: `${getAwardTitle(award.type, award.payload)} — guarda su Pagelle FC`,
            url,
            dialogTitle: 'Condividi la card',
        });
    }, [resolveShareUrl]);

    const shareWhatsApp = useCallback(async (award: Award) => {
        if (Capacitor.isNativePlatform()) {
            await nativeShare(award);
            track(award.id, 'whatsapp');
            return;
        }
        const url = resolveShareUrl(award);
        const text = `${getAwardTitle(award.type, award.payload)} — guarda su Pagelle FC: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        track(award.id, 'whatsapp');
    }, [resolveShareUrl, nativeShare, track]);

    const shareTelegram = useCallback(async (award: Award) => {
        if (Capacitor.isNativePlatform()) {
            await nativeShare(award);
            track(award.id, 'telegram');
            return;
        }
        const url = resolveShareUrl(award);
        const text = `${getAwardTitle(award.type, award.payload)} — guarda su Pagelle FC`;
        window.open(
            `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
            '_blank',
        );
        track(award.id, 'telegram');
    }, [resolveShareUrl, nativeShare, track]);

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

    const downloadImage = useCallback(async (award: Award) => {
        // Rotta backend dedicata: restituisce attachment.
        // Usiamo story (1080x1920) per avere la card intera, non tagliata.
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
        const variant = 'story';
        const downloadUrl = `${apiBase}/awards/public/${award.id}/download?variant=${variant}`;

        try {
            const response = await fetch(downloadUrl, { method: 'GET' });
            if (!response.ok) {
                let message = `Errore download (${response.status})`;
                try {
                    const data = await response.json();
                    message = data?.error || message;
                } catch {
                    // noop
                }
                throw new Error(message);
            }

            const blob = await response.blob();
            if (!blob || blob.size === 0) {
                throw new Error('File vuoto o non disponibile');
            }

            const contentDisposition = response.headers.get('content-disposition');
            const ext = detectImageExt(blob.type);
            const fallbackName = buildFallbackFilename(award, variant, ext);
            const filename = parseFilenameFromDisposition(contentDisposition) || fallbackName;

            if (Capacitor.isNativePlatform()) {
                const base64 = await blobToBase64(blob);
                const written = await Filesystem.writeFile({
                    path: filename,
                    data: base64,
                    directory: Directory.Cache,
                });
                await Share.share({
                    title: 'Pagelle FC',
                    text: 'La mia card Pagelle FC',
                    url: written.uri,
                    dialogTitle: 'Salva o condividi la card',
                });
                track(award.id, 'download');
                toast({ title: '✓ Pronto per la condivisione' });
                return;
            }

            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);

            track(award.id, 'download');
            toast({
                title: '✓ Download completato',
            });
        } catch (error: any) {
            toast({
                title: 'Download non riuscito',
                description: error?.message || 'Impossibile scaricare l\'immagine in questo momento',
                variant: 'destructive',
            });
        }
    }, [toast, track]);

    function parseFilenameFromDisposition(disposition: string | null): string | null {
        if (!disposition) return null;
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) {
            try {
                return decodeURIComponent(utf8Match[1]);
            } catch {
                return utf8Match[1];
            }
        }
        const quotedMatch = disposition.match(/filename="([^"]+)"/i);
        if (quotedMatch?.[1]) return quotedMatch[1];
        const plainMatch = disposition.match(/filename=([^;]+)/i);
        if (plainMatch?.[1]) return plainMatch[1].trim();
        return null;
    }

    function detectImageExt(contentType: string): string {
        const ct = String(contentType || '').toLowerCase();
        if (ct.includes('image/webp')) return 'webp';
        if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return 'jpg';
        return 'png';
    }

    function buildFallbackFilename(award: Award, variant: string, ext: string): string {
        const typeSlug = awardTypeSlug(award.type);
        const periodSlug = slugify(award.payload?.period?.label || 'periodo');
        const shortId = String(award.id || '').slice(-8) || 'award';
        return `pagelle-fc-${typeSlug}-${periodSlug}-${variant}-${shortId}.${ext}`;
    }

    function awardTypeSlug(type: Award['type']): string {
        switch (type) {
            case 'MATCH_RECAP':
                return 'podio-partita';
            case 'MONTHLY_MVP':
                return 'mvp-mese';
            case 'BALLON_DOR':
                return 'pallone-oro';
            case 'GOLDEN_BOOT':
                return 'scarpa-oro';
            default:
                return 'award';
        }
    }

    function slugify(value: string): string {
        return String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-{2,}/g, '-');
    }

    return {
        shareWhatsApp,
        shareTelegram,
        shareInstagram,
        copyLink,
        downloadImage,
        resolveShareUrl,
    };
}

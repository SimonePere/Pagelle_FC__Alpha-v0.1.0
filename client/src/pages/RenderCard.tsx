/**
 * RenderCard — Pagina "render-only" usata dal renderer Puppeteer del server.
 *
 * Scopo:
 *  - Renderizza UNA SOLA card (PodiumCard o HeroCard) a piena risoluzione (1080×1920),
 *    senza navbar/footer/chrome, su sfondo trasparente.
 *  - Il server backend apre questa URL con Puppeteer e fa screenshot del nodo
 *    `[data-render-card]`, che è già dimensionato 1080×1920.
 *  - Il payload può arrivare in due modi:
 *      A) ?awardId=<id>           → la pagina fa fetch a /api/v1/awards/public/:id
 *      B) ?payload=<base64(json)> → modalità "self-contained" (utile per test/dev)
 *
 * Quando la card è pronta nel DOM, il componente espone `window.__RENDER_READY__ = true`
 * e setta l'attributo `data-render-ready` su <html>, così Puppeteer può aspettare
 * questo segnale prima dello screenshot (zero race condition con font loading).
 *
 * IMPORTANTE: questa route NON deve essere protetta da auth e NON deve avere
 * nessun layout/wrapper. È un "iframe-like" per il rendering server.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PodiumCard from '@/components/PodiumCard';
import HeroCard from '@/components/HeroCard';
import { mapAwardToCard, type CardData } from '@/utils/awardMapping';
import type { AwardType } from '@/types/award';

// Dichiarazione type per la flag di ready e payload iniettato (consumati da Puppeteer)
declare global {
    interface Window {
        __RENDER_READY__?: boolean;
        __RENDER_ERROR__?: string;
        __AWARD_DATA__?: {
            type: string;
            payload: any;
            shareUrl?: string;
        };
    }
}

export default function RenderCard() {
    const [params] = useSearchParams();
    const [data, setData] = useState<CardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                // Modalità 0: payload iniettato direttamente da Puppeteer (evita limiti di lunghezza URL HTTP 431)
                if (window.__AWARD_DATA__) {
                    const { type, payload, shareUrl } = window.__AWARD_DATA__;
                    const card = mapAwardToCard(type as AwardType, payload, shareUrl);
                    if (!cancelled) setData(card);
                    return;
                }

                // Modalità A: payload inline base64
                const inlinePayload = params.get('payload');
                if (inlinePayload) {
                    const binary = atob(inlinePayload);
                    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
                    const jsonStr = new TextDecoder('utf-8').decode(bytes);
                    const json = JSON.parse(jsonStr);
                    const card = mapAwardToCard(json.type as AwardType, json.payload, json.shareUrl);
                    if (!cancelled) setData(card);
                    return;
                }

                // Modalità B: awardId → fetch endpoint pubblico
                const awardId = params.get('awardId');
                if (!awardId) {
                    throw new Error('Manca awardId o payload nei query params');
                }
                const apiBase = params.get('apiBase') || '';
                const res = await fetch(`${apiBase}/api/v1/awards/public/${awardId}`);
                if (!res.ok) throw new Error(`Fetch award fallito: ${res.status}`);
                const body = await res.json();
                const award = body.award;
                const shareUrl = `${window.location.origin}/c/${awardId}`;
                const card = mapAwardToCard(award.type as AwardType, award.payload, shareUrl);
                if (!cancelled) setData(card);
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (!cancelled) setError(msg);
                window.__RENDER_ERROR__ = msg;
                document.documentElement.setAttribute('data-render-error', msg);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [params]);

    // Quando la card è renderizzata, aspetta che i font siano caricati prima di segnalare ready
    useEffect(() => {
        if (!data) return;
        (async () => {
            try {
                if (document.fonts && document.fonts.ready) {
                    await document.fonts.ready;
                }
                // Doppio rAF per garantire layout/paint completato
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
                window.__RENDER_READY__ = true;
                document.documentElement.setAttribute('data-render-ready', 'true');
            } catch {
                window.__RENDER_READY__ = true;
                document.documentElement.setAttribute('data-render-ready', 'true');
            }
        })();
    }, [data]);

    if (error) {
        return (
            <div style={{ padding: 24, color: 'red', fontFamily: 'monospace' }}>
                Errore: {error}
            </div>
        );
    }

    if (!data) {
        return <div style={{ padding: 24, color: '#888' }}>Loading…</div>;
    }

    // Preview mode: ?fit=1 → scala la card per farla entrare nella finestra (utile per visualizzazione manuale).
    // Puppeteer NON passa fit, quindi lo screenshot resta a 1080×1920 nativi.
    const fitToScreen = params.get('fit') === '1';

    if (fitToScreen) {
        return <FitPreview data={data} />;
    }

    return (
        <div
            data-render-card
            style={{
                width: CARD_W,
                height: CARD_H,
                background: 'transparent',
                overflow: 'hidden',
            }}
        >
            {data.kind === 'PODIUM' ? (
                <PodiumCard {...data.props} scale={1} />
            ) : (
                <HeroCard {...data.props} scale={1} />
            )}
        </div>
    );
}

// Costanti dimensioni card (devono restare sincronizzate con renderAward.js lato server)
const CARD_W = 1080;
const CARD_H = 1920;

/**
 * Preview a schermo intero: passa lo `scale` al componente card (che ridimensiona
 * width/height del proprio wrapper), così niente overflow orizzontale.
 * Centra verticalmente nella viewport con flex.
 */
function FitPreview({ data }: { data: CardData }) {
    const [scale, setScale] = useState(0.3);

    useEffect(() => {
        function recompute() {
            // visualViewport è più affidabile su mobile (esclude la barra dell'URL retrattile)
            const vw = window.visualViewport?.width ?? window.innerWidth;
            const vh = window.visualViewport?.height ?? window.innerHeight;
            const s = Math.min(vw / CARD_W, vh / CARD_H);
            setScale(s);
        }
        recompute();
        window.addEventListener('resize', recompute);
        window.visualViewport?.addEventListener('resize', recompute);
        return () => {
            window.removeEventListener('resize', recompute);
            window.visualViewport?.removeEventListener('resize', recompute);
        };
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0a0a',
                overflow: 'hidden',
                margin: 0,
                padding: 0,
            }}
        >
            <div data-render-card>
                {data.kind === 'PODIUM' ? (
                    <PodiumCard {...data.props} scale={scale} />
                ) : (
                    <HeroCard {...data.props} scale={scale} />
                )}
            </div>
        </div>
    );
}


// Mapping payload → CardData è stato spostato in `@/utils/awardMapping`
// (condiviso con PublicCard e AwardsBacheca per evitare duplicazione).

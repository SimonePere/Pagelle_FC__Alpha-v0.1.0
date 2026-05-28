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
import PodiumCard, { type PodiumCardProps } from '@/components/PodiumCard';
import HeroCard, { type HeroCardProps, type HeroCardType } from '@/components/HeroCard';

// Dichiarazione type per la flag di ready (consumata da Puppeteer)
declare global {
    interface Window {
        __RENDER_READY__?: boolean;
        __RENDER_ERROR__?: string;
    }
}

type CardData =
    | { kind: 'PODIUM'; props: PodiumCardProps }
    | { kind: 'HERO'; props: HeroCardProps };

export default function RenderCard() {
    const [params] = useSearchParams();
    const [data, setData] = useState<CardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                // Modalità A: payload inline base64
                const inlinePayload = params.get('payload');
                if (inlinePayload) {
                    // atob() ritorna una stringa di byte interpretati come latin1.
                    // Per decodificare correttamente UTF-8 (accenti, ·, emoji) serve passare
                    // attraverso Uint8Array + TextDecoder.
                    const binary = atob(inlinePayload);
                    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
                    const jsonStr = new TextDecoder('utf-8').decode(bytes);
                    const json = JSON.parse(jsonStr);
                    const card = mapPayloadToCard(json.type, json.payload, json.shareUrl);
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
                const card = mapPayloadToCard(award.type, award.payload, shareUrl);
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


// ============================================
// 🔄 MAPPING: award.payload (server) → props del componente React
// ============================================

function mapPayloadToCard(type: string, payload: any, shareUrl: string): CardData {
    if (type === 'MATCH_RECAP') {
        return {
            kind: 'PODIUM',
            props: mapMatchRecap(payload, shareUrl),
        };
    }
    // MONTHLY_MVP / BALLON_DOR / GOLDEN_BOOT → HeroCard
    return {
        kind: 'HERO',
        props: mapHero(type as HeroCardType, payload, shareUrl),
    };
}


/** Mappa payload MATCH_RECAP → PodiumCardProps */
function mapMatchRecap(payload: any, shareUrl: string): PodiumCardProps {
    const podiumArr = (payload.podium || []).slice(0, 3).map((p: any) => ({
        name: (p.name || '').toUpperCase(),
        vote: typeof p.avg === 'number' ? p.avg : Number(p.avg) || 0,
    }));

    // Pad con placeholder se < 3 (difensivo, non dovrebbe accadere)
    while (podiumArr.length < 3) {
        podiumArr.push({ name: '—', vote: 0 });
    }

    // Mappa highlight → formato React component
    const highlights = (payload.highlights || []).map((h: any) => ({
        icon: highlightIcon(h.code),
        titleLine: (h.text?.[0] || '').toUpperCase(),
        subtitleLine: (h.text?.[1] || '').toUpperCase(),
        accentColor: highlightAccent(h.code),
    }));

    // matchDate: il payload ha period.dateFrom (o usa label)
    const matchDate = payload.period?.dateFrom
        ? new Date(payload.period.dateFrom)
        : new Date();

    return {
        matchDate,
        podium: podiumArr as PodiumCardProps['podium'],
        highlights,
        qrCodeUrl: shareUrl,
    };
}


/** Mappa payload MONTHLY_MVP / BALLON_DOR / GOLDEN_BOOT → HeroCardProps */
function mapHero(type: HeroCardType, payload: any, shareUrl: string): HeroCardProps {
    const hero = payload.hero || {};
    const stats = (hero.stats || []).slice(0, 4);
    // Pad a 4 elementi se ne arrivano meno
    while (stats.length < 4) {
        stats.push({ value: '—', label: '—' });
    }

    return {
        type,
        periodLabel: (payload.period?.label || '').toUpperCase(),
        hero: {
            name: (hero.name || '').toUpperCase(),
            avatarUrl: hero.avatar || undefined,
            mainValue: String(hero.mainValue ?? ''),
            mainLabel: hero.mainLabel || '',
            stats: stats as HeroCardProps['hero']['stats'],
        },
        qrCodeUrl: shareUrl,
    };
}


function highlightIcon(code: string): string {
    switch (code) {
        case 'STREAK_MVP': return '🔥';
        case 'BEST_BY_MILES': return '💪';
        case 'UNANIMOUS_MVP': return '🎯';
        case 'GOAL_MACHINE': return '⚽';
        default: return '⭐';
    }
}

function highlightAccent(code: string): 'gold' | 'orange' | 'green' | 'purple' | 'blue' {
    switch (code) {
        case 'STREAK_MVP': return 'orange';
        case 'BEST_BY_MILES': return 'gold';
        case 'UNANIMOUS_MVP': return 'purple';
        case 'GOAL_MACHINE': return 'green';
        default: return 'blue';
    }
}

/**
 * HeroCard — Poster verticale (1080×1920) per riconoscimenti individuali.
 * Tre varianti: MVP del Mese, Pallone d'Oro, Scarpa d'Oro.
 *
 * @example
 * <HeroCard {...MOCK_MONTHLY_MVP} scale={0.3} />
 * <HeroCard {...MOCK_BALLON_DOR} scale={0.3} />
 * <HeroCard {...MOCK_GOLDEN_BOOT} scale={0.3} />
 */
import { Trophy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export type HeroCardType = 'MONTHLY_MVP' | 'BALLON_DOR' | 'GOLDEN_BOOT';

export interface StatItem {
  value: string;
  label: string;
}

export interface HeroCardProps {
  type: HeroCardType;
  periodLabel: string;
  hero: {
    name: string;
    avatarUrl?: string;
    mainValue: string;
    mainLabel: string;
    stats: [StatItem, StatItem, StatItem, StatItem];
  };
  qrCodeUrl: string;
  scale?: number;
}

interface TypeConfig {
  title: string;
  themeColor: string;
  themeColorSoft: string;
  bottomGradient: string;
  icon: string;
  subIcon: string;
}

const TYPE_CONFIG: Record<HeroCardType, TypeConfig> = {
  MONTHLY_MVP: {
    title: 'MVP DEL MESE',
    themeColor: 'hsl(270, 70%, 55%)',
    themeColorSoft: 'hsla(270, 70%, 55%, 0.6)',
    bottomGradient: 'hsl(270, 65%, 22%)',
    icon: '👑',
    subIcon: 'BEST PLAYER',
  },
  BALLON_DOR: {
    title: "PALLONE D'ORO",
    themeColor: 'hsl(45, 90%, 55%)',
    themeColorSoft: 'hsla(45, 90%, 55%, 0.6)',
    bottomGradient: 'hsl(40, 65%, 22%)',
    icon: '⚽',
    subIcon: 'BEST OF THE SEASON',
  },
  GOLDEN_BOOT: {
    title: "SCARPA D'ORO",
    themeColor: 'hsl(35, 85%, 55%)',
    themeColorSoft: 'hsla(35, 85%, 55%, 0.6)',
    bottomGradient: 'hsl(30, 60%, 22%)',
    icon: '👟',
    subIcon: 'TOP SCORER',
  },
};

const MONTHS_IT = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
const DAYS_IT = ['DOMENICA', 'LUNEDÌ', 'MARTEDÌ', 'MERCOLEDÌ', 'GIOVEDÌ', 'VENERDÌ', 'SABATO'];

function hashHue(name: string): number {
  let sum = 0;
  for (const ch of name) sum += ch.codePointAt(0) ?? 0;
  return sum % 360;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function splitPeriodLabel(label: string): [string, string] {
  const idx = label.indexOf(' ');
  if (idx === -1) return [label, ''];
  return [label.slice(0, idx), label.slice(idx + 1)];
}

export function HeroCard({ type, periodLabel, hero, qrCodeUrl, scale = 1 }: HeroCardProps) {
  const cfg = TYPE_CONFIG[type];
  const [periodTop, periodBottom] = splitPeriodLabel(periodLabel);
  const hue = hashHue(hero.name);
  const fallbackBg = `hsl(${hue}, 65%, 50%)`;

  return (
    <div style={{ width: 1080 * scale, height: 1920 * scale, overflow: 'hidden' }}>
      <div
        style={{
          width: 1080,
          height: 1920,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          background: `radial-gradient(circle at 50% 30%, ${cfg.themeColorSoft.replace('0.6', '0.3')} 0%, transparent 50%), linear-gradient(180deg, hsl(220,50%,12%) 0%, ${cfg.bottomGradient} 100%)`,
          fontFamily: "'Inter', sans-serif",
          color: '#fff',
          overflow: 'hidden',
        }}
      >
        {/* HEADER */}
        <div style={{ position: 'absolute', left: 60, top: 80, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: cfg.themeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trophy size={44} color="hsl(220,50%,12%)" strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, opacity: 0.7 }}>pagellefc.app</div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 60,
            top: 80,
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, fontWeight: 800, lineHeight: 1 }}>
            {periodTop}
          </div>
          {periodBottom && (
            <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: 4, opacity: 0.7 }}>{periodBottom}</div>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            top: 240,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 80,
            letterSpacing: 2,
            background: `linear-gradient(90deg, #fff 0%, #fff 70%, ${cfg.themeColor} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {cfg.title}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 320,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 200,
            height: 4,
            background: cfg.themeColor,
            borderRadius: 2,
          }}
        />

        {/* HERO ZONE */}
        {/* Icona */}
        <div
          style={{
            position: 'absolute',
            left: 540 - 40,
            top: 400,
            width: 80,
            height: 80,
            fontSize: 70,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cfg.icon}
        </div>

        {/* subIcon */}
        <div
          style={{
            position: 'absolute',
            top: 490,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 4,
            textTransform: 'uppercase',
            opacity: 0.8,
            color: cfg.themeColor,
          }}
        >
          {cfg.subIcon}
        </div>

        {/* Raggi di luce SVG dietro l'avatar */}
        <svg
          width={700}
          height={700}
          style={{
            position: 'absolute',
            left: 540 - 350,
            top: 700 - 350,
            pointerEvents: 'none',
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x2 = 350 + Math.cos(angle) * 340;
            const y2 = 350 + Math.sin(angle) * 340;
            return (
              <line
                key={i}
                x1={350}
                y1={350}
                x2={x2}
                y2={y2}
                stroke={cfg.themeColor}
                strokeOpacity={0.08}
                strokeWidth={40}
              />
            );
          })}
        </svg>

        {/* Avatar 400×400 */}
        <div
          style={{
            position: 'absolute',
            left: 540 - 200,
            top: 500,
            width: 400,
            height: 400,
            borderRadius: 88,
            border: `10px solid ${cfg.themeColor}`,
            background: hero.avatarUrl ? `url(${hero.avatarUrl}) center/cover` : fallbackBg,
            boxShadow: `0 0 40px 8px ${cfg.themeColorSoft}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {!hero.avatarUrl && (
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 160, color: '#fff', lineHeight: 1 }}>
              {getInitials(hero.name)}
            </span>
          )}
        </div>

        {/* Nome */}
        <div
          style={{
            position: 'absolute',
            top: 920,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 96,
            letterSpacing: 2,
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          {truncate(hero.name, 16)}
        </div>

        {/* Linea decorativa */}
        <div
          style={{
            position: 'absolute',
            top: 1000,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 200,
            height: 4,
            background: cfg.themeColor,
            borderRadius: 2,
          }}
        />

        {/* mainValue gigante */}
        <div
          style={{
            position: 'absolute',
            top: 1030,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 200,
            lineHeight: 1,
            background: `linear-gradient(90deg, #fff 0%, #fff 70%, ${cfg.themeColor} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            WebkitTextStroke: '3px #000',
          }}
        >
          {hero.mainValue}
        </div>

        {/* mainLabel */}
        <div
          style={{
            position: 'absolute',
            top: 1190,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: 3,
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          {hero.mainLabel}
        </div>

        {/* STATS GRID 2x2 */}
        {hero.stats.map((s, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const left = 80 + col * 480;
          const top = 1280 + row * 200;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left,
                top,
                width: 440,
                height: 180,
                background: 'hsla(220, 30%, 18%, 0.6)',
                border: `2px solid ${cfg.themeColor.replace(')', ' / 0.3)').replace('hsl(', 'hsl(')}`,
                borderRadius: 20,
                padding: 24,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 88, lineHeight: 1, color: '#fff' }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  opacity: 0.75,
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}

        {/* FOOTER */}
        <div style={{ position: 'absolute', left: 80, top: 1740, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 44, fontWeight: 800 }}>pagellefc.app</div>
          <div style={{ width: 220, height: 3, background: cfg.themeColor, borderRadius: 2 }} />
          <div style={{ fontSize: 28, fontWeight: 500, opacity: 0.8, marginTop: 8 }}>Vota la tua squadra</div>
          <div style={{ fontSize: 28, fontWeight: 500, opacity: 0.8 }}>in 60 secondi</div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 840,
            top: 1720,
            background: '#fff',
            padding: 16,
            borderRadius: 12,
            width: 180,
            height: 180,
            boxSizing: 'border-box',
          }}
        >
          <QRCodeSVG value={qrCodeUrl} size={148} level="M" />
        </div>

        <div
          style={{
            position: 'absolute',
            top: 1880,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 400,
            opacity: 0.4,
          }}
        >
          © Pagelle FC · 2026
        </div>
      </div>
    </div>
  );
}

// Silenzia warning su DAYS_IT/MONTHS_IT non usati (mantenuti per coerenza con PodiumCard)
void DAYS_IT;
void MONTHS_IT;

export const MOCK_MONTHLY_MVP: HeroCardProps = {
  type: 'MONTHLY_MVP',
  periodLabel: 'MAGGIO 2026',
  hero: {
    name: 'MARCO',
    mainValue: '8.4',
    mainLabel: 'MEDIA VOTO · MAGGIO',
    stats: [
      { value: '12', label: 'PARTITE GIOCATE' },
      { value: '5', label: 'VOLTE MVP' },
      { value: '9.1', label: 'VOTO PIÙ ALTO' },
      { value: '91%', label: 'PARTECIPAZIONE' },
    ],
  },
  qrCodeUrl: 'https://pagellefc.app/c/xyz789?utm_source=qr',
};

export const MOCK_BALLON_DOR: HeroCardProps = {
  type: 'BALLON_DOR',
  periodLabel: 'STAGIONE 2025/26',
  hero: {
    name: 'LUCA',
    mainValue: '8.1',
    mainLabel: 'MEDIA STAGIONALE',
    stats: [
      { value: '38', label: 'PARTITE GIOCATE' },
      { value: '14', label: 'VOLTE MVP' },
      { value: '9.4', label: 'VOTO PIÙ ALTO' },
      { value: '95%', label: 'PARTECIPAZIONE' },
    ],
  },
  qrCodeUrl: 'https://pagellefc.app/c/ballon26?utm_source=qr',
};

export const MOCK_GOLDEN_BOOT: HeroCardProps = {
  type: 'GOLDEN_BOOT',
  periodLabel: 'STAGIONE 2025/26',
  hero: {
    name: 'GIULIA',
    mainValue: '24',
    mainLabel: 'GOL IN STAGIONE',
    stats: [
      { value: '34', label: 'PARTITE GIOCATE' },
      { value: '0.71', label: 'GOL A PARTITA' },
      { value: '4', label: 'TRIPLETTE' },
      { value: '11', label: 'ASSIST' },
    ],
  },
  qrCodeUrl: 'https://pagellefc.app/c/boot26?utm_source=qr',
};

export default HeroCard;

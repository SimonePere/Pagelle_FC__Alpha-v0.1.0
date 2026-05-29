/**
 * PodiumCard — Card trofeo verticale (1080×1920) per recap partita.
 * Stile: Call of Duty after-match × FIFA POTM × Spotify Wrapped.
 *
 * @example
 * <PodiumCard {...MOCK_PODIUM_DATA} scale={0.3} />
 */
import { QRCodeSVG } from 'qrcode.react';

export interface PodiumEntry {
  name: string;
  avatarUrl?: string;
  vote: number;
}

export interface HighlightItem {
  icon: string;
  titleLine: string;
  subtitleLine: string;
  /** Nome del giocatore citato dall'highlight (es. "MARCO" per BOMBER). Mostrato in evidenza. */
  playerName?: string;
  accentColor: 'gold' | 'orange' | 'green' | 'purple' | 'blue';
}

export interface PodiumCardProps {
  matchDate: Date;
  podium: [PodiumEntry, PodiumEntry, PodiumEntry];
  highlights?: HighlightItem[];
  qrCodeUrl: string;
  scale?: number;
}

const ACCENT_HSL: Record<HighlightItem['accentColor'], string> = {
  gold: 'hsl(45,90%,60%)',
  orange: 'hsl(25,90%,55%)',
  green: 'hsl(140,60%,50%)',
  purple: 'hsl(270,70%,60%)',
  blue: 'hsl(220,80%,55%)',
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

function formatVote(v: number): string {
  return v.toFixed(1);
}

interface AvatarProps {
  entry: PodiumEntry;
  size: number;
  borderColor: string;
  borderWidth?: number;
  glow?: boolean;
}

function Avatar({ entry, size, borderColor, borderWidth = 6, glow }: AvatarProps) {
  const hue = hashHue(entry.name);
  const bg = `hsl(${hue}, 65%, 50%)`;
  const roundedSquareRadius = Math.round(size * 0.22);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: roundedSquareRadius,
        border: `${borderWidth}px solid ${borderColor}`,
        background: entry.avatarUrl ? `url(${entry.avatarUrl}) center/cover` : bg,
        boxShadow: glow ? `0 0 20px 4px ${borderColor}80` : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {!entry.avatarUrl && (
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 80,
            color: '#fff',
            lineHeight: 1,
          }}
        >
          {getInitials(entry.name)}
        </span>
      )}
    </div>
  );
}

export function PodiumCard({ matchDate, podium, highlights = [], qrCodeUrl, scale = 1 }: PodiumCardProps) {
  const [first, second, third] = podium;
  const dateStr = `${matchDate.getDate().toString().padStart(2, '0')} ${MONTHS_IT[matchDate.getMonth()]}`;
  const dayStr = DAYS_IT[matchDate.getDay()];
  const visibleHl = highlights.slice(0, 2);

  return (
    <div
      style={{
        width: 1080 * scale,
        height: 1920 * scale,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 1080,
          height: 1920,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          background:
            'radial-gradient(circle at 50% 70%, hsl(45,90%,60% / 0.3) 0%, transparent 60%), linear-gradient(180deg, hsl(220,50%,12%) 0%, hsl(225,65%,22%) 100%)',
          fontFamily: "'Inter', sans-serif",
          color: '#fff',
          overflow: 'hidden',
        }}
      >
        {/* HEADER — LOGO PAGELLE FC + badge "AWARDS" */}
        <div style={{ position: 'absolute', left: 60, top: 80, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <img
            src="/FLAT_BG_TRAS.png"
            alt="Pagelle FC"
            crossOrigin="anonymous"
            style={{ width: 96, height: 96, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.4))' }}
          />
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              letterSpacing: 3,
              padding: '6px 14px',
              border: '2px solid hsl(45,90%,60%)',
              color: 'hsl(45,90%,75%)',
              borderRadius: 6,
              display: 'inline-block',
              alignSelf: 'flex-start',
              background: 'hsl(45,90%,60% / 0.08)',
            }}
          >
            PAGELLE FC · AWARDS
          </div>
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
            {dateStr}
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: 4, opacity: 0.7 }}>{dayStr}</div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 240,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 72,
            letterSpacing: 2,
            background: 'linear-gradient(90deg, #fff 0%, #fff 70%, hsl(45,90%,75%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          IL PODIO DELLA PARTITA
        </div>
        <div
          style={{
            position: 'absolute',
            top: 320,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 200,
            height: 4,
            background: 'hsl(45,90%,60%)',
            borderRadius: 2,
          }}
        />

        {/* PODIO — 2° (left) — desaturato / più piccolo per far spiccare il 1° */}
        <PodiumSlot
          entry={second}
          place={2}
          avatarSize={150}
          avatarTop={740}
          centerX={220}
          voteTop={910}
          voteSize={56}
          nameTop={985}
          nameSize={30}
          pedestalTop={1050}
          pedestalW={260}
          pedestalH={180}
          pedestalGradient="linear-gradient(180deg, hsl(220,5%,55%), hsl(220,8%,35%))"
          borderColor="hsl(220, 8%, 55%)"
          avatarBorderWidth={4}
          dim
        />

        {/* PODIO — 1° (center) — DOMINANTE con glow oro */}
        <PodiumSlot
          entry={first}
          place={1}
          avatarSize={260}
          avatarTop={460}
          centerX={540}
          voteTop={730}
          voteSize={120}
          nameTop={850}
          nameSize={56}
          pedestalTop={940}
          pedestalW={360}
          pedestalH={290}
          pedestalGradient="linear-gradient(180deg, hsl(45,95%,65%), hsl(40,90%,40%))"
          borderColor="hsl(45,95%,60%)"
          avatarBorderWidth={9}
          mvpGlow
        />

        {/* PODIO — 3° (right) — desaturato / più piccolo */}
        <PodiumSlot
          entry={third}
          place={3}
          avatarSize={150}
          avatarTop={780}
          centerX={860}
          voteTop={950}
          voteSize={56}
          nameTop={1025}
          nameSize={30}
          pedestalTop={1090}
          pedestalW={260}
          pedestalH={140}
          pedestalGradient="linear-gradient(180deg, hsl(25,40%,40%), hsl(20,40%,25%))"
          borderColor="hsl(25, 35%, 38%)"
          avatarBorderWidth={4}
          dim
        />

        {/* HIGHLIGHTS */}
        <div
          style={{
            position: 'absolute',
            top: 1340,
            left: 0,
            right: 0,
            height: 340,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {visibleHl.length === 0 ? (
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 64,
                letterSpacing: 2,
              }}
            >
              🎉 BEL MATCH!
            </div>
          ) : (
            visibleHl.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 920,
                  minHeight: 110,
                  background: 'hsl(220,30%,18% / 0.75)',
                  borderLeft: `6px solid ${ACCENT_HSL[h.accentColor]}`,
                  borderRadius: 16,
                  padding: '20px 24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    fontSize: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {h.icon}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                  {/* Riga 1: "BOMBER · 3 GOL" — titolo + dato secondario sulla stessa riga */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 30, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {h.titleLine}
                    </div>
                    {h.subtitleLine && (
                      <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.7 }}>
                        {h.subtitleLine}
                      </div>
                    )}
                  </div>
                  {/* Riga 2: nome del giocatore IN EVIDENZA con l'accent color */}
                  {h.playerName && (
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: ACCENT_HSL[h.accentColor],
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        lineHeight: 1.1,
                      }}
                    >
                      → {h.playerName}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div style={{ position: 'absolute', left: 80, top: 1740, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 44, fontWeight: 800 }}>pagellefc.app</div>
          <div style={{ width: 220, height: 3, background: 'hsl(45,90%,60%)', borderRadius: 2 }} />
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

interface PodiumSlotProps {
  entry: PodiumEntry;
  place: 1 | 2 | 3;
  avatarSize: number;
  avatarTop: number;
  centerX: number;
  voteTop: number;
  voteSize: number;
  nameTop: number;
  nameSize: number;
  pedestalTop: number;
  pedestalW: number;
  pedestalH: number;
  pedestalGradient: string;
  borderColor: string;
  avatarBorderWidth?: number;
  mvpGlow?: boolean;
  /** Se true riduce opacità generale per far spiccare il 1° */
  dim?: boolean;
}

function PodiumSlot({
  entry,
  place,
  avatarSize,
  avatarTop,
  centerX,
  voteTop,
  voteSize,
  nameTop,
  nameSize,
  pedestalTop,
  pedestalW,
  pedestalH,
  pedestalGradient,
  borderColor,
  avatarBorderWidth,
  mvpGlow,
  dim,
}: PodiumSlotProps) {
  const pedestalTopBorderColor = place === 1 ? borderColor : `${borderColor}B3`;
  const slotOpacity = dim ? 0.78 : 1;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: centerX - avatarSize / 2,
          top: avatarTop,
          opacity: slotOpacity,
        }}
      >
        <Avatar
          entry={entry}
          size={avatarSize}
          borderColor={borderColor}
          borderWidth={avatarBorderWidth}
          glow={mvpGlow}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: centerX - 200,
          top: voteTop,
          width: 400,
          textAlign: 'center',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: voteSize,
          fontWeight: 900,
          color: '#fff',
          WebkitTextStroke: '2px #000',
          lineHeight: 1,
          opacity: slotOpacity,
        }}
      >
        {formatVote(entry.vote)}
      </div>
      <div
        style={{
          position: 'absolute',
          left: centerX - 200,
          top: nameTop,
          width: 400,
          textAlign: 'center',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: nameSize,
          letterSpacing: 1,
          textTransform: 'uppercase',
          lineHeight: 1,
          opacity: slotOpacity,
        }}
      >
        {truncate(entry.name, 12)}
      </div>
      <div
        style={{
          position: 'absolute',
          left: centerX - pedestalW / 2,
          top: pedestalTop,
          width: pedestalW,
          height: pedestalH,
          background: pedestalGradient,
          borderTop: `2px solid ${pedestalTopBorderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: dim ? 0.85 : 1,
          boxShadow: place === 1 ? '0 -8px 30px hsla(45,90%,60%,0.35)' : undefined,
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 140,
            color: '#fff',
            opacity: 0.3,
            lineHeight: 1,
          }}
        >
          {place}°
        </span>
      </div>
    </>
  );
}

export const MOCK_PODIUM_DATA: PodiumCardProps = {
  matchDate: new Date('2026-05-16'),
  podium: [
    { name: 'MARCO', vote: 8.7 },
    { name: 'LUCA', vote: 8.2 },
    { name: 'GIULIA', vote: 7.9 },
  ],
  highlights: [
    { icon: '🔥', titleLine: '3ª PARTITA MVP DI FILA', subtitleLine: '', playerName: 'MARCO', accentColor: 'orange' },
    { icon: '⚽', titleLine: 'BOMBER', subtitleLine: '3 GOL', playerName: 'LUCA', accentColor: 'green' },
  ],
  qrCodeUrl: 'https://pagellefc.app/c/abc123?utm_source=qr',
};

export default PodiumCard;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom'; import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, UserPlus, Shield, Trophy, Star, Vote, Download,
  TrendingUp, Calendar, Award, Eye, Share2, Sparkles, Crown, Loader2, Info,
} from 'lucide-react';
import { isGod } from '@/utils/permissions';
import {
  fetchGodDashboardAll,
  fetchGodGuestConversion,
  setRange,
  selectGodRange,
  selectGodAnyLoading,
  selectGodOverviewSource,
  selectGodUsersKpi,
  selectGodTeamsKpi,
  selectGodMatchesKpi,
  selectGodVotingKpi,
  selectGodPlayerCardsKpi,
  selectGodGameplayKpi,
  selectGodDashboardGraph,
  selectGodVotingEngagement,
  selectGodPlayerCardsEngagement,
  selectGodAwardsKpi,
  selectGodTopTeams,
  type GodRangeKey,
} from '@/redux/slices/godSlice';

/**
 * TODO God Dashboard - funzionalita ancora da implementare (aggiornato 2026-08-03):
 * 1. Guest conversion: gli eventi "invited" e "promoted" non sono ancora tracciati
 *    (fetchGodGuestConversion restituisce dati parziali). Serve emettere gli eventi
 *    al momento dell'invito e della promozione ospite -> registrato.
 * 2. Audit / Usage log: il modello GodUsageLog e il middleware di tracciamento non
 *    esistono, quindi l'endpoint getGodUsage ritorna sempre []. Da implementare per
 *    avere lo storico degli accessi/azioni god.
 * 3. Monetizzazione: utenti a pagamento / piani non implementati (nessun KPI ricavi).
 */

// --- Helpers ---

const dash = (n: number | null | undefined): string | number => n ?? '—';
const pct = (n: number | null | undefined) => n != null ? `${n.toFixed(1)}%` : '—';
const fmt2 = (n: number | null | undefined) => n != null ? n.toFixed(2) : '—';

// ISO date "2026-07-01" -> "01/07"
function formatDateLabel(iso: string): string {
  const parts = iso.substring(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso;
}

const RANGE_OPTIONS: { value: GodRangeKey; label: string }[] = [
  { value: '7d', label: '7 giorni' },
  { value: '30d', label: '30 giorni' },
  { value: '90d', label: '90 giorni' },
  { value: 'total', label: 'Totale' },
];

// Suffisso periodo per le card che seguono il filtro temporale (range-aware)
const RANGE_SUFFIX: Record<GodRangeKey, string> = {
  '7d': '7 giorni',
  '30d': '30 giorni',
  '90d': '90 giorni',
  total: 'totale',
  custom: 'periodo scelto',
};

// --- Kpi card ---

interface KpiProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}

const Kpi = ({ icon: Icon, label, value, hint, accent }: KpiProps) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card h-full">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
            <p className={`mt-1 font-display text-3xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>
              {value}
            </p>
            {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
          </div>
          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${accent ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary'}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// --- Info popover di sezione (spiega i KPI del blocco) ---

const SectionInfo = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={`Informazioni: ${title}`}
        className="p-1 rounded-full hover:bg-primary/10 transition-colors"
      >
        <Info className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-80" side="bottom" align="start">
      <div className="space-y-2">
        <h4 className="font-medium text-foreground">{title}</h4>
        <div className="text-sm text-muted-foreground space-y-1.5 [&_b]:text-foreground [&_b]:font-semibold">
          {children}
        </div>
      </div>
    </PopoverContent>
  </Popover>
);


export default function GodDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const range = useSelector(selectGodRange);
  const isLoading = useSelector(selectGodAnyLoading);
  const overviewSource = useSelector(selectGodOverviewSource);
  const usersKpi = useSelector(selectGodUsersKpi);
  const teamsKpi = useSelector(selectGodTeamsKpi);
  const matchesKpi = useSelector(selectGodMatchesKpi);
  const votingKpi = useSelector(selectGodVotingKpi);
  const playerCardsKpi = useSelector(selectGodPlayerCardsKpi);
  const gameplayKpi = useSelector(selectGodGameplayKpi);
  const graphData = useSelector(selectGodDashboardGraph);
  const votingEng = useSelector(selectGodVotingEngagement);
  const cardsEng = useSelector(selectGodPlayerCardsEngagement);
  const awardsKpi = useSelector(selectGodAwardsKpi);
  const topTeams = useSelector(selectGodTopTeams);

  useEffect(() => {
    if (user && !isGod(user)) {
      toast.error('Area riservata al Creatore dell\'app.');
      navigate('/history', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !isGod(user)) return;
    dispatch(fetchGodDashboardAll({ range }));
    dispatch(fetchGodGuestConversion({ range }));
  }, []);  // mount only -- il re-fetch e' gestito da handleRangeChange

  if (!user || !isGod(user)) return null;

  // Etichetta con periodo per le card range-aware, es. "Gol · 7 giorni"
  const rl = (base: string) => `${base} · ${RANGE_SUFFIX[range]}`;

  const handleRangeChange = (r: GodRangeKey) => {
    dispatch(setRange(r));
    dispatch(fetchGodDashboardAll({ range: r }));
    dispatch(fetchGodGuestConversion({ range: r }));
  };

  // Converte { labels, series[] } in array di oggetti per recharts
  const chartData = useMemo(() => {
    if (!graphData?.labels?.length) return [];
    return graphData.labels.map((lbl, i) => {
      const point: Record<string, string | number> = { label: formatDateLabel(lbl) };
      graphData.series.forEach(s => { point[s.key] = s.data[i] ?? 0; });
      return point;
    });
  }, [graphData]);

  const playersDistribution = [
    { name: 'Registrati', value: usersKpi?.totalRegistered ?? 0, color: '#0ea5e9' }, // sky-500 = colore ruolo Player
    { name: 'Ospiti', value: usersKpi?.guestUsers ?? 0, color: '#8b5cf6' },          // violet-500 = colore ruolo Guest
  ];

  // Serie del grafico trend disattivabili cliccando la legenda (per ripulire la vista)
  const [hiddenTrend, setHiddenTrend] = useState<Record<string, boolean>>({});
  const toggleTrend = (key: string) =>
    setHiddenTrend(prev => ({ ...prev, [key]: !prev[key] }));

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
    color: 'hsl(var(--foreground))',
  };
  // Colori testo interni al tooltip (etichetta e voci): senza questi recharts usa nero, illeggibile su tema dark
  const tooltipLabelStyle = { color: 'hsl(var(--foreground))', fontWeight: 600 };
  const tooltipItemStyle = { color: 'hsl(var(--foreground))' };

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-8">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 sm:gap-4"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
              <img src="/FLAT_BG_W.png" alt="Pagelle FC Logo" className="w-full h-full object-cover rounded-md" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground leading-tight">
                God Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Panoramica generale dell'app</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
              {overviewSource && (
                <Badge variant="outline" className="flex border-accent/40 text-accent capitalize">
                  {overviewSource}
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Range selector */}
          <div className="flex gap-2 flex-wrap">
            {RANGE_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                size="sm"
                variant={range === opt.value ? 'default' : 'outline'}
                onClick={() => handleRangeChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Team & Partite */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Team & Partite
              <SectionInfo title="Team & Partite">
                <p>Stato delle squadre e delle partite.</p>
                <p><b>Team totali</b>: numero di squadre nel database (valore assoluto, non cambia col filtro).</p>
                <p><b>Partite totali</b>: tutte le partite mai create (assoluto).</p>
                <p><b>Partite · periodo</b>: partite create nel periodo selezionato (7g/30g/90g/totale).</p>
                <p><b>In attesa di voti</b>: sessioni di voto "match rating" attive in questo momento (stato attuale).</p>
              </SectionInfo>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={Shield} label="Team totali" value={dash(teamsKpi?.total)} hint={`+${dash(teamsKpi?.createdInWindow)} nel periodo`} />
              <Kpi icon={Trophy} label="Partite totali" value={dash(matchesKpi?.total)} />
              <Kpi icon={Calendar} label={rl('Partite')} value={dash(matchesKpi?.createdInWindow)} accent />
              <Kpi icon={Vote} label="In attesa di voti" value={dash(matchesKpi?.openVotingSessions)} hint="sessioni attive ora" />
            </div>
          </section>

          {/* Utenti & Giocatori */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Utenti & Giocatori
              <SectionInfo title="Utenti & Giocatori">
                <p>Base utenti registrata e attività.</p>
                <p><b>Utenti registrati</b>: account non-ospite nel database (assoluto).</p>
                <p><b>Attivi 7 giorni</b>: utenti che hanno inviato almeno un voto o una player card negli ultimi 7 giorni (finestra fissa, non dipende dal filtro).</p>
                <p><b>Utenti ospiti</b>: account in modalità guest presenti ora (assoluto).</p>
                <p><b>Nuovi utenti · periodo</b>: registrazioni avvenute nel periodo selezionato.</p>
              </SectionInfo>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={Users} label="Utenti registrati" value={dash(usersKpi?.totalRegistered)} hint={`+${dash(usersKpi?.newInWindow)} nel periodo`} />
              <Kpi icon={TrendingUp} label="Attivi 7 giorni" value={dash(usersKpi?.activeUsers7d)} hint="hanno votato di recente" accent />
              <Kpi icon={UserPlus} label="Utenti ospiti" value={dash(usersKpi?.guestUsers)} hint="account guest nel DB" />
              <Kpi icon={Users} label={rl('Nuovi utenti')} value={dash(usersKpi?.newInWindow)} hint="registrazioni nel range" />
            </div>
          </section>

          {/* Engagement & Contenuti */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" /> Engagement & Contenuti
              <SectionInfo title="Engagement & Contenuti">
                <p>Quanto gli utenti partecipano, nel periodo selezionato.</p>
                <p><b>Voti partita</b>: numero di voti inviati nel periodo. Sotto: media di partecipazione alle sessioni.</p>
                <p><b>Player Cards</b>: sessioni player card create nel periodo. Sotto: % di sessioni completate.</p>
                <p><b>Badge assegnati</b>: badge distribuiti ai giocatori nelle partite del periodo, contati dal dettaglio per-giocatore dei voti.</p>
                <p><b>Completion voti</b>: percentuale di sessioni di voto completate rispetto a quelle create.</p>
              </SectionInfo>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={Vote} label={rl('Voti partita')} value={dash(votingKpi?.submissionsInWindow)} hint={votingEng ? `${pct(votingEng.avgParticipationRate)} partecipazione` : undefined} />
              <Kpi icon={Star} label={rl('Player Cards')} value={dash(cardsEng?.sessionsCreated)} hint={cardsEng ? `${pct(cardsEng.completionRate)} completate` : undefined} accent />
              <Kpi icon={Award} label={rl('Badge assegnati')} value={dash(gameplayKpi?.totalBadges)} />
              <Kpi icon={Vote} label={rl('Completion voti')} value={pct(votingEng?.completionRate)} hint="sessioni completate / create" />
            </div>
          </section>

          {/* Statistiche di Gioco */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" /> Statistiche di Gioco
              <SectionInfo title="Statistiche di Gioco">
                <p>Rendimento sportivo aggregato nel periodo.</p>
                <p><b>Gol</b> e <b>Assist</b>: somma di gol e assist delle partite del periodo. Calcolati dal <b>dettaglio per-giocatore</b> di ogni partita, la stessa fonte-verità usata dalla home (non dal riassunto di partita, che in passato non veniva popolato).</p>
                <p><b>Voto medio</b>: media delle medie-voto di partita nel periodo.</p>
                <p>Nota: su "7/30/90 giorni" contano solo le partite di quel periodo, quindi possono essere 0 se non ci sono partite recenti.</p>
              </SectionInfo>
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <Kpi icon={Trophy} label={rl('Gol')} value={dash(gameplayKpi?.totalGoals)} />
              <Kpi icon={Sparkles} label={rl('Assist')} value={dash(gameplayKpi?.totalAssists)} />
              <Kpi icon={Star} label={rl('Voto medio')} value={fmt2(gameplayKpi?.avgRating)} accent />
            </div>
          </section>

          {/* Award Analytics */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" /> Award Analytics
              <SectionInfo title="Award Analytics">
                <p>Interazioni sui trofei/award generati.</p>
                <p><b>Award in attesa</b>: award con stato PENDING non ancora rivelati (stato attuale).</p>
                <p><b>Visualizzazioni</b>: numero di aperture degli award generati nel periodo.</p>
                <p><b>Condivisioni</b>: click di condivisione (nativa, WhatsApp, Telegram, copia link) nel periodo.</p>
                <p><b>Download</b>: salvataggi dell'immagine award nel periodo.</p>
              </SectionInfo>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={Award} label="Award in attesa" value={dash(awardsKpi?.pending)} hint="stato attuale" />
              <Kpi icon={Eye} label={rl('Visualizzazioni')} value={dash(awardsKpi?.viewed)} accent />
              <Kpi icon={Share2} label={rl('Condivisioni')} value={dash(awardsKpi?.shared)} />
              <Kpi icon={Download} label={rl('Download')} value={dash(awardsKpi?.downloads)} />
            </div>
          </section>

          {/* Grafico trend */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {rl('Trend')}
                <SectionInfo title="Trend nel periodo">
                  <p>Andamento giornaliero nel periodo selezionato.</p>
                  <p><b>Partite</b>: partite create per giorno.</p>
                  <p><b>Voti</b>: voti inviati per giorno.</p>
                  <p><b>Player Cards</b>: player card create per giorno.</p>
                </SectionInfo>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  {isLoading ? 'Caricamento dati...' : 'Nessun dato disponibile per il periodo selezionato.'}
                </div>
              ) : (
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                      <RTooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                        onClick={(e) => toggleTrend(String((e as unknown as { dataKey?: string }).dataKey))}
                        formatter={(value, entry) => {
                          const key = String((entry as unknown as { dataKey?: string })?.dataKey);
                          const off = hiddenTrend[key];
                          return (
                            <span style={{ color: off ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))', textDecoration: off ? 'line-through' : 'none' }}>
                              {value}
                            </span>
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="matches" name="Partite" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} hide={hiddenTrend.matches} />
                      <Line type="monotone" dataKey="votes" name="Voti" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} hide={hiddenTrend.votes} />
                      <Line type="monotone" dataKey="playerCards" name="Player Cards" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} hide={hiddenTrend.playerCards} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribuzione + Top Teams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Distribuzione utenti
                  <SectionInfo title="Distribuzione utenti">
                    <p>Ripartizione della base utenti attuale (valore assoluto, non dipende dal filtro).</p>
                    <p><b>Registrati</b>: account completi non-ospite.</p>
                    <p><b>Ospiti</b>: account in modalità guest.</p>
                  </SectionInfo>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={playersDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        stroke="hsl(var(--card))"
                      >
                        {playersDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <RTooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                      <Legend
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(value, entry) => (
                          <span style={{ color: 'hsl(var(--foreground))' }}>
                            {value} ({(entry?.payload as unknown as { value?: number })?.value ?? 0})
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top team per numero di partite nel periodo */}
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" /> {rl('Top 5 Team per partite')}
                  <SectionInfo title="Top 5 Team per partite">
                    <p>Le squadre più attive, ordinate per numero di partite create nel periodo selezionato.</p>
                    <p><b>Partite</b>: quante partite ha creato il team nel periodo.</p>
                    <p><b>Membri</b>: componenti attuali della squadra.</p>
                  </SectionInfo>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topTeams.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center gap-2 text-center">
                    <Trophy className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {isLoading ? 'Caricamento dati...' : 'Nessun team con partite nel periodo selezionato.'}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {topTeams.map((t, i) => {
                      const maxCount = topTeams[0]?.matchCount || 1;
                      const width = Math.max(6, Math.round((t.matchCount / maxCount) * 100));
                      const rankColor = i === 0 ? 'bg-amber-400 text-amber-950'
                        : i === 1 ? 'bg-slate-300 text-slate-900'
                          : i === 2 ? 'bg-orange-400 text-orange-950'
                            : 'bg-muted text-muted-foreground';
                      return (
                        <li key={t.teamId} className="flex items-center gap-3">
                          <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rankColor}`}>
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground text-sm truncate">{t.teamName}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {t.matchCount} partite · {t.memberCount} membri
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Activity, Users, UserPlus, Shield, Trophy, Star, Vote, Link as LinkIcon,
  TrendingUp, Calendar, Award, CreditCard, Sparkles, Crown,
} from 'lucide-react';
import { Match } from '@/types/match';
// TODO: valutare quale tipo User usare per le metriche dei giocatori:
//   - User da '@/types/api'   → tipo completo (teamIds: string[], id opzionale)
//   - User da '@/types/match' → tipo semplificato (teamId: string, id obbligatorio)
// Per ora usiamo User da api.ts; adattare i filtri di conseguenza.
import { User, Team } from '@/types/api';
import { PlayerCard } from '@/types/playerCard';
import { isAdmin } from '@/utils/permissions';

interface KpiProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}

const Kpi = ({ icon: Icon, label, value, hint, accent }: KpiProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
  >
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

export default function GodDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  // Guard di pagina: solo admin globali. Anche se al momento i widget
  // sono placeholder (TODO endpoint admin), blindiamo la rotta diretta.
  useEffect(() => {
    if (user && !isAdmin(user)) {
      toast.error('Area riservata agli amministratori.');
      navigate('/history', { replace: true });
    }
  }, [user, navigate]);

  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cards, setCards] = useState<PlayerCard[]>([]);

  useEffect(() => {
    // TODO: implementare le chiamate API reali con token admin.
    // Endpoint da creare (esempi):
    //   GET /api/admin/users     → lista tutti gli utenti registrati
    //   GET /api/admin/teams     → lista tutti i team
    //   GET /api/admin/players   → lista tutti i membri dei team
    //   GET /api/admin/matches   → lista tutte le partite (con votingSession)
    //   GET /api/admin/cards     → lista tutte le player cards
    //
    // Esempio di implementazione:
    // const token = localStorage.getItem('authToken');
    // const h = { Authorization: `Bearer ${token}` };
    // Promise.all([
    //   fetch('/api/admin/users',   { headers: h }).then(r => r.json()),
    //   fetch('/api/admin/teams',   { headers: h }).then(r => r.json()),
    //   fetch('/api/admin/players', { headers: h }).then(r => r.json()),
    //   fetch('/api/admin/matches', { headers: h }).then(r => r.json()),
    //   fetch('/api/admin/cards',   { headers: h }).then(r => r.json()),
    // ]).then(([u, t, p, m, c]) => {
    //   setUsers(u.data ?? []);
    //   setTeams(t.data ?? []);
    //   setPlayers(p.data ?? []);
    //   setMatches(m.data ?? []);
    //   setCards(c.data ?? []);
    // });
  }, []);

  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const MONTH = 30 * 24 * 60 * 60 * 1000;

  const stats = useMemo(() => {

    // ── Giocatori ospiti ─────────────────────────────────────────────────────
    // TODO (futuro): quando sarà implementato il sistema guest/inviti, i giocatori
    // avranno i campi `linkedUserId` e `inviteToken`. Per ora placeholder a 0.
    // const guests        = players.filter(p => !p.linkedUserId);
    // const linked        = players.filter(p => !!p.linkedUserId);
    // const pendingInvites = players.filter(p => p.inviteToken && !p.linkedUserId);
    const guestPlayers = 0;  // placeholder
    const linkedPlayers = players.length;
    const pendingInvites = 0; // placeholder

    const completedMatches = matches.filter(m => m.status === 'completed');
    // 'active' = partita con votazione aperta (in Lovable era 'awaiting_votes')
    const ongoingMatches = matches.filter(m => m.status === 'active');

    const matchesThisWeek = matches.filter(m => now - new Date(m.createdAt).getTime() <= WEEK);
    const matchesThisMonth = matches.filter(m => now - new Date(m.createdAt).getTime() <= MONTH);

    // ── Voti partita ─────────────────────────────────────────────────────────
    // Il tipo Match espone solo il conteggio aggregato tramite VotingSession.
    // TODO (API): per filtrare i voti per data serve un endpoint dedicato con
    // le submissions individuali (es. GET /api/admin/vote-submissions).
    const voteSubs = matches.reduce(
      (acc, m) => acc + (m.votingSession?.totalSubmissions ?? 0), 0
    );
    // Approssimazione: somma totalSubmissions delle partite create questa settimana
    const voteSubsThisWeek = matchesThisWeek.reduce(
      (acc, m) => acc + (m.votingSession?.totalSubmissions ?? 0), 0
    );

    // ── Player Cards ─────────────────────────────────────────────────────────
    const cardSubs = cards.flatMap(c => c.submissions || []);
    const completeCards = cards.filter(c => c.isComplete);

    // ── Utenti attivi (settimana) ─────────────────────────────────────────────
    // TODO (API): richiede un endpoint dedicato es. GET /api/admin/active-users.
    // Non calcolabile senza le submissions individuali con userId/raterId.
    const activeUsersCount = 0; // placeholder

    // ── Utenti con accesso pagato ────────────────────────────────────────────
    // TODO (futuro): aggiungere campo hasPaid / subscription al modello User.
    // const paidUsers = users.filter(u => u.hasPaid);
    const paidUsersCount = 0; // placeholder

    // ── Statistiche di gioco ──────────────────────────────────────────────────
    // TODO (API): gol, assist e rating finali richiedono un endpoint dedicato.
    // Match attuale espone solo VotingSession (totalSubmissions, participationRate).
    // const totalGoals = ...; const totalAssists = ...; const avgRating = ...;
    const totalGoals = 0; // placeholder
    const totalAssists = 0; // placeholder
    const avgRating = 0; // placeholder

    // ── Badge ─────────────────────────────────────────────────────────────────
    // TODO (futuro): i badge non sono ancora presenti nel tipo Match.
    // const totalBadges = completedMatches.reduce(
    //   (acc, m) => acc + Object.keys(m.badges || {}).length, 0
    // );
    const totalBadges = 0; // placeholder

    return {
      totalUsers: users.length,
      activeUsers: activeUsersCount,
      paidUsers: paidUsersCount,
      guestPlayers,
      linkedPlayers,
      pendingInvites,
      teams: teams.length,
      totalMatches: matches.length,
      completedMatches: completedMatches.length,
      ongoingMatches: ongoingMatches.length,
      matchesThisWeek: matchesThisWeek.length,
      matchesThisMonth: matchesThisMonth.length,
      totalCards: cards.length,
      completeCards: completeCards.length,
      cardSubs: cardSubs.length,
      voteSubs,
      voteSubsThisWeek,
      totalGoals,
      totalAssists,
      avgRating,
      totalBadges,
    };
  }, [users, teams, players, matches, cards, now]);

  // Trend ultime 8 settimane
  const weeklyTrend = useMemo(() => {
    const weeks: { label: string; partite: number; voti: number; cards: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * WEEK;
      const end = now - i * WEEK;
      const m = matches.filter(x => {
        const t = new Date(x.createdAt).getTime();
        return t >= start && t < end;
      }).length;
      const v = matches
        // TODO (API): approssimazione — usiamo totalSubmissions delle partite create in quella settimana.
        // Con un endpoint dedicato si potranno filtrare le submissions per data reale.
        .filter(x => { const t = new Date(x.createdAt).getTime(); return t >= start && t < end; })
        .reduce((acc, x) => acc + (x.votingSession?.totalSubmissions ?? 0), 0);
      const c = cards.flatMap(x => x.submissions || []).filter(s => {
        const t = new Date(s.submittedAt).getTime();
        return t >= start && t < end;
      }).length;
      weeks.push({ label: `S-${i}`, partite: m, voti: v, cards: c });
    }
    return weeks;
  }, [matches, cards, now]);

  // Top 5 team per attività
  const topTeams = useMemo(() => {
    return teams
      .map(t => {
        // Team usa _id (MongoDB); i match usano teamId come stringa
        const tm = matches.filter(m => m.teamId === t._id);
        // TODO: User da api.ts usa teamIds[] (array). Adattare se si cambia tipo User per i players.
        const tp = players.filter(p => p.teamIds?.includes(t._id));
        return {
          name: t.name,
          partite: tm.length,
          giocatori: tp.length,
        };
      })
      .sort((a, b) => b.partite - a.partite)
      .slice(0, 5);
  }, [teams, matches, players]);

  // Distribuzione giocatori
  const playersDistribution = [
    { name: 'Registrati', value: stats.linkedPlayers, color: 'hsl(var(--primary))' },
    { name: 'Ospiti', value: stats.guestPlayers, color: 'hsl(var(--accent))' },
  ];

  // Early-return: se non sei admin globale, non rendere nulla mentre il
  // useEffect ti redirige. Evita un "flash" del contenuto.
  if (!user || !isAdmin(user)) return null;

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
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground leading-tight">
                God Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Panoramica generale dell'app</p>
            </div>
            <Badge variant="outline" className="ml-auto hidden sm:flex border-accent/40 text-accent">
              Live
            </Badge>
          </motion.div>

          {/* SEZIONE 1: Utenti */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Utenti & Giocatori
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={Users} label="Utenti registrati" value={stats.totalUsers} hint={`${stats.paidUsers} con accesso pagato`} />
              <Kpi icon={TrendingUp} label="Attivi 7 giorni" value={stats.activeUsers} hint="hanno votato di recente" accent />
              <Kpi icon={UserPlus} label="Giocatori ospiti" value={stats.guestPlayers} hint="non registrati" />
              <Kpi icon={LinkIcon} label="Inviti pendenti" value={stats.pendingInvites} hint="link generati, non usati" />
            </div>
          </section>

          {/* SEZIONE 2: Team & Partite */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Team & Partite
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={Shield} label="Team totali" value={stats.teams} />
              <Kpi icon={Trophy} label="Partite totali" value={stats.totalMatches} hint={`${stats.completedMatches} completate`} />
              <Kpi icon={Calendar} label="Partite questa settimana" value={stats.matchesThisWeek} accent />
              <Kpi icon={Vote} label="In attesa di voti" value={stats.ongoingMatches} hint="match aperti" />
            </div>
          </section>

          {/* SEZIONE 3: Engagement */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" /> Engagement & Contenuti
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi icon={Vote} label="Voti partita totali" value={stats.voteSubs} hint={`${stats.voteSubsThisWeek} questa settimana`} />
              <Kpi icon={Star} label="Player Cards create" value={stats.totalCards} hint={`${stats.completeCards} complete`} accent />
              <Kpi icon={Award} label="Badge assegnati" value={stats.totalBadges} />
              <Kpi icon={CreditCard} label="Conversioni paid" value={`${stats.totalUsers ? Math.round((stats.paidUsers / stats.totalUsers) * 100) : 0}%`} hint={`${stats.paidUsers}/${stats.totalUsers}`} />
            </div>
          </section>

          {/* SEZIONE 4: Performance partite */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" /> Statistiche di Gioco
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <Kpi icon={Trophy} label="Gol totali" value={stats.totalGoals} />
              <Kpi icon={Sparkles} label="Assist totali" value={stats.totalAssists} />
              <Kpi icon={Star} label="Voto medio" value={stats.avgRating.toFixed(2)} accent />
            </div>
          </section>

          {/* GRAFICO: trend settimanale */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Trend ultime 8 settimane
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <RTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="partite" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="voti" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="cards" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Distribuzione + Top Teams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Distribuzione giocatori
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
                      >
                        {playersDistribution.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" /> Top 5 Team per partite
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topTeams.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nessun team ancora.</p>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topTeams} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                        <RTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="partite" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-4">
            Dati calcolati in tempo reale dal localStorage corrente del browser.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

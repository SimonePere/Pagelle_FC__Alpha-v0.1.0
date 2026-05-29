import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Users, Copy, Trash2, Save, MapPin, KeyRound, LogOut, Palette, Trophy, Goal, UserCheck, Calendar, Shield, Image, ToggleLeft, Upload, ChevronDown, Info, Edit } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { fetchTeamById, leaveTeam, updateTeam, removeMember } from '@/redux/slices/teamSlice';
import { refreshUserData } from '@/redux/slices/authSlice';
import { useActiveTeamId } from '@/hooks/useActiveTeamId';
import { isTeamAdmin } from '@/utils/permissions';
import EditTeamMemberModal, { type EditableMember } from '@/components/EditTeamMemberModal';
import { RoleBadge, deriveMemberRole } from '@/components/RoleBadge';
// [RIMOSSO] BachecaAwards: la sezione awards nella pagina Team è stata disattivata.
// Gli awards del team sono ora consultabili solo dalla pagina dedicata /awards.
// import BachecaAwards, { MOCK_BACHECA_AWARDS } from '@/components/BachecaAwards';
import PaginatedSwiper from '@/components/PaginatedSwiper';

export default function TeamPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();

  const { user } = useSelector((state: RootState) => state.auth);
  const { currentTeam, isLoading: teamLoading, error: teamError } = useSelector((state: RootState) => state.teams);

  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColorPrimary, setEditColorPrimary] = useState('#007bff');
  const [editColorSecondary, setEditColorSecondary] = useState('#6c757d');
  const [editAvatar, setEditAvatar] = useState('');
  const [editAutoApprove, setEditAutoApprove] = useState(false);
  const [editAllowGuestVoting, setEditAllowGuestVoting] = useState(false);
  // 🔒 Modale di modifica del singolo membro (apre per-card)
  const [editingMember, setEditingMember] = useState<EditableMember | null>(null);

  const { activeTeamId } = useActiveTeamId();

  // Carica team e membri
  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    if (activeTeamId) {
      dispatch(fetchTeamById(activeTeamId));
    }
  }, [user, activeTeamId, dispatch, navigate]);

  // Sincronizza i campi di edit quando il team viene caricato
  useEffect(() => {
    if (currentTeam) {
      const t = currentTeam as any;
      setEditName(t.name || '');
      setEditCity(t.city || '');
      setEditDescription(t.description || '');
      setEditColorPrimary(t.colors?.primary || '#007bff');
      setEditColorSecondary(t.colors?.secondary || '#6c757d');
      setEditAvatar(t.avatar || '');
      setEditAutoApprove(t.settings?.autoApprove ?? false);
      setEditAllowGuestVoting(t.settings?.allowGuestVoting ?? false);
    }
  }, [currentTeam]);

  if (!user) return null;

  if (teamLoading && !currentTeam) {
    return (
      <DashboardLayout>
        <div className="pb-4 lg:pb-8">
          <div className="p-4 pt-2 lg:p-8 max-w-4xl mx-auto">
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardContent className="py-10 text-center text-muted-foreground">
                Caricamento team in corso...
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentTeam) {
    return (
      <DashboardLayout>
        <div className="pb-4 lg:pb-8">
          <div className="p-4 pt-2 lg:p-8 max-w-4xl mx-auto space-y-4">
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader>
                <CardTitle>Il tuo team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!activeTeamId && (
                  <p className="text-muted-foreground">
                    Non risulti ancora associato a un team. Crea o unisciti a un team dalla schermata di accesso o profilo.
                  </p>
                )}
                {activeTeamId && (
                  <p className="text-muted-foreground">
                    Non riesco a caricare i dettagli del team al momento.
                  </p>
                )}
                {teamError && (
                  <p className="text-destructive text-sm">{teamError}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const teamId = currentTeam._id || (currentTeam as any).id;
  const userId = user.id || user._id;

  // Membri e admin direttamente dalla risposta GET /teams/:teamId (già popolati)
  const members: any[] = Array.isArray(currentTeam.memberIds) ? currentTeam.memberIds : [];
  const adminIds: string[] = Array.isArray(currentTeam.adminIds)
    ? currentTeam.adminIds.map((a: any) => typeof a === 'string' ? a : (a.id || a._id))
    : [];
  const isUserAdmin = (currentTeam as any).isUserAdmin === true;

  const handleSaveDetails = async () => {
    if (!editName.trim()) {
      toast({ title: 'Errore', description: 'Il nome del team non può essere vuoto.', variant: 'destructive' });
      return;
    }

    const t = currentTeam as any;
    const changes: string[] = [];
    const warnings: string[] = [];

    if (editName.trim() !== (t.name || '')) changes.push('Nome del team');
    if (editDescription.trim() !== (t.description || '')) changes.push('Descrizione');
    if (editCity.trim() !== (t.city || '')) changes.push('Città');
    if (editAvatar.trim() !== (t.avatar || '')) changes.push('Avatar');
    if (editColorPrimary !== (t.colors?.primary || '#007bff')) changes.push('Colore primario');
    if (editColorSecondary !== (t.colors?.secondary || '#6c757d')) changes.push('Colore secondario');

    if (editAutoApprove !== (t.settings?.autoApprove ?? false)) {
      warnings.push(editAutoApprove
        ? 'Approvazione automatica → ATTIVA (i nuovi membri entreranno senza approvazione admin)'
        : 'Approvazione automatica → DISATTIVA (i nuovi membri dovranno essere approvati)');
    }
    if (editAllowGuestVoting !== (t.settings?.allowGuestVoting ?? false)) {
      warnings.push(editAllowGuestVoting
        ? 'Voti da ospiti → ABILITATI (utenti esterni potranno esprimere voti)'
        : 'Voti da ospiti → DISABILITATI (solo i membri potranno votare)');
    }

    if (changes.length === 0 && warnings.length === 0) {
      toast({ title: 'Nessuna modifica', description: 'Non hai apportato modifiche.' });
      return;
    }

    // Conferma impostazioni sensibili (impattano calcoli/logiche)
    if (warnings.length > 0) {
      const msg = '⚠️ Stai modificando impostazioni che influenzano il funzionamento del team:\n\n'
        + warnings.map(w => '• ' + w).join('\n')
        + (changes.length > 0 ? '\n\nAltre modifiche: ' + changes.join(', ') : '')
        + '\n\nConfermi?';
      if (!confirm(msg)) return;
    } else {
      // Conferma generica per modifiche non-sensibili
      if (!confirm('Confermi le modifiche a: ' + changes.join(', ') + '?')) return;
    }

    const result = await dispatch(updateTeam({
      teamId,
      data: {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        city: editCity.trim() || undefined,
        avatar: editAvatar.trim() || undefined,
        colors: { primary: editColorPrimary, secondary: editColorSecondary },
        settings: { autoApprove: editAutoApprove, allowGuestVoting: editAllowGuestVoting }
      }
    }));

    if (updateTeam.fulfilled.match(result)) {
      dispatch(refreshUserData());
      toast({ title: 'Team aggiornato', description: 'Le modifiche sono state salvate.' });
    } else {
      toast({ title: 'Errore', description: (result.payload as string) || 'Impossibile aggiornare il team.', variant: 'destructive' });
    }
  };

  const handleCopyCode = async () => {
    const code = (currentTeam as any).inviteCode || currentTeam.inviteCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Codice copiato!', description: `${code} è negli appunti.` });
    } catch {
      // Fallback per contesti non-HTTPS (dev locale)
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({ title: 'Codice copiato!', description: `${code} è negli appunti.` });
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Sei sicuro di voler lasciare il team?')) return;

    const result = await dispatch(leaveTeam(teamId));
    if (leaveTeam.fulfilled.match(result)) {
      toast({ title: 'Hai lasciato il team' });
      dispatch(refreshUserData());
      navigate('/');
    } else {
      toast({ title: 'Errore', description: (result.payload as string) || 'Impossibile lasciare il team.', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find((m: any) => (m.id || m._id) === memberId);
    if (!member) return;

    const isSelf = memberId === userId;

    if (isSelf) {
      handleLeaveTeam();
      return;
    }

    if (!confirm(`Rimuovere ${member.name} dal team?`)) return;

    const result = await dispatch(removeMember({ teamId, userId: memberId }));
    if (removeMember.fulfilled.match(result)) {
      // Ricarica team (contiene i membri aggiornati)
      dispatch(fetchTeamById(teamId));
      toast({ title: 'Membro rimosso', description: `${member.name} è stato rimosso dal team.` });
    } else {
      toast({ title: 'Errore', description: (result.payload as string) || 'Impossibile rimuovere il membro.', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="pb-4 lg:pb-8">
        <div className="p-4 pt-2 lg:p-8 space-y-5 lg:space-y-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border-border shadow-card p-5 sm:p-6 lg:p-8"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4">
                <h1 className="font-display text-3xl sm:text-4xl leading-none font-bold text-foreground flex items-center gap-2 sm:gap-3">
                  <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                  Il tuo team
                </h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Informazioni team"
                      className="p-2 rounded-full hover:bg-primary/10 transition-colors"
                    >
                      <Info className="w-5 h-5 text-primary cursor-pointer" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" side="bottom" align="end">
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Come Funziona</h4>
                      <p className="text-sm text-muted-foreground">
                        Gestisci membri, impostazioni e codice invito del team attivo.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
          </motion.div>

          {/* Dettagli team */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
            {/* <CardHeader>
              <CardTitle>Dettagli team</CardTitle>
            </CardHeader> */}
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome del team</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Breve descrizione del team" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Città fondazione</Label>
                <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Es: Roma, Milano, Napoli" />
                <p className="text-xs text-muted-foreground">Usata per mostrare le previsioni meteo in Home e nella creazione partita.</p>
              </div>
              {/* [DISABILITATO] Stemma, colori e impostazioni — commentati temporaneamente,
                  si mostrano solo: nome team, descrizione, città e salva.
              <div className="space-y-2 overflow-hidden">
                <Label className="flex items-center gap-2"><Image className="w-4 h-4" /> Stemma del team</Label>
                <div className="flex items-center gap-3">
                  <Avatar className="w-14 h-14 min-w-[3.5rem] rounded-lg border border-border flex-shrink-0">
                    <AvatarImage src={editAvatar} alt="Anteprima stemma" className="rounded-lg object-cover" />
                    <AvatarFallback className="rounded-lg bg-secondary text-muted-foreground text-xs">Nessuna</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Button variant="outline" size="sm" disabled className="w-full opacity-60 truncate">
                      <Upload className="w-4 h-4 flex-shrink-0" /> <span className="truncate">Carica immagine (prossimamente)</span>
                    </Button>
                    <Input value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} placeholder="oppure incolla URL immagine" className="text-xs w-full" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Palette className="w-4 h-4" /> Colori del team</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input type="color" value={editColorPrimary} onChange={(e) => setEditColorPrimary(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border" />
                    <span className="text-sm text-muted-foreground">Primario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editColorSecondary} onChange={(e) => setEditColorSecondary(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border" />
                    <span className="text-sm text-muted-foreground">Secondario</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4 pt-2 border-t border-border/50">
                <Label className="flex items-center gap-2"><ToggleLeft className="w-4 h-4" /> Impostazioni</Label>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Approvazione automatica</p>
                    <p className="text-xs text-muted-foreground">I nuovi membri vengono accettati automaticamente senza approvazione admin.</p>
                  </div>
                  <Switch checked={editAutoApprove} onCheckedChange={setEditAutoApprove} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Voti da ospiti</p>
                    <p className="text-xs text-muted-foreground">Consenti a utenti non membri del team di esprimere voti nelle partite.</p>
                  </div>
                  <Switch checked={editAllowGuestVoting} onCheckedChange={setEditAllowGuestVoting} />
                </div>
              </div>
              */}
              {isTeamAdmin(user, currentTeam as any) && (
                <Button onClick={handleSaveDetails} disabled={teamLoading}><Save className="w-4 h-4" /> Salva modifiche</Button>
              )}
            </CardContent>
          </Card>

          {/* Statistiche team */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" /> Statistiche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-secondary/40 rounded-lg border border-border/50">
                  <div className="text-2xl font-display font-bold text-foreground">{(currentTeam as any).stats?.totalMatches ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Partite</div>
                </div>
                <div className="text-center p-3 bg-secondary/40 rounded-lg border border-border/50">
                  <div className="text-2xl font-display font-bold text-primary">{(currentTeam as any).stats?.totalGoals ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Gol totali</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* [RIMOSSA] Bacheca Awards in pagina Team: la feature è ora dedicata alla pagina /awards. */}

          {/* Codice invito */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-accent" /> Codice invito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Condividi questo codice con chi vuoi aggiungere al team. Lo userà nella schermata di registrazione.
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="font-display font-bold text-3xl tracking-widest text-primary px-4 py-2 rounded-lg border border-border bg-primary/5">
                  {(currentTeam as any).inviteCode || currentTeam.inviteCode || '—'}
                </div>
                <Button onClick={handleCopyCode} variant="outline" size="sm"><Copy className="w-4 h-4" /> Copia</Button>
              </div>
            </CardContent>
          </Card>

          {/* Membri */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Membri ({members.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaginatedSwiper
                items={members}
                pageSize={5}
                renderPage={(pageMembers) => (
                  <div className="space-y-3">
                    {pageMembers.map((m: any) => {
                      const memberId = m.id || m._id || '';
                      const isSelf = memberId === userId;
                      // Ruolo derivato: 'admin' (global o team) | 'guest' | 'player'
                      const role = deriveMemberRole(m, adminIds);
                      return (
                        <div key={memberId} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg border border-border/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={m.avatarUrl} alt={m.name} />
                              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                                {m.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                                <span className="truncate">{m.name}</span>
                                {isSelf && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Tu</Badge>}
                                <RoleBadge role={role} />
                              </div>
                              {m.email && <div className="text-xs text-muted-foreground truncate">{m.email}</div>}
                            </div>
                          </div>
                          {/* ✏️ Bottone modifica membro (solo admin di team / globali). Stile coerente con MatchDetailsCard. */}
                          {isUserAdmin && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-8 px-3 shrink-0"
                              onClick={() => setEditingMember({
                                id: memberId,
                                name: m.name,
                                email: m.email,
                                avatarUrl: m.avatarUrl,
                                isGuest: !!m.isGuest,
                                canPromoteToPlayer: !!m.canPromoteToPlayer,
                                role,
                              })}
                              aria-label={`Modifica ${m.name}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          )}
                          {/* TODO: Riabilitare quando la gestione membri sarà attiva
                          {(isSelf || isUserAdmin) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!memberId || teamLoading}
                              onClick={() => memberId && handleRemoveMember(memberId)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {isSelf ? <><LogOut className="w-4 h-4" /> Lascia</> : <><Trash2 className="w-4 h-4" /> Rimuovi</>}
                            </Button>
                          )}
                          */}
                        </div>
                      );
                    })}
                  </div>
                )}
              />
            </CardContent>
          </Card>

          {/* Info team */}
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" /> Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Nome team</span>
                  <span className="font-medium text-foreground">{(currentTeam as any).name || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2"><UserCheck className="w-4 h-4" /> Fondatore</span>
                  <span className="font-medium text-foreground">{(currentTeam as any).createdBy?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Capienza</span>
                  <span className="font-medium text-foreground">
                    {members.length}/{(currentTeam as any).settings?.maxMembers ?? 25}
                    {(currentTeam as any).isFull && <Badge variant="destructive" className="ml-2 text-xs">Pieno</Badge>}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Stato</span>
                  <Badge variant={(currentTeam as any).isActive ? 'default' : 'destructive'}>
                    {(currentTeam as any).isActive ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Creato il</span>
                  <span className="font-medium text-foreground">
                    {(currentTeam as any).createdAt ? new Date((currentTeam as any).createdAt).toLocaleDateString('it-IT') : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Ultimo aggiornamento</span>
                  <span className="font-medium text-foreground">
                    {(currentTeam as any).updatedAt ? new Date((currentTeam as any).updatedAt).toLocaleDateString('it-IT') : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modale di modifica del singolo membro (solo admin) */}
      {isUserAdmin && (
        <EditTeamMemberModal
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          teamId={teamId}
          member={editingMember}
        />
      )}
    </DashboardLayout>
  );
}

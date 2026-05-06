import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux hooks/redux hooks';
import { submitPlayerCardVote } from '../../redux/slices/votingSlice';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Loader2, Send, Trophy, User, Dumbbell, Target, Star, ArrowLeft, AlertTriangle, Vote as VotingIcon } from 'lucide-react';
import { toast } from 'sonner';
import type {
  PlayerCardRatingVote as PlayerCardRatingVoteType,
  PlayerCardAttributes,
  PlayerProfile
} from '../../types/voting';

interface PlayerCardRatingVoteProps {
  sessionId: string;
}

export function PlayerCardRatingVote({ sessionId }: PlayerCardRatingVoteProps) {
  const dispatch = useAppDispatch();

  // Debug: controlliamo tutte le sessioni
  const allSessions = useAppSelector(state => state.voting.sessions);
  const session = useAppSelector(state =>
    state.voting.sessions.find(s => s.id === sessionId)
  );
  const isSubmitting = useAppSelector(state => state.voting.isSubmittingVote);

  if (!session) {
    console.error('❌ SESSIONE NON TROVATA - ID richiesto:', sessionId);
    console.error('❌ Sessioni disponibili:', allSessions.map(s => ({ id: s.id, type: s.type })));
    return (
      <div className="p-4 text-center text-red-500">
        <p>Errore: Sessione di voto non trovata</p>
        <p className="text-sm">ID richiesto: {sessionId}</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'profilo' | 'fisico' | 'tecnica' | 'portiere' | 'stelle'>('profilo');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);


  // Stati per profilo giocatore
  const [profile, setProfile] = useState({
    position: 'CC' as const,
    preferredRole: 'none' // Cambiamo da stringa vuota a 'none'
  });

  const getTabsForPosition = () => {
    return ((profile.position as string) === 'POR')
      ? ['profilo', 'portiere']
      : ['profilo', 'fisico', 'tecnica', 'stelle'];
  };

  // Stati per attributi estesi - valori iniziali minimi per forzare la valutazione
  const [attributes, setAttributes] = useState({
    // Tecnici - partiamo da 60 (minimo degli slider)
    tir: 60,
    pas: 60,
    dri: 60,
    fin: 60,
    vis: 60,
    // Fisici
    res: 60,
    for: 60,
    con: 60,
    int: 60,
    prt: 60,
    // Stelle
    piedeDebole: 1,
    skill: 1,
    // Portiere OPZIONALI - partiamo da 60 (minimo degli slider)
    tf: 60,
    pr: 60,
    rn: 60,
    pz: 60,
    rf: 60,
  });

  const [comments, setComments] = useState('');

  // // Opzioni per Select
  // const positionOptions = [
  //   { value: 'POR', label: 'POR (Portiere)' },
  //   { value: 'DC', label: 'DC (Difensore Centrale)' },
  //   { value: 'CC', label: 'CC (Centrocampista Centrale)' },
  //   { value: 'AT', label: 'AT (Attaccante)' }
  // ];



  const handleAttributeChange = (key: keyof typeof attributes, value: number) => {
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNextStep = () => {
    const currentTabs = getTabsForPosition();
    const currentIndex = currentTabs.indexOf(activeTab);

    if (currentIndex < currentTabs.length - 1) {
      // Vai al prossimo tab
      setActiveTab(currentTabs[currentIndex + 1] as any);
    } else {
      // Ultimo step - mostra dialog di conferma
      setShowConfirmDialog(true);
    }
  };

  const handlePrevStep = () => {
    const currentTabs = getTabsForPosition();
    const currentIndex = currentTabs.indexOf(activeTab);

    if (currentIndex > 0) {
      // Vai al tab precedente
      setActiveTab(currentTabs[currentIndex - 1] as any);
    }
  };

  const getButtonText = () => {
    const isMobile = window.innerWidth < 640;
    const currentTabs = getTabsForPosition();
    const currentIndex = currentTabs.indexOf(activeTab);
    const isLastTab = currentIndex === currentTabs.length - 1;

    if (isLastTab) {
      return isMobile ? ' Invia' : ' Invia Valutazione Finale';
    }

    const nextTab = currentTabs[currentIndex + 1];
    const nextLabels = {
      'fisico': isMobile ? 'Fisico' : 'Avanti: Attributi Fisici',
      'tecnica': isMobile ? 'Tecnica' : 'Avanti: Attributi Tecnici',
      'portiere': isMobile ? 'Portiere' : 'Avanti: Attributi Portiere',
      'stelle': isMobile ? 'Stelle' : 'Avanti: Abilità Speciali'
    };

    return nextLabels[nextTab as keyof typeof nextLabels] || 'Avanti';
  };

  // Funzione per controllare quanti attributi sono ancora ai valori di default
  const getDefaultValuesCount = () => {
    if ((profile.position as string) === 'POR') {
      // Per i portieri, controlla solo gli attributi portiere
      const goalkeeperAttributes = ['tf', 'pr', 'rn', 'pz', 'rf'].filter(
        attr => attributes[attr as keyof typeof attributes] === 60
      );
      return goalkeeperAttributes.length;
    } else {
      // Per giocatori normali, controlla gli attributi base
      const defaultAttributes = ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for', 'con', 'int', 'prt'].filter(
        attr => attributes[attr as keyof typeof attributes] === 60
      );
      return defaultAttributes.length;
    }
  };

  // Funzione per validare che tutti gli attributi obbligatori siano stati modificati dal default
  const isValidForSubmit = () => {
    const mainAttributes = ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for', 'con', 'int', 'prt'];

    if ((profile.position as string) === 'POR') {
      return ['tf', 'pr', 'rn', 'pz', 'rf'].every(attr => attributes[attr] > 60);
    } else {
      return mainAttributes.every(attr => attributes[attr] > 60);
    }
  };


  // Funzione per confermare e inviare
  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!session) {
      toast.error('Sessione non trovata');
      return;
    }

    try {
      // Struttura del voto compatibile con backend
      const voteData = {
        vote: {
          // Attributi principali obbligatori (scala 60-100)
          attributes: {
            tir: attributes.tir,
            pas: attributes.pas,
            dri: attributes.dri,
            fin: attributes.fin,
            vis: attributes.vis,
            res: attributes.res,
            for: attributes.for,
            con: attributes.con,
            int: attributes.int,
            prt: attributes.prt,
            piedeDebole: attributes.piedeDebole,
            skill: attributes.skill,

            // Attributi portiere (opzionali)
            tf: attributes.tf,
            pr: attributes.pr,
            rn: attributes.rn,
            pz: attributes.pz,
            rf: attributes.rf,
          },
          // Profilo giocatore
          profile: {
            position: profile.position,
            preferredRole: profile.preferredRole !== 'none' ? profile.preferredRole : undefined
          },
          // Commenti opzionali
          comment: comments.trim() || undefined
        }
      };
      await dispatch(submitPlayerCardVote({
        sessionId: session.id,
        voteData
      })).unwrap();

      toast.success('🎉 Valutazione inviata con successo!');
    } catch (error) {
      console.error('❌ Errore invio valutazione:', error);
      toast.error('Errore durante l\'invio della valutazione');
    }
  };

  // Se ha già votato, mostra messaggio completato
  if (session.hasVoted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            Valutazione Completata
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Sistema Tab funzionante
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 min-w-0">
        <VotingIcon className="h-5 w-5 text-primary shrink-0" />
        <p className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground truncate leading-none">
          Votazione Player Card
        </p>
      </div>


      {/* Tab System - Solo indicatori di progresso, non più navigazione libera */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className={`grid w-full ${(profile.position as string) === 'POR' ? 'grid-cols-2' : 'grid-cols-4'}`}>

          <TabsTrigger value="profilo" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profilo
          </TabsTrigger>
          {(profile.position as string) !== 'POR' && (
            <TabsTrigger value="fisico" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Fisico
            </TabsTrigger>
          )}
          {(profile.position as string) !== 'POR' && (
            <TabsTrigger value="tecnica" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Tecnica
            </TabsTrigger>
          )}
          {(profile.position as string) !== 'POR' && (
            <TabsTrigger value="stelle" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Stelle
            </TabsTrigger>
          )}
          {(profile.position as string) === 'POR' && (
            <TabsTrigger value="portiere" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Portiere
            </TabsTrigger>
          )}

        </TabsList>

        {/* Tab Content - Profilo */}
        <TabsContent value="profilo" className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                PROFILO GIOCATORE
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Posizione</Label>
                <Select
                  value={profile.position}
                  onValueChange={(value) => {
                    setProfile({ ...profile, position: value as any });
                    setActiveTab('profilo'); // Reset al primo tab quando cambia posizione
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POR">POR (Portiere)</SelectItem>
                    <SelectItem value="DC">DC (Difensore Centrale)</SelectItem>
                    <SelectItem value="TS">TS (Terzino Sinistro)</SelectItem>
                    <SelectItem value="TD">TD (Terzino Destro)</SelectItem>
                    <SelectItem value="CC">CC (Centrocampista Centrale)</SelectItem>
                    <SelectItem value="CDC">CDC (Centrocampista Difensivo)</SelectItem>
                    <SelectItem value="COC">COC (Centrocampista Offensivo)</SelectItem>
                    <SelectItem value="ED">ED (Esterno Destro)</SelectItem>
                    <SelectItem value="ES">ES (Esterno Sinistro)</SelectItem>
                    <SelectItem value="AT">AT (Seconda Punta)</SelectItem>
                    <SelectItem value="AD">AD (Ala Destra)</SelectItem>
                    <SelectItem value="AS">AS (Ala Sinistra)</SelectItem>
                    <SelectItem value="ATT">ATT (Attaccante Centrale)</SelectItem>
                  </SelectContent>
                </Select>
              </div>


            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content - Fisico */}
        <TabsContent value="fisico" className="space-y-4">
          {[
            { key: 'res' as const, label: 'RES (Resistenza)', description: 'Resistenza e stamina' },
            { key: 'for' as const, label: 'FOR (Forza)', description: 'Forza fisica e contrasti' },
            { key: 'con' as const, label: 'CON (Contrasto)', description: 'Contrasto e scivolata' },
            { key: 'int' as const, label: 'INT (Intercettazioni)', description: 'Intercettazioni e letture difensive' },
            { key: 'prt' as const, label: 'PRT (Precisione testa)', description: 'Precisione nei colpi di testa' }
          ].map((attr) => (
            <Card key={attr.key}>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  {attr.label}
                </h3>
                <p className="text-sm text-muted-foreground">{attr.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Valore: {attributes[attr.key]}</Label>
                    <Badge variant="outline" className="font-mono">
                      {attributes[attr.key]}/100
                    </Badge>
                  </div>
                  <Slider
                    value={[attributes[attr.key]]}
                    onValueChange={(value) => handleAttributeChange(attr.key, value[0])}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Scarso (60)</span>
                    <span>Medio (80)</span>
                    <span>Eccellente (100)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab Content - Tecnica */}
        <TabsContent value="tecnica" className="space-y-4">
          {[
            { key: 'tir' as const, label: 'TIR (Tiro)', description: 'Precisione e potenza dei tiri' },
            { key: 'pas' as const, label: 'PAS (Passaggio)', description: 'Qualità dei passaggi' },
            { key: 'dri' as const, label: 'DRI (Dribbling)', description: 'Controllo palla e dribbling' },
            { key: 'fin' as const, label: 'FIN (Finalizzazione)', description: 'Capacità di finalizzazione sotto porta' },
            { key: 'vis' as const, label: 'VIS (Visione)', description: 'Visione di gioco e capacità di lettura' }
          ].map((attr) => (
            <Card key={attr.key}>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {attr.label}
                </h3>
                <p className="text-sm text-muted-foreground">{attr.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Valore: {attributes[attr.key]}</Label>
                    <Badge variant="outline" className="font-mono">
                      {attributes[attr.key]}/100
                    </Badge>
                  </div>
                  <Slider
                    value={[attributes[attr.key]]}
                    onValueChange={(value) => handleAttributeChange(attr.key, value[0])}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Scarso (60)</span>
                    <span>Medio (80)</span>
                    <span>Eccellente (100)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab Content - Stelle */}
        <TabsContent value="stelle" className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Skill Stars</h3>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Piede Debole */}
              <div className="space-y-3">
                <Label className="font-medium">Piede Debole</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleAttributeChange('piedeDebole', star)}
                      className={`text-2xl transition-colors ${star <= attributes.piedeDebole ? 'text-yellow-500' : 'text-gray-300'
                        }`}
                    >
                      ★
                    </button>
                  ))}
                  <Badge variant="outline" className="ml-2">
                    {attributes.piedeDebole}/5
                  </Badge>
                </div>
              </div>

              {/* Skill Moves */}
              <div className="space-y-3">
                <Label className="font-medium">Skill Moves</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleAttributeChange('skill', star)}
                      className={`text-2xl transition-colors ${star <= attributes.skill ? 'text-yellow-500' : 'text-gray-300'
                        }`}
                    >
                      ★
                    </button>
                  ))}
                  <Badge variant="outline" className="ml-2">
                    {attributes.skill}/5
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab condizionale - POR  */}
        <TabsContent value="portiere" className="space-y-4">
          {[
            { key: 'tf' as const, label: 'TF (Tuffo)', description: 'Tuffo' },
            { key: 'pr' as const, label: 'PR (Presa)', description: 'Qualità della presa' },
            { key: 'rn' as const, label: 'RN (Rinvio)', description: 'Rinvio' },
            { key: 'pz' as const, label: 'PZ (Piazzamento)', description: 'Piazzamento' },
            { key: 'rf' as const, label: 'RF (Riflessi)', description: 'Riflessi' }
          ].map((attr) => (
            <Card key={attr.key}>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {attr.label}
                </h3>
                <p className="text-sm text-muted-foreground">{attr.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Valore: {attributes[attr.key]}</Label>
                    <Badge variant="outline" className="font-mono">
                      {attributes[attr.key]}/100
                    </Badge>
                  </div>
                  <Slider
                    value={[attributes[attr.key]]}
                    onValueChange={(value) => handleAttributeChange(attr.key, value[0])}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Scarso (60)</span>
                    <span>Medio (80)</span>
                    <span>Eccellente (100)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>



      {/* Commenti */}
      <Card>
        <CardHeader>
          <Label htmlFor="comments">Commenti e Note (opzionale)</Label>
        </CardHeader>
        <CardContent>
          <Textarea
            id="comments"
            placeholder="Aggiungi note sullo stile di gioco, punti di forza, aree di miglioramento..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Navigation e Submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Overall Rating verrà calcolato automaticamente dal server
              </div>
            </div>

            {isSubmitting && (
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            )}

            <div className="flex gap-2">
              {activeTab !== 'profilo' && (
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Indietro
                </Button>
              )}


              {(activeTab === 'stelle' || activeTab === 'portiere') ? (
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      onClick={handleNextStep}
                      disabled={isSubmitting}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Invio in corso...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          {getButtonText()}
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Conferma Invio Valutazione
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>Stai per inviare la valutazione finale per questo giocatore.</p>
                        {getDefaultValuesCount() > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <p className="text-yellow-800 font-medium">⚠️ Attenzione!</p>
                            <p className="text-yellow-700 text-sm">
                              Hai ancora {getDefaultValuesCount()} attributi con valore minimo (60).
                              Assicurati di aver valutato tutti gli attributi correttamente.
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Una volta inviata, non potrai più modificare questa valutazione.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleConfirmSubmit}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Sì, Invia Valutazione
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {getButtonText()}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
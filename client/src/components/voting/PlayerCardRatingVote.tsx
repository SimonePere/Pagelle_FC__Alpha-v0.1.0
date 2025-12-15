import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux hooks/redux hooks';
import { submitPlayerCardVote } from '../../redux/slices/votingSlice';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Loader2, Send, Trophy, User, Dumbbell, Target, Star, ArrowLeft, AlertTriangle } from 'lucide-react';
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

  // Debug log
  console.log('🎯 PlayerCardRatingVote Debug:', {
    sessionId,
    allSessions: allSessions.length,
    session: session ? 'FOUND' : 'NOT FOUND',
    sessionIds: allSessions.map(s => s.id)
  });

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

  const [activeTab, setActiveTab] = useState<'profilo' | 'fisico' | 'tecnica' | 'stelle'>('profilo');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Stati per profilo giocatore
  const [profile, setProfile] = useState({
    position: 'CC' as const,
    preferredRole: 'none' // Cambiamo da stringa vuota a 'none'
  });

  // Stati per attributi estesi - valori iniziali minimi per forzare la valutazione
  const [attributes, setAttributes] = useState({
    // Tecnici - partiamo da 10 (minimo degli slider)
    tir: 10,
    pas: 10,
    dri: 10,
    fin: 10,
    vis: 10,
    // Fisici
    res: 10,
    for: 10,
    // Stelle
    piedeDebole: 3,
    skill: 3
  });

  const [comments, setComments] = useState('');

  // Opzioni per Select
  const positionOptions = [
    { value: 'POR', label: 'POR (Portiere)' },
    { value: 'DC', label: 'DC (Difensore Centrale)' },
    { value: 'CC', label: 'CC (Centrocampista Centrale)' },
    { value: 'AT', label: 'AT (Attaccante)' }
  ];

  const preferredRoleOptions = [
    { value: '', label: 'Seleziona ruolo...' },
    { value: 'Difensore completo', label: 'Difensore completo' },
    { value: 'Centrocampista tuttofare', label: 'Centrocampista tuttofare' },
    { value: 'Finalizzatore', label: 'Finalizzatore' }
  ];

  const handleAttributeChange = (key: keyof typeof attributes, value: number) => {
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNextStep = () => {
    switch (activeTab) {
      case 'profilo':
        setActiveTab('fisico');
        break;
      case 'fisico':
        setActiveTab('tecnica');
        break;
      case 'tecnica':
        setActiveTab('stelle');
        break;
      case 'stelle':
        // Ultimo step - mostra dialog di conferma invece di inviare direttamente
        setShowConfirmDialog(true);
        break;
    }
  };

  const handlePrevStep = () => {
    switch (activeTab) {
      case 'stelle':
        setActiveTab('tecnica');
        break;
      case 'tecnica':
        setActiveTab('fisico');
        break;
      case 'fisico':
        setActiveTab('profilo');
        break;
    }
  };

  const getButtonText = () => {
    const isMobile = window.innerWidth < 640; // sm breakpoint
    switch (activeTab) {
      case 'profilo':
        return isMobile ? 'Fisico' : 'Avanti: Attributi Fisici';
      case 'fisico':
        return isMobile ? 'Tecnica' : 'Avanti: Attributi Tecnici';
      case 'tecnica':
        return isMobile ? 'Stelle' : 'Avanti: Abilità Speciali';
      case 'stelle':
        return isMobile ? '⚠️ Invia' : '⚠️ Invia Valutazione Finale';
      default:
        return 'Avanti';
    }
  };

  // Funzione per controllare quanti attributi sono ancora ai valori di default
  const getDefaultValuesCount = () => {
    const defaultAttributes = ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for'].filter(
      attr => attributes[attr as keyof typeof attributes] === 10
    );
    return defaultAttributes.length;
  };

  // Funzione per validare che tutti gli attributi principali siano stati modificati dal default
  const isValidForSubmit = () => {
    const mainAttributes = ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for'];
    return mainAttributes.every(attr => attributes[attr as keyof typeof attributes] > 10);
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

    console.log('🎯 Invio valutazione reale:', {
      sessionId: session.id,
      profile,
      attributes,
      comments: comments.trim()
    });

    try {
      // Struttura del voto compatibile con backend
      const voteData = {
        vote: {
          // Attributi principali (scala 10-100)
          attributes: {
            tir: attributes.tir,
            pas: attributes.pas,
            dri: attributes.dri,
            fin: attributes.fin,
            vis: attributes.vis,
            res: attributes.res,
            for: attributes.for,
            piedeDebole: attributes.piedeDebole,
            skill: attributes.skill
          },
          // Profilo giocatore
          profile: {
            position: profile.position,
            preferredRole: profile.preferredRole !== 'none' ? profile.preferredRole : undefined
          },
          // Commenti opzionali
          comments: comments.trim() || undefined
        }
      };

      console.log('📤 Invio al backend:', voteData);

      await dispatch(submitPlayerCardVote({
        sessionId: session.id,
        voteData
      })).unwrap();

      toast.success('🎉 Valutazione inviata con successo!');
      console.log('✅ Valutazione completata!');

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


      {/* Tab System - Solo indicatori di progresso, non più navigazione libera */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profilo" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profilo
          </TabsTrigger>
          <TabsTrigger value="fisico" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Fisico
          </TabsTrigger>
          <TabsTrigger value="tecnica" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Tecnica
          </TabsTrigger>
          <TabsTrigger value="stelle" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Stelle
          </TabsTrigger>
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
                  onValueChange={(value) => setProfile({ ...profile, position: value as any })}
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

              <div>
                <Label>Ruolo Preferito (opzionale)</Label>
                <Select
                  value={profile.preferredRole}
                  onValueChange={(value) => setProfile({ ...profile, preferredRole: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona ruolo preferito..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleziona ruolo...</SelectItem>
                    <SelectItem value="Difensore completo">Difensore completo</SelectItem>
                    <SelectItem value="Esterno offensivo">Esterno offensivo</SelectItem>
                    <SelectItem value="Centrocampista tuttofare">Centrocampista tuttofare</SelectItem>
                    <SelectItem value="Centrocampista difensivo">Centrocampista difensivo</SelectItem>
                    <SelectItem value="Centrocampista offensivo">Centrocampista offensivo</SelectItem>
                    <SelectItem value="Fantasista">Fantasista</SelectItem>
                    <SelectItem value="Seconda punta">Seconda punta</SelectItem>
                    <SelectItem value="Falso 9">Falso 9</SelectItem>
                    <SelectItem value="Finalizzatore">Finalizzatore</SelectItem>
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
            { key: 'for' as const, label: 'FOR (Forza)', description: 'Forza fisica e contrasti' }
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
                    min={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Scarso (10)</span>
                    <span>Medio (50)</span>
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
                    min={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Scarso (10)</span>
                    <span>Medio (50)</span>
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

              {activeTab === 'stelle' ? (
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
                              Hai ancora {getDefaultValuesCount()} attributi con valore minimo (10).
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
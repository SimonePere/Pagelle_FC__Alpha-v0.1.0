/**
 * 🗳️ VOTE CARD - Componente Card Isolato per Votazioni
 * 
 * Basato sul design perfetto di MatchCard da MatchGrid.tsx
 * Riutilizzabile, flessibile e pronto per future features
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Calendar,
  Users,
  Vote as VotingIcon,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// 🎯 Props Interface per massima flessibilità
interface VoteCardProps {
  // 📊 Dati base della partita (identici a MatchCard)
  match: {
    id: string;
    date: string;
    status: 'completed' | 'active' | 'draft';
    playersCount?: number;      // 🏟️ Tipo di campo (5, 8, 11)
    teamMemberIds?: string[];
  };

  // 🗳️ Props specifiche per votazioni  
  voting?: {
    isVotable?: boolean;        // Se la card è votabile
    hasVoted?: boolean;         // Se l'utente ha già votato
    votingDeadline?: string;    // Scadenza votazione
    votingProgress?: number;    // % di voti ricevuti (0-100)
  };

  // 🎨 Personalizzazione UI
  index?: number;              // Per animazioni staggered
  showVoteButton?: boolean;    // Mostra pulsante dedicato (CONSIGLIATO!)

  // 🎯 Eventi
  onClick?: (match: any) => void;        // Click su tutta la card
  onVoteClick?: (match: any) => void;    // Click specifico su "Vota"

  // 🎭 Future features (commentate)
  // showConfetti?: boolean;     // 🎊 Animazioni di successo
  // customBadges?: Badge[];     // 🏷️ Badge personalizzati
  // showProgress?: boolean;     // 📊 Progress bar votazioni
}

export const VoteCard: React.FC<VoteCardProps> = ({
  match,
  voting = {},
  index = 0,
  showVoteButton = true,    // 🎯 MODALITÀ PREFERITA: Pulsante dedicato di default!
  onClick,
  onVoteClick
}) => {
  // 🛡️ Controllo di sicurezza per l'oggetto match (identico a MatchCard)
  if (!match) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card p-4">
        <CardContent>
          <p className="text-muted-foreground">Dati partita non disponibili</p>
        </CardContent>
      </Card>
    );
  }

  // 📅 Formatta la data completa con controlli di sicurezza (identico a MatchCard)
  const getFormattedDate = (date: string) => {
    try {
      if (!date) return 'Data non disponibile';
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Data non valida';
      return format(dateObj, 'dd MMMM yyyy', { locale: it });
    } catch (error) {
      console.error('Errore formattazione data:', error, 'Data:', date);
      return 'Errore data';
    }
  };

  // ✅ Tipo di campo dal backend (playersCount) vs partecipanti effettivi (teamMemberIds.length)
  const getMatchType = () => {
    // Usa playersCount dal backend per il tipo di campo
    const fieldType = match.playersCount || 8;
    return `⚽ Calcio a ${fieldType}`;
  };

  // 🎨 Colori stati (identico a MatchCard)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-green-50';
      case 'active':
        return 'bg-blue-500 text-blue-50';
      case 'draft':
        return 'bg-orange-500 text-orange-50';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // 📝 Labels stati (identico a MatchCard)
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completata';
      case 'active': return 'In Corso';
      case 'draft': return 'Creata';
      default: return status;
    }
  };

  // 🗳️ Badge per stato votazione
  const getVotingBadge = () => {
    if (!voting.isVotable) return null;

    if (voting.hasVoted) {
      return (
        <Badge className="bg-green-500 text-green-50">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Votato
        </Badge>
      );
    }

    return (
      <Badge className="bg-orange-500 text-orange-50">
        Pendente
      </Badge>
    );
  };

  // 🎯 Handler per click (ottimizzato per modalità pulsante dedicato)
  const handleCardClick = () => {
    if (!showVoteButton && onVoteClick && voting.isVotable && !voting.hasVoted) {
      // Modalità legacy: click card = voto (se showVoteButton=false)
      onVoteClick(match);
    } else if (onClick) {
      // Modalità preferita: click card = info/navigazione
      onClick(match);
    }
  };

  const handleVoteButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita bubble su card click
    if (onVoteClick) {
      onVoteClick(match);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`group ${onClick || (onVoteClick && voting.isVotable && !voting.hasVoted) ? 'cursor-pointer' : ''}`}
    >
      <Card
        className="bg-card/80 backdrop-blur-sm border-border shadow-card transition-all duration-300 relative"
        onClick={handleCardClick}
      >
        {/* Numero nell'angolino sinistro */}
        <span className="absolute top-3 left-3 text-xs font-mono bg-secondary/40 px-2 py-1 rounded text-muted-foreground z-10">
          #{index + 1}
        </span>

        <CardHeader className="pb-3 pt-12">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1 pr-4">
              <CardTitle className="font-display text-2xl flex items-center gap-3">
                {getMatchType()}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{getFormattedDate(match.date)}</span>
              </div>
            </div>
            <div className="space-y-2 text-right">
              <div className="flex flex-col gap-2">
                <Badge className={getStatusColor(match.status)}>
                  {getStatusLabel(match.status)}
                </Badge>
                {getVotingBadge()}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {match.teamMemberIds?.length || 0} partecipanti
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 🗳️ Sezione Votazione (se votabile) */}
          {voting.isVotable && (
            <div className="space-y-3">
              {/* Progress votazione - sempre visibile per mostrare la feature */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso voti</span>
                  <span>{Math.min(Math.round(voting.votingProgress || 0), 100)}%</span>
                </div>
                <div className="w-full bg-secondary/40 rounded-full h-2 border border-secondary/20 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(Math.round(voting.votingProgress || 0), 100)}%` }}
                  />
                </div>
              </div>

              {/* Deadline votazione (se disponibile) */}
              {voting.votingDeadline && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Scadenza: {getFormattedDate(voting.votingDeadline)}</span>
                </div>
              )}

              {/* Pulsante Vota dedicato (se richiesto) */}
              {showVoteButton && voting.isVotable && !voting.hasVoted && onVoteClick && (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={handleVoteButtonClick}
                >
                  <VotingIcon className="w-4 h-4 mr-2" />
                  Vota Ora
                </Button>
              )}
            </div>
          )}

          {/* 🎊 FUTURE: Spazio per animazioni di successo quando si vota */}
          {/* 
          {showConfetti && voting.hasVoted && (
            <div className="absolute inset-0 pointer-events-none">
              <Confetti />
            </div>
          )}
          */}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VoteCard;
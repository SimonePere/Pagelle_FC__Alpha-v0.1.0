/**
 * 🧪 TEST VOTE CARD - Pagina di Test per VoteCard
 * 
 * Testa entrambe le modalità di interazione:
 * 1. Click su tutta la card per votare
 * 2. Pulsante dedicato "Vota Ora"
 */

import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';

// 🚀 Log per verificare lazy loading
import {
  Vote as VoteIcon,
  CheckCircle2,
  ArrowLeft,
  TestTube2
} from 'lucide-react';
import { VoteCard } from '../components/VoteCard';
import { PlayerCardRatingVote } from '@/components/voting/PlayerCardRatingVote';

const TestVote: React.FC = () => {
  // Stati per simulare votazioni
  const [hasVoted1, setHasVoted1] = useState(false);
  const [hasVoted2, setHasVoted2] = useState(false);
  const [progress1, setProgress1] = useState(75);
  const [progress2, setProgress2] = useState(45);

  const handleVote1 = (match: any) => {
    setHasVoted1(true);
    setProgress1(85);
    alert(`🗳️ Voto registrato per partita: ${match.id}\n✅ Modalità: Click su Card`);
  };

  const handleVote2 = (match: any) => {
    setHasVoted2(true);
    setProgress2(60);
    alert(`🗳️ Voto registrato per partita: ${match.id}\n✅ Modalità: Pulsante Dedicato`);
  };

  const handleInfo = (match: any) => {
    alert(`ℹ️ Info partita: ${match.id}\n📊 Status: ${match.status}\n⚽ Giocatori: ${match.teamMemberIds?.length}`);
  };

  const resetVotes = () => {
    setHasVoted1(false);
    setHasVoted2(false);
    setProgress1(75);
    setProgress2(45);
  };

  return (
    <DashboardLayout>
      <div className="mobile-page-container lg:space-y-6 space-y-6">
        <PlayerCardRatingVote sessionId='69405c27f1f97a3a0e2891d9' />
      </div>
    </DashboardLayout>
  );
};

// 📊 Mock Data per Test
const mockMatch1 = {
  id: 'test-match-1',
  date: '2025-12-10T18:00:00Z',
  status: 'completed' as const,
  teamMemberIds: ['1', '2', '3', '4', '5', '6', '7', '8']
};

const mockMatch2 = {
  id: 'test-match-2',
  date: '2025-12-08T20:30:00Z',
  status: 'active' as const,
  teamMemberIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
};

export default TestVote;
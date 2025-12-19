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
console.log('📦 TestVote component loaded via lazy import!');
import {
  Vote as VoteIcon,
  CheckCircle2,
  ArrowLeft,
  TestTube2
} from 'lucide-react';
import { VoteCard } from '../components/VoteCard';

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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-hero rounded-lg border border-border/50 p-6 shadow-card"
        >
          <div className="text-center space-y-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
              <TestTube2 className="w-8 h-8 text-primary" />
              Test VoteCard
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Testa entrambe le modalità di interazione con la VoteCard
            </p>
          </div>
        </motion.div>

        {/* Dashboard Stats - Test */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">2</div>
            <div className="text-xs text-muted-foreground">Test Cards</div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{(hasVoted1 ? 1 : 0) + (hasVoted2 ? 1 : 0)}</div>
            <div className="text-xs text-muted-foreground">Voted</div>
          </div>
          <div className="text-center p-3 bg-orange-500/10 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{2 - ((hasVoted1 ? 1 : 0) + (hasVoted2 ? 1 : 0))}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{Math.round(((hasVoted1 ? 1 : 0) + (hasVoted2 ? 1 : 0)) / 2 * 100)}</div>
            <div className="text-xs text-muted-foreground">% Complete</div>
          </div>
        </div>

        {/* Controlli Test */}
        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Test Status:</span>
            {hasVoted1 && hasVoted2 ? (
              <Badge className="bg-green-500 text-green-50">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completato
              </Badge>
            ) : (
              <Badge className="bg-orange-500 text-orange-50">
                In Corso
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetVotes}
            disabled={!hasVoted1 && !hasVoted2}
          >
            🔄 Reset Voti
          </Button>
        </div>

        {/* Test VoteCard - Due modalità */}
        <Tabs defaultValue="click-card" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="click-card">
              Click su Card
            </TabsTrigger>
            <TabsTrigger value="button">
              Pulsante Dedicato
            </TabsTrigger>
          </TabsList>

          {/* Modalità 1: Click su tutta la card */}
          <TabsContent value="click-card" className="space-y-4">
            <Alert className="border-blue-500/20 bg-blue-500/10">
              <VoteIcon className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-600">🎯 Modalità: Click su Card</AlertTitle>
              <AlertDescription className="text-blue-700">
                <strong>Come funziona:</strong> Clicca ovunque sulla card per votare. Semplice e intuitivo.
                <br />
                <strong>Risultato:</strong> {hasVoted1 ? '✅ Hai votato!' : '⏳ Clicca per votare'}
              </AlertDescription>
            </Alert>

            <VoteCard
              match={mockMatch1}
              voting={{
                isVotable: true,
                hasVoted: hasVoted1,
                votingDeadline: '2025-12-15T23:59:59Z',
                votingProgress: progress1
              }}
              index={0}
              showVoteButton={false}
              onVoteClick={handleVote1}
            />
          </TabsContent>

          {/* Modalità 2: Pulsante dedicato */}
          <TabsContent value="button" className="space-y-4">
            <Alert className="border-green-500/20 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">🎯 Modalità: Pulsante Dedicato</AlertTitle>
              <AlertDescription className="text-green-700">
                <strong>Come funziona:</strong> Click su card = mostra info | Pulsante "Vota Ora" = vota
                <br />
                <strong>Risultato:</strong> {hasVoted2 ? '✅ Hai votato!' : '⏳ Clicca pulsante per votare'}
              </AlertDescription>
            </Alert>

            <VoteCard
              match={mockMatch2}
              voting={{
                isVotable: true,
                hasVoted: hasVoted2,
                votingDeadline: '2025-12-20T23:59:59Z',
                votingProgress: progress2
              }}
              index={1}
              showVoteButton={true}
              onClick={handleInfo}
              onVoteClick={handleVote2}
            />
          </TabsContent>
        </Tabs>

        {/* Note Tecniche */}
        <Alert className="border-purple-500/20 bg-purple-500/10">
          <ArrowLeft className="h-4 w-4 text-purple-600" />
          <AlertTitle className="text-purple-600">💡 Note Tecniche</AlertTitle>
          <AlertDescription className="text-purple-700">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Design:</strong> Identico a MatchCard per consistenza visiva</li>
              <li><strong>Props flessibili:</strong> Supporta entrambe le modalità di interazione</li>
              <li><strong>Stato dinamico:</strong> Progress bar e badge si aggiornano in real-time</li>
              <li><strong>Future-ready:</strong> Preparato per animazioni e features avanzate</li>
            </ul>
          </AlertDescription>
        </Alert>
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
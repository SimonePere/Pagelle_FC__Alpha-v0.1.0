/**
 * 🔗 useEnrichedMatches - Combina Match + VotingSession data
 * 
 * Hook che arricchisce i matches con dati delle voting sessions:
 * - abstainedUsers: utenti astenuti dal voto
 * - abstainedNames: nomi degli utenti astenuti
 * - hasAbstained: flag boolean per UI
 * 
 * BACKWARD COMPATIBLE: Se sessions non sono disponibili, ritorna matches originali
 */

import { useMemo } from 'react';
import useAppData from './useAppData';

interface EnrichedMatch {
    // Tutti i campi originali del match
    id: string;
    date: string;
    field?: string;
    status: string;
    playersCount?: number;
    teamMemberIds?: string[];
    notes?: string;
    [key: string]: any; // Per compatibilità con campi aggiuntivi

    // 🆕 Campi arricchiti (opzionali per backward compatibility)
    votingSession?: {
        id: string;
        abstainedUsers?: Array<{
            userId: string;
            abstainedBy: string;
            abstainedAt?: string;
        }>;
        [key: string]: any;
    };
    abstainedUsers?: Array<{
        userId: string;
        abstainedBy: string;
        abstainedAt?: string;
    }>;
    abstainedNames?: string[];
    hasAbstained?: boolean;
}

interface UseEnrichedMatchesReturn {
    matches: EnrichedMatch[];
    isLoading: {
        matches: boolean;
        users: boolean;
        playerCards: boolean;
        sessions: boolean;
        any: boolean;
        all: boolean;
    };
    error: {
        matches: string | null;
        users: string | null;
        playerCards: string | null;
        sessions: string | null;
        any: boolean;
    };
    refreshData: () => void;
}

export const useEnrichedMatches = (): UseEnrichedMatchesReturn => {
    const { matches, sessions, users, isLoading, error, refreshData } = useAppData();

    const enrichedMatches = useMemo(() => {
        // 🛡️ SAFE FALLBACKS: Se non abbiamo dati, ritorna matches originali
        if (!matches?.length) {
            return matches || [];
        }

        // Se sessions o users non sono ancora caricati, ritorna matches originali
        // Questo evita flash di contenuto durante il loading
        if (isLoading.sessions || isLoading.users || !sessions || !users) {
            return matches;
        }

        // 🔗 ENRICHMENT: Combina match con voting session data
        return matches.map(match => {
            try {
                // Trova la voting session correlata tramite targetId
                const votingSession = sessions.find(session =>
                    session.targetId === match.id
                );

                // Se non c'è voting session o non ci sono astenuti, ritorna match originale
                if (!votingSession || !votingSession.abstainedUsers?.length) {
                    return {
                        ...match,
                        hasAbstained: false,
                        abstainedNames: [],
                        abstainedUsers: []
                    };
                }



                // 🔍 RISOLVI NOMI: Usa match.teamMembers invece di users globali
                const abstainedNames = votingSession.abstainedUsers.map(abstained => {
                    // Prima prova con teamMembers del match (più accurato)
                    const teamMember = match.teamMembers?.find(m => m.id === abstained.userId);
                    if (teamMember?.name) {
                        return teamMember.name;
                    }

                    // Fallback a users globali
                    const user = users.find(u => u.id === abstained.userId);
                    return user?.name || 'Utente sconosciuto';
                }).filter(Boolean); // Rimuovi valori falsy

                // 🎯 MATCH ARRICCHITO
                return {
                    ...match,
                    // Dati voting session completi
                    votingSession,
                    // Array astenuti originale
                    abstainedUsers: votingSession.abstainedUsers,
                    // Nomi risolti per UI
                    abstainedNames,
                    // Flag boolean per controlli UI rapidi
                    hasAbstained: abstainedNames.length > 0
                } as EnrichedMatch;

            } catch (error) {
                // 🛡️ ERROR RECOVERY: In caso di errore, ritorna match originale
                console.warn('⚠️ Errore arricchimento match:', match.id, error);
                return {
                    ...match,
                    hasAbstained: false,
                    abstainedNames: [],
                    abstainedUsers: []
                };
            }
        });
    }, [matches, sessions, users, isLoading.sessions, isLoading.users]);

    return {
        matches: enrichedMatches,
        isLoading,
        error,
        refreshData
    };
};

export default useEnrichedMatches;
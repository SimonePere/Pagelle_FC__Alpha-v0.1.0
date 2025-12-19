import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ProtectedRouteRedux } from "./components/ProtectedRouteRedux";
import Home from "./pages/Home";
import Login from "./pages/Login";
import VotePage from "./pages/Vote.tsx";

import MatchDetails from "./pages/MatchDetails";
import NotFound from "./pages/NotFound";

// 🚀 STEP 1: Code splitting per pagine meno critiche
const TestVote = lazy(() => import("./pages/TestVote.tsx"));

// 🚀 STEP 2: Code splitting per pagine medie
const Profile = lazy(() => import("./pages/Profile"));
const Stats = lazy(() => import("./pages/Stats"));
const CreateMatch = lazy(() => import("./pages/CreateMatch"));

// 🚀 STEP 3: Code splitting per pagine principali
const History = lazy(() => import("./pages/History"));
const PlayerCards = lazy(() => import("./pages/PlayerCards"));

// ⚡ Loading skeleton component
const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-slate-300 text-lg">🚀 Code Splitting attivo - Caricamento...</p>
      </div>
    </div>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Route pubbliche */}
          <Route path="/login" element={<Login />} />

          {/* Route protette con Redux */}
          <Route path="/" element={<ProtectedRouteRedux><Home /></ProtectedRouteRedux>} />
          <Route
            path="/create-match"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux>
                  <CreateMatch />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />
          <Route path="/vote" element={<ProtectedRouteRedux><VotePage /></ProtectedRouteRedux>} />
          <Route path="/match/:matchId" element={<ProtectedRouteRedux><MatchDetails /></ProtectedRouteRedux>} />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux>
                  <Profile />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />
          <Route
            path="/history"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux>
                  <History />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />
          <Route
            path="/stats"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux>
                  <Stats />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />
          <Route
            path="/player-cards"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux>
                  <PlayerCards />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />

          <Route
            path="/test"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux>
                  <TestVote />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

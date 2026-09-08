import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ProtectedRouteRedux } from "./components/ProtectedRouteRedux";
import AwardRevealManager from "@/components/AwardRevealManager";
import { Skeleton } from "@/components/ui/skeleton";
import Home from "./pages/Home";
import Login from "./pages/Login";
import VotePage from "./pages/Vote.tsx";
import MatchDetails from "./pages/MatchDetails";
import NotFound from "./pages/NotFound";
import TeamPage from "./pages/Team.tsx";
import GodDashboard from "./pages/GodDashboard.tsx";
import JoinByInvite from "./pages/JoinByInvite";

// 🚀 STEP 1: Code splitting per pagine meno critiche
const TestVote = lazy(() => import("./pages/TestPage.tsx")); // Pagina di test con mock, non critica per il primo accesso
// const TestAwards = lazy(() => import("./pages/TestAwards.tsx")); // [DISABILITATA] Anteprima componenti Pagelle FC Awards — sostituita dalla pagina /awards in produzione
const Awards = lazy(() => import("./pages/Awards.tsx")); // Bacheca Awards del team attivo (protetta)
const RenderCard = lazy(() => import("./pages/RenderCard.tsx")); // Pagina render-only per Puppeteer (server screenshot)
const PublicCard = lazy(() => import("./pages/PublicCard.tsx"));
const Demo = lazy(() => import("./pages/Demo.tsx")); // Ingresso pubblico alla modalità demo (no auth) // Pagina pubblica /c/:cardId (no auth, target di QR/share)

// 🚀 STEP 2: Code splitting per pagine medie
const Profile = lazy(() => import("./pages/Profile"));
const Stats = lazy(() => import("./pages/Stats"));
const CreateMatch = lazy(() => import("./pages/CreateMatch"));
const PromoteGuest = lazy(() => import("./pages/PromoteGuest"));

// 🚀 STEP 3: Code splitting per pagine principali
const History = lazy(() => import("./pages/History"));
const PlayerCards = lazy(() => import("./pages/PlayerCards"));

// Pagine legali (pubbliche)
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));

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

const HistoryPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border-border shadow-card p-8">
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-5 w-full max-w-md" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`history-route-skeleton-${idx}`} className="bg-card/80 backdrop-blur-sm border border-border shadow-card rounded-lg p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <Skeleton className="h-7 w-44" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlayerCardsPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border-border shadow-card p-8">
            <div className="space-y-4">
              <Skeleton className="h-10 w-52" />
              <Skeleton className="h-5 w-full max-w-lg" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card/80 backdrop-blur-sm border border-border shadow-card rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-8 w-44" />
                  <Skeleton className="h-5 w-64" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-12 w-20" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <Skeleton key={`player-cards-attr-skeleton-${idx}`} className="h-4 w-full" />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfilePageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="pb-4 lg:pb-8">
        <div className="p-4 pt-2 lg:p-8 space-y-5 lg:space-y-8 max-w-7xl mx-auto">
          <div className="bg-card/80 backdrop-blur-sm border border-border shadow-card rounded-lg p-6 space-y-5">
            <div className="flex items-start gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-3 flex-1">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={`profile-stat-skeleton-${idx}`} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-sm border border-border shadow-card rounded-lg p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-16" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 10 }).map((_, idx) => (
                <Skeleton key={`profile-navigator-skeleton-${idx}`} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
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
          {/* 🎬 Ingresso pubblico alla demo — URL condivisibile su social e QR */}
          <Route path="/demo" element={<Suspense fallback={<PageSkeleton />}><Demo /></Suspense>} />
          <Route path="/join" element={<JoinByInvite />} />
          <Route path="/privacy" element={<Suspense fallback={<PageSkeleton />}><Privacy /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<PageSkeleton />}><Terms /></Suspense>} />
          <Route path="/cookie-policy" element={<Suspense fallback={<PageSkeleton />}><CookiePolicy /></Suspense>} />

          {/* Route pubblica per registrazione guest (accessibile anche da loggati-guest) */}
          <Route path="/promote-guest" element={<Suspense fallback={<PageSkeleton />}><PromoteGuest /></Suspense>} />

          {/* [DISABILITATA] Anteprima Pagelle FC Awards — sostituita da /awards (pagina dedicata in produzione) */}
          {/* <Route path="/test-awards" element={<Suspense fallback={<PageSkeleton />}><TestAwards /></Suspense>} /> */}

          {/* Render-only per Puppeteer screenshot (NO chrome, NO auth) — consumata dal backend */}
          <Route path="/render-card" element={<Suspense fallback={null}><RenderCard /></Suspense>} />

          {/* Pagina pubblica card (target di QR + link condivisi) — NO auth */}
          <Route path="/c/:cardId" element={<Suspense fallback={<PageSkeleton />}><PublicCard /></Suspense>} />

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
            path="/awards"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux>
                  <Awards />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<ProfilePageSkeleton />}>
                <ProtectedRouteRedux>
                  <Profile />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />
          <Route
            path="/history"
            element={
              <Suspense fallback={<HistoryPageSkeleton />}>
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
              <Suspense fallback={<PlayerCardsPageSkeleton />}>
                <ProtectedRouteRedux>
                  <PlayerCards />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />
          <Route
            path="/team"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux>
                  <TeamPage />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />

          {/* <Route
            path="/test"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux>
                  <TestVote />
                </ProtectedRouteRedux>
              </Suspense>
            }
          /> */}
          {/* Successivamente andrà messa ad accesso riservato e 
          VISIBILE SOLAMENTE A ME. CREATORE APP */}
          <Route
            path="/god-dashboard"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProtectedRouteRedux blockDemo>
                  <GodDashboard />
                </ProtectedRouteRedux>
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* Overlay cerimoniale per nuovi trofei (mount globale, gestisce da sé visibilità) */}
        <AwardRevealManager />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

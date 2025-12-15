import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRouteRedux } from "./components/ProtectedRouteRedux";
import { Provider as ReduxProvider } from 'react-redux';
import store from './redux/store/store';
import Home from "./pages/Home";
import Login from "./pages/Login";
import CreateMatch from "./pages/CreateMatch";
import VotePage from "./pages/Vote.tsx";
import Profile from "./pages/Profile";
import History from "./pages/History";
import Stats from "./pages/Stats";
import PlayerCards from "./pages/PlayerCards";

import MatchDetails from "./pages/MatchDetails";
import NotFound from "./pages/NotFound";
import TestVote from "./pages/TestVote.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ReduxProvider store={store}>
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
            <Route path="/create-match" element={<ProtectedRouteRedux><CreateMatch /></ProtectedRouteRedux>} />
            <Route path="/vote" element={<ProtectedRouteRedux><VotePage /></ProtectedRouteRedux>} />
            <Route path="/match/:matchId" element={<ProtectedRouteRedux><MatchDetails /></ProtectedRouteRedux>} />
            <Route path="/profile" element={<ProtectedRouteRedux><Profile /></ProtectedRouteRedux>} />
            <Route path="/history" element={<ProtectedRouteRedux><History /></ProtectedRouteRedux>} />
            <Route path="/stats" element={<ProtectedRouteRedux><Stats /></ProtectedRouteRedux>} />
            <Route path="/player-cards" element={<ProtectedRouteRedux><PlayerCards /></ProtectedRouteRedux>} />

            <Route path="/test" element={<ProtectedRouteRedux><TestVote /></ProtectedRouteRedux>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ReduxProvider>
);

export default App;

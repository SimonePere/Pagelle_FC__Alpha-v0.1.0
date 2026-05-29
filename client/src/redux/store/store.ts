import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSlice";
import teamReducer from "../slices/teamSlice";
import matchReducer from "../slices/matchSlice";
import votingReducer from "../slices/votingSlice";
import usersReducer from "../slices/usersSlice";
import playerCardsReducer from "../slices/playerCardsSlice";
import newsReducer from "../slices/newsSlice";
import awardsReducer from "../slices/awardsSlice";



const store = configureStore({
    reducer: {
        auth: authReducer,                      // Autenticazione
        teams: teamReducer,                     // Gestione team
        matches: matchReducer,                  // Gestione partite
        voting: votingReducer,                  // Sistema votazione
        users: usersReducer,                    // Gestione utenti
        playerCards: playerCardsReducer,        // Gestione giocatori
        news: newsReducer,                      // Gestione notizie
        awards: awardsReducer                   // Pagelle FC Awards
    },
    // Vite espone l'env via `import.meta.env` (no `process` nel browser).
    // `import.meta.env.PROD` è true in build di produzione, false in dev.
    devTools: !import.meta.env.PROD,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignora questi action types per i Date objects
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        }),
});

// Store configurato

// Esporta i tipi per TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Esporta lo store per utilizzarlo nell'app
export default store;
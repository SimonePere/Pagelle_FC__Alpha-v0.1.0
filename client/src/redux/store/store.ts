import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSlice";
import teamReducer from "../slices/teamSlice";
import matchReducer from "../slices/matchSlice";
import votingReducer from "../slices/votingSlice";
import usersReducer from "../slices/usersSlice";
import playerCardsReducer from "../slices/playerCardsSlice";


const store = configureStore({
    reducer: {
        auth: authReducer,                      // Autenticazione
        teams: teamReducer,                     // Gestione team
        matches: matchReducer,                  // Gestione partite
        voting: votingReducer,                  // 🆕 Sistema votazione
        users: usersReducer,                    // 🆕 Gestione utenti
        playerCards: playerCardsReducer,       // 🆕 Gestione giocatori
    },
    devTools: process.env.NODE_ENV !== 'production',
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
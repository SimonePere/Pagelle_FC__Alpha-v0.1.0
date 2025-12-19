"use client";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { Provider } from "react-redux";
import store from "./redux/store/store";
import { initializeAuth } from "./redux/slices/authSlice.ts";

store.dispatch(initializeAuth());

// 🧪 DEBUG: Esponi store globalmente per testing
if (import.meta.env.DEV) {
  (window as any).store = store;
  (window as any).getAuthState = () => store.getState().auth;
  (window as any).getTeamsState = () => store.getState().teams;
  (window as any).getMatchesState = () => store.getState().matches;
}

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <App />
    </ThemeProvider>
  </Provider>
);

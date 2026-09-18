/**
 * DeepLinkHandler — mount globale (come AwardRevealManager/DemoTour) dentro
 * <BrowserRouter>: intercetta i link Android App Links (https://pagelleclientfc.vercel.app/...)
 * aperti mentre l'app nativa è già avviata e naviga alla rotta corrispondente.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

export default function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener("appUrlOpen", ({ url }) => {
      const u = new URL(url);
      navigate(u.pathname + u.search);
    });

    return () => {
      listener.then((sub) => sub.remove());
    };
  }, [navigate]);

  return null;
}

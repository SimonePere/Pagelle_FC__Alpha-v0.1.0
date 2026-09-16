import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.pagellefc.app',
  appName: 'Pagelle FC',
  webDir: 'dist',
  // NESSUN server.url: serviamo il bundle locale. Il backend è remoto via fetch.
  android: {
    // lascia che il WebView usi https://localhost (default) → secure context,
    // clipboard e altre Web API "secure-only" funzionano.
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
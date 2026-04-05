import { createRoot } from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import { inject } from '@vercel/analytics';
import App from "./App.tsx";
import "./index.css";

// Initialize Vercel Analytics
inject();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

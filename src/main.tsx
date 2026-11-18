import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import { CompanyProvider } from "@/context/CompanyContext";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
      <AuthProvider>
        <CompanyProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CompanyProvider>
      </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => { /* PWA is optional */ }); });
}

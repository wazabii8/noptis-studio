import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registerSW } from "virtual:pwa-register";
import { requestPersistentStorage } from "./lib/persistentStorage";

// Will add a persistent storage request to the browser
void requestPersistentStorage();

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("A new version is available. Reload now?")) {
      void updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App is ready to work offline");
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
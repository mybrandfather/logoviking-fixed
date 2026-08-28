import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.documentElement.classList.add("lv-app-failed");
  throw new Error("LogoViking root element is missing");
}

const prerenderShell = document.getElementById("lv-prerender-shell");
let mountObserver: MutationObserver | undefined;

const markAppReady = () => {
  mountObserver?.disconnect();
  document.documentElement.classList.remove("lv-app-failed");
  document.documentElement.classList.add("lv-app-ready");
};

try {
  if (prerenderShell) {
    mountObserver = new MutationObserver(() => {
      if (!document.getElementById("lv-prerender-shell")) markAppReady();
    });
    mountObserver.observe(rootElement, { childList: true, subtree: true });
  }

  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );

  // Development starts with an empty root, so there is no prerender shell for
  // the observer to detect. Wait one frame before revealing the application.
  if (!prerenderShell) requestAnimationFrame(markAppReady);
} catch (error) {
  mountObserver?.disconnect();
  document.documentElement.classList.add("lv-app-failed");
  throw error;
}

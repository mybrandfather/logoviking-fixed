import { Component, StrictMode, useLayoutEffect, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.documentElement.classList.add("lv-app-failed");
  throw new Error("LogoViking root element is missing");
}

const prerenderMarkup = rootElement.innerHTML;

function AppReady() {
  useLayoutEffect(() => {
    document.documentElement.classList.remove("lv-app-failed");
    document.documentElement.classList.add("lv-app-ready");
  }, []);
  return null;
}

class AppErrorBoundary extends Component<
  { fallbackMarkup: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    document.documentElement.classList.add("lv-app-failed");
    console.error("LogoViking failed to mount", error, info);
  }

  render() {
    if (this.state.failed) {
      return <div dangerouslySetInnerHTML={{ __html: this.props.fallbackMarkup }} />;
    }
    return this.props.children;
  }
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <AppErrorBoundary fallbackMarkup={prerenderMarkup}>
        <BrowserRouter>
          <App />
          <AppReady />
        </BrowserRouter>
      </AppErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  rootElement.innerHTML = prerenderMarkup;
  document.documentElement.classList.add("lv-app-failed");
  throw error;
}

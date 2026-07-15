import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { initializePinyinEngine } from "./lib/pinyin";
import "./styles/global.css";

initializePinyinEngine();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-center" richColors />
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>,
);

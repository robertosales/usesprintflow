(function () {
  try {
    const saved = sessionStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    // CRÍTICO: precisa das duas linhas abaixo
    document.documentElement.classList.remove("dark", "light");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch {}
})();

import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

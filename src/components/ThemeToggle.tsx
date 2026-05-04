import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  try {
    sessionStorage.setItem("theme", theme);
  } catch {}
}

function getInitialTheme(): "light" | "dark" {
  try {
    const saved = sessionStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Lê o que já está no DOM (definido pelo main.tsx antes do React montar)
    const fromDOM = document.documentElement.getAttribute("data-theme");
    if (fromDOM === "light" || fromDOM === "dark") return fromDOM;
    return getInitialTheme();
  });

  // Garante que o DOM está em sincronia ao montar
  useEffect(() => {
    applyTheme(theme);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

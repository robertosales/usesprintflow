import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

function getCurrentTheme(): "light" | "dark" {
  return (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getCurrentTheme);

  // Sincroniza se o atributo mudar externamente
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(getCurrentTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    // Atualiza o DOM
    document.documentElement.setAttribute("data-theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Persiste
    try {
      sessionStorage.setItem("theme", next);
    } catch {}
    // Atualiza estado local (o MutationObserver também faria isso, mas é mais rápido assim)
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

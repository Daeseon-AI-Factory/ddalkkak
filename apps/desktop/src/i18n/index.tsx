//! Tiny typed i18n: a Lang context + `t()` lookup, persisted to localStorage,
//! default English. Deliberately dependency-free and swappable for react-i18next
//! later if the string count grows. Wrap the app once in <LangProvider>; read with
//! useT() anywhere below it.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANG, type Lang, STRINGS, type StringKey } from "./strings";

const LS_KEY = "dalkkak.lang";

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "en" || v === "ko") return v;
  } catch {
    // localStorage may be unavailable in some webview contexts — fall back to default
  }
  return DEFAULT_LANG;
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: StringKey) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(LS_KEY, l);
    } catch {
      // ignore persistence failure; in-memory switch still works
    }
    setLangState(l);
  }, []);

  const t = useCallback((k: StringKey) => STRINGS[lang][k] ?? STRINGS.en[k] ?? k, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useT must be used inside <LangProvider>");
  return ctx;
}

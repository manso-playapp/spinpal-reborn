"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { adminDictionary } from '@/lib/adminI18n';
import { adminLoginDict } from '@/lib/adminI18n.login';

type Lang = 'es' | 'en' | 'pt';

interface AdminI18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tLogin: (key: string) => string;
}

const AdminI18nContext = createContext<AdminI18nContextValue | undefined>(undefined);

const LANG_COOKIE = 'admin_lang';

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
};

const setCookie = (name: string, value: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}`;
};

const interpolate = (template: string, vars?: Record<string, string | number>) => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`).toString());
};

export function AdminI18nProvider({ children, defaultLang = 'es' }: { children: React.ReactNode; defaultLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  useEffect(() => {
    const saved = getCookie(LANG_COOKIE) as Lang;
    if (saved === 'es' || saved === 'en' || saved === 'pt') {
      // Defer state update to avoid synchronous setState warning
      setTimeout(() => setLangState(saved), 0);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    setCookie(LANG_COOKIE, l);
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    const dict = adminDictionary[lang] || adminDictionary.es;
    const value = dict[key] || adminDictionary.es[key] || key;
    return interpolate(value, vars);
  };

  const tLoginFn = (key: string) => {
    const dict = adminLoginDict[lang] || adminLoginDict.es;
    return dict[key] || adminLoginDict.es[key] || key;
  };

  return (
    <AdminI18nContext.Provider value={{ lang, setLang, t, tLogin: tLoginFn }}>
      {children}
    </AdminI18nContext.Provider>
  );
}

export function useAdminI18n() {
  const ctx = useContext(AdminI18nContext);
  if (!ctx) throw new Error('useAdminI18n must be used within AdminI18nProvider');
  return ctx;
}

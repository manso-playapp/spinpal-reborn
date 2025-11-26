'use client';

import { useAdminI18n } from '@/context/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

export function AdminHeaderLang() {
  const { lang, setLang, t } = useAdminI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t('languageLabel')}>
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => setLang('es')} className={lang === 'es' ? 'font-semibold' : ''}>{t('langEs')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLang('en')} className={lang === 'en' ? 'font-semibold' : ''}>{t('langEn')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLang('pt')} className={lang === 'pt' ? 'font-semibold' : ''}>{t('langPt')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

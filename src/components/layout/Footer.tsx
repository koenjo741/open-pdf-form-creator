import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-zinc-800/60 bg-[#020617]/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-zinc-500 text-xs">
        <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
        <span className="font-medium text-emerald-500/80">{t('footer.privacy')}</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-zinc-600">
        <a
          href="https://github.com/koenjo741/open-pdf-form-creator/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-400 transition-colors"
        >
          {t('footer.license')}
        </a>
        <a
          href="https://github.com/koenjo741/open-pdf-form-creator"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-400 transition-colors"
        >
          {t('footer.github')}
        </a>
      </div>
    </footer>
  );
}

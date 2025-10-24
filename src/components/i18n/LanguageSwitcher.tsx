'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    
    // This will replace the current path with the new locale.
    // e.g., /en/about -> /es/about
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    
    // Use startTransition for a smooth, non-blocking transition
    startTransition(() => {
      router.replace(newPath);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <Globe className="h-5 w-5" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onSelect={() => handleLocaleChange('en')}
          disabled={locale === 'en' || isPending}
        >
          English {locale === 'en' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onSelect={() => handleLocaleChange('es')}
          disabled={locale === 'es' || isPending}
        >
          Español {locale === 'es' && '✓'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

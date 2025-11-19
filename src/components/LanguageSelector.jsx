import React from 'react';
import { useLanguage } from './LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function LanguageSelector() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
      aria-label={`Switch to ${language === 'es' ? 'English' : 'Español'}`}
    >
      <Globe className="w-4 h-4" />
      <span className="font-medium">{language === 'es' ? 'EN' : 'ES'}</span>
    </Button>
  );
}
import React from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export default function MobileStickyCTA() {
  const { t, language } = useLanguage();
  const whatsappNumber = "50360531213";
  const whatsappMessage = language === 'es' ?
    "Hola, me interesa conocer más sobre los servicios de PROMAN" :
    "Hello, I'd like to know more about PROMAN services";

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <a 
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank" rel="noopener noreferrer" className="flex-1"
        >
          <Button className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg">WhatsApp</Button>
        </a>
        <a href="tel:+50360531213" className="flex-1">
          <Button variant="outline" className="w-full rounded-full">
            <Phone className="w-4 h-4 mr-1" />
            {t({ es: "Llamar", en: "Call" })}
          </Button>
        </a>
      </div>
    </div>
  );
}
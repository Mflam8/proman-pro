import React from "react";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export default function CTASection() {
  const { t, language } = useLanguage();
  const whatsappNumber = "50360531213";
  const whatsappMessage = language === 'es' 
    ? "Hola PROMAN, necesito agendar un servicio"
    : "Hello PROMAN, I need to schedule a service";

  return (
    <div className="py-20 bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-proman-navy rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 hexagon bg-proman-yellow opacity-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 hexagon bg-white opacity-5"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t({ es: "¿Listo para Resolver tu Problema?", en: "Ready to Solve Your Problem?" })}
            </h2>
            <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto">
              {t({ 
                es: "Contáctanos ahora y recibe atención inmediata de nuestros expertos. Respuesta rápida garantizada.",
                en: "Contact us now and receive immediate attention from our experts. Fast response guaranteed."
              })}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold w-full sm:w-auto">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {t({ es: "Agendar por WhatsApp", en: "Schedule via WhatsApp" })}
                </Button>
              </a>
              <a href="tel:60531213">
                <Button size="lg" variant="outline" className="border-2 border-proman-yellow bg-proman-yellow text-proman-navy hover:bg-proman-yellow/90 font-semibold w-full sm:w-auto">
                  <Phone className="w-5 h-5 mr-2" />
                  +503 6053-1213
                </Button>
              </a>
            </div>

            <p className="text-sm text-gray-300 mt-6">
              {t({ 
                es: "Servicio disponible en San Salvador, La Libertad y Zona Occidental",
                en: "Service available in San Salvador, La Libertad and Western Zone"
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
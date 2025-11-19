import React from "react";
import { CheckCircle, Award, Shield, Users } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export default function TrustIndicators() {
  const { t } = useLanguage();
  const indicators = [
    {
      icon: CheckCircle,
      title: t({ es: "100% Satisfacción", en: "100% Satisfaction" }),
      description: t({ es: "Garantizamos calidad en cada proyecto", en: "We guarantee quality in every project" })
    },
    {
      icon: Award,
      title: t({ es: "Equipos Especializados", en: "Specialized Equipment" }),
      description: t({ es: "Tecnología de punta para mejores resultados", en: "Cutting-edge technology for better results" })
    },
    {
      icon: Shield,
      title: t({ es: "Trabajo Garantizado", en: "Guaranteed Work" }),
      description: t({ es: "Respaldamos cada servicio que realizamos", en: "We back every service we provide" })
    },
    {
      icon: Users,
      title: t({ es: "Equipo Profesional", en: "Professional Team" }),
      description: t({ es: "Técnicos certificados y experimentados", en: "Certified and experienced technicians" })
    }
  ];

  return (
    <div className="py-12 md:py-16 bg-gradient-to-r from-gray-50 via-blue-50/30 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {indicators.map((indicator, index) => (
            <div
              key={index}
              className="text-center p-4 md:p-6 rounded-xl bg-gray-50 hover:bg-proman-navy hover:text-white transition-all duration-300 group"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 hexagon bg-proman-yellow mx-auto mb-3 md:mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                <indicator.icon className="w-6 h-6 sm:w-8 sm:h-8 text-proman-navy" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 md:mb-2">
                {indicator.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 group-hover:text-gray-200">
                {indicator.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
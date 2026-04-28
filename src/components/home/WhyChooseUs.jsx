import React from "react";
import { Shield, Award, Clock, ThumbsUp } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export default function WhyChooseUs() {
  const { t } = useLanguage();
  const reasons = [
    {
      icon: Shield,
      title: t({ es: "Garantía de Calidad", en: "Quality Guarantee" }),
      description: t({ es: "Todos nuestros trabajos incluyen garantía y seguimiento post-servicio", en: "All our work includes warranty and post-service follow-up" })
    },
    {
      icon: Award,
      title: t({ es: "Profesionales Certificados", en: "Certified Professionals" }),
      description: t({ es: "Equipo altamente capacitado con años de experiencia en el sector", en: "Highly trained team with years of experience in the sector" })
    },
    {
      icon: Clock,
      title: t({ es: "Respuesta Rápida", en: "Fast Response" }),
      description: t({ es: "Atendemos emergencias en San Salvador, La Libertad y Zona Occidental.\n*Restricciones aplican", en: "We handle emergencies in San Salvador, La Libertad, and the Western Region.\n*Restrictions apply" })
    },
    {
      icon: ThumbsUp,
      title: t({ es: "Satisfacción Garantizada", en: "Satisfaction Guaranteed" }),
      description: t({ es: "No descansamos hasta que tu problema esté completamente resuelto", en: "We don't rest until your problem is completely solved" })
    }
  ];

  return (
    <div className="py-20 gradient-navy-yellow text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 hexagon bg-proman-yellow opacity-5"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 hexagon bg-white opacity-5"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t({ es: "¿Por Qué Elegir PROMAN?", en: "Why Choose PROMAN?" })}
          </h2>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto">
            {t({ es: "Somos más que una empresa de servicios, somos tu socio de confianza", en: "We are more than a service company, we are your trusted partner" })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {reasons.map((reason, index) => (
            <div key={index} className="text-center group">
              <div className="w-20 h-20 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                <reason.icon className="w-10 h-10 text-proman-navy" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-proman-yellow">{reason.title}</h3>
              <p className="text-gray-200 whitespace-pre-line">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
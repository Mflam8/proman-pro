
import React from "react";
import { Shield, Award, Clock, ThumbsUp } from "lucide-react";

export default function WhyChooseUs() {
  const reasons = [
    {
      icon: Shield,
      title: "Garantía de Calidad",
      description: "Todos nuestros trabajos incluyen garantía y seguimiento post-servicio"
    },
    {
      icon: Award,
      title: "Profesionales Certificados",
      description: "Equipo altamente capacitado con años de experiencia en el sector"
    },
    {
      icon: Clock,
      title: "Respuesta Rápida 24/7",
      description: "Atendemos emergencias las 24 horas en San Salvador y La Libertad"
    },
    {
      icon: ThumbsUp,
      title: "Satisfacción Garantizada",
      description: "No descansamos hasta que tu problema esté completamente resuelto"
    }
  ];

  return (
    <div className="py-20 gradient-navy-yellow text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 hexagon bg-proman-yellow opacity-5"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 hexagon bg-white opacity-5"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Por Qué Elegir PROMAN?
          </h2>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto">
            Somos más que una empresa de servicios, somos tu socio de confianza
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {reasons.map((reason, index) => (
            <div key={index} className="text-center group">
              <div className="w-20 h-20 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                <reason.icon className="w-10 h-10 text-proman-navy" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-proman-yellow">{reason.title}</h3>
              <p className="text-gray-200">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

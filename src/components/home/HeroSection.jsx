import React from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export default function HeroSection() {
  const whatsappNumber = "50360531213";
  const whatsappMessage = "Hola, necesito agendar un servicio con PROMAN";

  return (
    <div className="relative gradient-navy-yellow text-white overflow-hidden">
      {/* Decorative hexagons */}
      <div className="absolute top-10 right-10 w-32 h-32 hexagon bg-proman-yellow opacity-10"></div>
      <div className="absolute bottom-20 left-10 w-24 h-24 hexagon bg-proman-yellow opacity-10"></div>
      <div className="absolute top-1/2 right-1/4 w-16 h-16 hexagon bg-white opacity-5"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-32 relative">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="space-y-6 order-2 md:order-1">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Soluciones Profesionales para tu{" "}
              <span className="text-proman-yellow">Hogar o Negocio</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-200">
              Fontanería, electricidad, remodelaciones y más. Servicio de calidad con garantía en San Salvador, La Libertad y Zona Occidental.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a 
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Agendar servicio por WhatsApp"
              >
                <Button size="lg" className="bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold text-lg w-full sm:w-auto">
                  Agendar Servicio
                </Button>
              </a>
              <a href="tel:+50360531213" aria-label="Llamar a PROMAN al +503 6053-1213">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:!text-proman-navy w-full sm:w-auto">
                  <Phone className="w-5 h-5 mr-2" aria-hidden="true" />
                  <span className="text-xl font-bold">+503 6053-1213</span>
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 pt-6 flex-wrap">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-proman-yellow">300+</div>
                <div className="text-xs sm:text-sm text-gray-300">Clientes Satisfechos</div>
              </div>
              <div className="h-12 w-px bg-gray-400"></div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-proman-yellow">24/7</div>
                <div className="text-xs sm:text-sm text-gray-300">Emergencias</div>
              </div>
              <div className="h-12 w-px bg-gray-400"></div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-proman-yellow">10+</div>
                <div className="text-xs sm:text-sm text-gray-300">Años Experiencia</div>
              </div>
            </div>
          </div>

          <div className="relative order-1 md:order-2">
            <div className="relative z-10">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/97fe4ab81_OrangeandBluePlumbingServicesFacebookPost12.png"
                alt="Técnico profesional de PROMAN Services - Expertos en fontanería, electricidad y construcción"
                width="800"
                height="800"
                loading="eager"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-4 -left-4 bg-proman-yellow text-proman-navy p-4 sm:p-6 rounded-xl shadow-xl">
                <div className="text-2xl sm:text-3xl font-bold">⭐ 4.9/5</div>
                <div className="text-xs sm:text-sm font-medium">Calificación promedio</div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-48 sm:w-64 h-48 sm:h-64 hexagon bg-proman-yellow opacity-20 -z-10"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
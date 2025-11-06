
import React from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompanyShowcase() {
  const whatsappNumber = "50360531213";
  const whatsappMessage = "Hola PROMAN, quiero conocer más sobre sus servicios";

  return (
    <div className="py-12 md:py-20 bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="order-2 md:order-1">
            <div className="relative">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/97fe4ab81_OrangeandBluePlumbingServicesFacebookPost12.png"
                alt="Equipo profesional de PROMAN"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-4 -right-4 w-24 h-24 sm:w-32 sm:h-32 hexagon bg-proman-yellow opacity-20"></div>
            </div>
          </div>

          <div className="space-y-6 order-1 md:order-2">
            <div>
              <span className="inline-block bg-proman-yellow text-proman-navy px-4 py-2 rounded-full text-sm font-semibold mb-4">
                Sobre Nosotros
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-proman-navy mb-4">
                Una Empresa en la que Puedes Confiar
              </h2>
              <p className="text-base md:text-lg text-gray-600 mb-6">
                PROMAN Services es una empresa salvadoreña con más de 10 años de experiencia brindando 
                soluciones profesionales en fontanería, electricidad, remodelaciones y construcción.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                  <span className="text-proman-navy font-bold text-sm">✓</span>
                </div>
                <div>
                  <h3 className="font-bold text-proman-navy mb-1">Equipos Especializados</h3>
                  <p className="text-sm text-gray-600">
                    Trabajamos con tecnología de punta - destapamos tuberías sin romper paredes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                  <span className="text-proman-navy font-bold text-sm">✓</span>
                </div>
                <div>
                  <h3 className="font-bold text-proman-navy mb-1">Personal Capacitado</h3>
                  <p className="text-sm text-gray-600">
                    Nuestro equipo está certificado y cuenta con años de experiencia
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                  <span className="text-proman-navy font-bold text-sm">✓</span>
                </div>
                <div>
                  <h3 className="font-bold text-proman-navy mb-1">Cobertura Total</h3>
                  <p className="text-sm text-gray-600">
                    Atendemos San Salvador y La Libertad con disponibilidad 24/7
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <a 
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold">
                  <Phone className="w-5 h-5 mr-2" />
                  Contáctanos Ahora
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

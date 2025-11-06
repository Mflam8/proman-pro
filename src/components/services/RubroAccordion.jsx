import React from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Home, Building2, UtensilsCrossed, Hospital, AlertCircle } from "lucide-react";
import ServiceCard from "./ServiceCard";

const rubroIcons = {
  "Hogar": Home,
  "Comercial": Building2,
  "Restaurantes": UtensilsCrossed,
  "Hospitales": Hospital,
  "Emergencias": AlertCircle
};

const rubroDescriptions = {
  "Hogar": "Servicios profesionales para tu casa y familia",
  "Comercial": "Soluciones para oficinas y negocios",
  "Restaurantes": "Servicios especializados para cocinas industriales",
  "Hospitales": "Instalaciones de grado hospitalario",
  "Emergencias": "Disponibles 24/7 para cualquier urgencia"
};

export default function RubroAccordion({ rubro, services, isExpanded, onToggle, whatsappNumber }) {
  const RubroIcon = rubroIcons[rubro];

  if (services.length === 0) return null;

  return (
    <Card className="border-2 border-gray-200 hover:border-proman-yellow transition-all overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
            {RubroIcon && <RubroIcon className="w-7 h-7 text-proman-navy" />}
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-proman-navy mb-1">
              {rubro}
            </h2>
            <p className="text-sm text-gray-600 hidden sm:block">
              {rubroDescriptions[rubro]}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {services.length} {services.length === 1 ? 'servicio' : 'servicios'} disponibles
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-6 h-6 text-proman-navy" />
          ) : (
            <ChevronDown className="w-6 h-6 text-proman-navy" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service) => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                whatsappNumber={whatsappNumber}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
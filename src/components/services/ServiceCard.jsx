import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Droplets, Zap, Hammer, SquareDashedBottom, Construction } from "lucide-react";

const serviceIcons = {
  "Fontanería General": Wrench,
  "Detección de Fugas": Droplets,
  "Servicios Eléctricos": Zap,
  "Remodelación": Hammer,
  "Tablaroca": SquareDashedBottom,
  "Reparación de Techos": Construction
};

export default function ServiceCard({ service, whatsappNumber }) {
  const ServiceIcon = serviceIcons[service.service_name] || Wrench;
  
  const getWhatsAppLink = () => {
    const message = `Hola PROMAN, estoy interesado en el servicio de ${service.service_name} para ${service.rubro}. ¿Podrían darme más información?`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <Card className="border-2 border-gray-100 hover:border-proman-yellow transition-all hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
            <ServiceIcon className="w-6 h-6 text-proman-navy" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-proman-navy mb-2">
              {service.service_name}
            </h3>
          </div>
        </div>

        {service.image_url && (
          <img 
            src={service.image_url} 
            alt={service.service_name}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}

        <p className="text-gray-600 mb-4">
          {service.description}
        </p>

        {service.features && service.features.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-proman-navy mb-2 text-sm">Incluye:</h4>
            <ul className="space-y-1">
              {service.features.map((feature, idx) => (
                <li key={idx} className="flex items-start text-gray-700 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-proman-yellow mr-2 mt-1.5 flex-shrink-0"></span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <a 
          href={getWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button className="w-full bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold">
            Solicitar Servicio
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
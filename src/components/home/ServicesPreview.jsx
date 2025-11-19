import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, Wrench, Zap, Home, Paintbrush, Hammer, Settings } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

const iconMap = {
  Wrench, Zap, Home, Paintbrush, Hammer, Settings
};

export default function ServicesPreview() {
  const { t } = useLanguage();
  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list('-created_date', 6),
    initialData: [],
  });

  return (
    <div className="py-20 bg-gradient-to-b from-white via-blue-50/20 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-proman-navy mb-4">
            {t({ es: "Nuestros Servicios", en: "Our Services" })}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t({ es: "Ofrecemos soluciones integrales para todas tus necesidades de mantenimiento y construcción", en: "We offer comprehensive solutions for all your maintenance and construction needs" })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {services.map((service) => {
            const IconComponent = iconMap[service.icon] || Wrench;
            return (
              <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-proman-yellow">
                <CardContent className="p-6">
                  <div className="w-14 h-14 hexagon bg-proman-yellow flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-7 h-7 text-proman-navy" />
                  </div>
                  <h3 className="text-xl font-bold text-proman-navy mb-2 group-hover:text-proman-yellow transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {service.description}
                  </p>
                  {service.features && service.features.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {service.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-500 flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-proman-yellow mr-2"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Link to={createPageUrl("Services")}>
            <Button size="lg" className="bg-proman-navy text-white hover:bg-opacity-90">
              {t({ es: "Ver Todos los Servicios", en: "View All Services" })}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
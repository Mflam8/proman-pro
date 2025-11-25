import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SEO from "../components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Building2, UtensilsCrossed, Hospital, AlertCircle, Wrench, Zap, Hammer, PaintBucket, Droplets, Settings } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

const iconMap = {
  Wrench, Zap, Home, Paintbrush: PaintBucket, Hammer, Settings, Droplets
};

const getRubros = (t) => [
  {
    nombre: t({ es: "Hogar", en: "Home" }),
    icono: Home,
    descripcion: t({ es: "Servicios profesionales para tu casa y familia", en: "Professional services for your home and family" }),
    color: "bg-blue-100"
  },
  {
    nombre: t({ es: "Comercial", en: "Commercial" }),
    icono: Building2,
    descripcion: t({ es: "Soluciones para oficinas y negocios", en: "Solutions for offices and businesses" }),
    color: "bg-indigo-100"
  },
  {
    nombre: t({ es: "Restaurantes", en: "Restaurants" }),
    icono: UtensilsCrossed,
    descripcion: t({ es: "Servicios especializados para cocinas industriales", en: "Specialized services for industrial kitchens" }),
    color: "bg-orange-100"
  },
  {
    nombre: t({ es: "Hospitales", en: "Hospitals" }),
    icono: Hospital,
    descripcion: t({ es: "Instalaciones de grado hospitalario", en: "Hospital-grade installations" }),
    color: "bg-green-100"
  },
  {
    nombre: t({ es: "Emergencias", en: "Emergencies" }),
    icono: AlertCircle,
    descripcion: t({ es: "Disponibles 24/7 para cualquier urgencia", en: "Available 24/7 for any emergency" }),
    color: "bg-red-100"
  }
];

const getServiciosDetallados = (t) => [
  {
    titulo: t({ es: "Fontanería y Plomería", en: "Plumbing" }),
    icono: Droplets,
    descripcion: t({ es: "Destapado de tuberías sin romper paredes, reparación de fugas, instalación de sistemas sanitarios, mantenimiento preventivo", en: "Pipe unclogging without breaking walls, leak repair, sanitary system installation, preventive maintenance" })
  },
  {
    titulo: t({ es: "Electricidad", en: "Electrical" }),
    icono: Zap,
    descripcion: t({ es: "Instalaciones eléctricas residenciales y comerciales, reparación de circuitos, iluminación LED, tableros eléctricos", en: "Residential and commercial electrical installations, circuit repair, LED lighting, electrical panels" })
  },
  {
    titulo: t({ es: "Construcción", en: "Construction" }),
    icono: Hammer,
    descripcion: t({ es: "Proyectos de construcción desde cero, ampliaciones, estructuras, obras civiles y acabados de calidad", en: "Construction projects from scratch, expansions, structures, civil works and quality finishes" })
  },
  {
    titulo: t({ es: "Remodelación", en: "Remodeling" }),
    icono: Wrench,
    descripcion: t({ es: "Renovación de espacios, modernización de baños y cocinas, acabados interiores y exteriores", en: "Space renovation, bathroom and kitchen modernization, interior and exterior finishes" })
  },
  {
    titulo: t({ es: "Pintura Profesional", en: "Professional Painting" }),
    icono: PaintBucket,
    descripcion: t({ es: "Pintura interior y exterior, impermeabilización, acabados decorativos y protección de superficies", en: "Interior and exterior painting, waterproofing, decorative finishes and surface protection" })
  }
];

export default function Services() {
  const { t } = useLanguage();
  const rubros = getRubros(t);
  const serviciosDetallados = getServiciosDetallados(t);

  const { data: servicesFromDB, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.filter({ is_active: true }),
    initialData: [],
  });

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title={t({ 
          es: "Servicios de Fontanería, Electricidad y Construcción | PROMAN Services",
          en: "Plumbing, Electrical and Construction Services | PROMAN Services"
        })}
        description={t({ 
          es: "Servicios profesionales de fontanería, plomería, electricidad, construcción, remodelación y pintura en El Salvador. Atención 24/7 para emergencias. Destapado de tuberías, instalaciones eléctricas, obras de construcción y más.",
          en: "Professional plumbing, electrical, construction, remodeling and painting services in El Salvador. 24/7 emergency service. Pipe unclogging, electrical installations, construction works and more."
        })}
        keywords={t({ 
          es: "servicios fontanería El Salvador, plomería San Salvador, electricista profesional, construcción y remodelación, destapado tuberías, instalaciones eléctricas, pintura profesional, mantenimiento edificios, reparaciones urgentes, fontanero certificado",
          en: "plumbing services El Salvador, San Salvador plumber, professional electrician, construction and remodeling, pipe unclogging, electrical installations, professional painting, building maintenance, emergency repairs, certified plumber"
        })}
      />
      <div className="gradient-navy-yellow text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t({ es: "Servicios Profesionales en", en: "Professional Services in" })}
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            {t({ es: "San Salvador, La Libertad y Zona Occidental de El Salvador", en: "San Salvador, La Libertad and Western Region of El Salvador" })}
          </p>
          <p className="text-lg text-gray-200 max-w-3xl mx-auto mt-2">
            {t({ es: "Fontanería, Electricidad, Construcción y Remodelaciones con Garantía de Calidad", en: "Plumbing, Electrical, Construction and Remodeling with Quality Guarantee" })}
          </p>
        </div>
      </div>

      {/* Servicios Detallados - Mejor para SEO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-proman-navy mb-4">
            {t({ es: "Especialistas en Soluciones Integrales", en: "Specialists in Comprehensive Solutions" })}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t({ es: "Más de 10 años brindando servicios profesionales de fontanería, electricidad y construcción en El Salvador", en: "Over 10 years providing professional plumbing, electrical and construction services in El Salvador" })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {serviciosDetallados.map((servicio) => {
            const IconoServicio = servicio.icono;
            return (
              <Card 
                key={servicio.titulo} 
                className="border-2 border-gray-200 hover:border-proman-yellow transition-all hover:shadow-xl"
              >
                <CardContent className="p-6">
                  <div className="w-16 h-16 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center">
                    <IconoServicio className="w-8 h-8 text-proman-navy" />
                  </div>
                  <h3 className="text-xl font-bold text-proman-navy mb-3 text-center">
                    {servicio.titulo}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {servicio.descripcion}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Servicios del Catálogo */}
        {servicesFromDB.length > 0 && (
          <div className="border-t pt-16 mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-proman-navy mb-4">
                {t({ es: "Catálogo de Servicios", en: "Service Catalog" })}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t({ es: "Servicios especializados con precios y características detalladas", en: "Specialized services with detailed pricing and features" })}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicesFromDB.map((service) => {
                const IconComponent = iconMap[service.icon] || Wrench;
                return (
                  <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-proman-yellow">
                    <CardContent className="p-6">
                      <div className="w-14 h-14 hexagon bg-proman-yellow flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <IconComponent className="w-7 h-7 text-proman-navy" />
                      </div>
                      <h3 className="text-xl font-bold text-proman-navy mb-2 group-hover:text-proman-yellow transition-colors">
                        {t({ es: service.service_name, en: service.service_name_en || service.service_name })}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        {t({ es: service.description, en: service.description_en || service.description })}
                      </p>
                      {service.features && service.features.length > 0 && (
                        <ul className="space-y-1 mb-4">
                          {service.features.slice(0, 4).map((feature, idx) => {
                            const featureEn = service.features_en?.[idx];
                            return (
                              <li key={idx} className="text-sm text-gray-500 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-proman-yellow mr-2"></span>
                                {t({ es: feature, en: featureEn || feature })}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {service.base_price && (
                        <div className="pt-3 border-t">
                          <span className="text-sm text-gray-500">{t({ es: "Desde", en: "From" })}</span>
                          <span className="text-xl font-bold text-proman-navy ml-2">${service.base_price}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Rubros por Sector */}
        <div className="border-t pt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-proman-navy mb-4">
              {t({ es: "Servicios por Sector", en: "Services by Sector" })}
            </h2>
            <p className="text-lg text-gray-600">
              {t({ es: "Soluciones personalizadas para cada tipo de cliente", en: "Customized solutions for each type of client" })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rubros.map((rubro) => {
              const IconoRubro = rubro.icono;
              return (
                <Card 
                  key={rubro.nombre} 
                  className="border-2 border-gray-200 hover:border-proman-yellow transition-all hover:shadow-lg cursor-pointer"
                >
                  <CardContent className="p-8 text-center">
                    <div className={`w-20 h-20 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center`}>
                      <IconoRubro className="w-10 h-10 text-proman-navy" />
                    </div>
                    <h3 className="text-2xl font-bold text-proman-navy mb-3">
                      {rubro.nombre}
                    </h3>
                    <p className="text-gray-600">
                      {rubro.descripcion}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* SEO Content Section */}
        <div className="mt-16 bg-gray-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-proman-navy mb-4">
            {t({ es: "¿Por qué elegir PROMAN Services?", en: "Why choose PROMAN Services?" })}
          </h2>
          <div className="prose prose-lg text-gray-600 max-w-none">
            <p className="mb-4">
              {t({ 
                es: "Somos una empresa salvadoreña con más de 10 años de experiencia en el mercado, especializada en ", 
                en: "We are a Salvadoran company with over 10 years of market experience, specialized in " 
              })}
              <strong>{t({ es: "servicios de fontanería", en: "plumbing services" })}</strong>, <strong>{t({ es: "plomería", en: "plumbing" })}</strong>, 
              <strong>{t({ es: "electricidad", en: "electrical" })}</strong>, <strong>{t({ es: "construcción", en: "construction" })}</strong> {t({ es: "y", en: "and" })} <strong>{t({ es: "remodelaciones", en: "remodeling" })}</strong>.
            </p>
            <p className="mb-4">
              {t({ 
                es: "Nuestro equipo de técnicos certificados utiliza tecnología de punta para el ", 
                en: "Our team of certified technicians uses cutting-edge technology for " 
              })}
              <strong>{t({ es: "destapado de tuberías sin romper paredes", en: "pipe unclogging without breaking walls" })}</strong>, {t({ es: "ahorrándole tiempo y dinero. Realizamos", en: "saving you time and money. We perform" })} <strong>{t({ es: "instalaciones eléctricas", en: "electrical installations" })}</strong> {t({ es: "residenciales y comerciales cumpliendo con todas las normas de seguridad", en: "residential and commercial complying with all safety standards" })}.
            </p>
            <p>
              {t({ es: "Atendemos", en: "We handle" })} <strong>{t({ es: "emergencias 24/7", en: "24/7 emergencies" })}</strong> {t({ es: "en San Salvador, La Libertad y zona occidental de El Salvador", en: "in San Salvador, La Libertad and western region of El Salvador" })}.{" "}
              {t({ es: "Contáctenos al", en: "Contact us at" })} <strong>6053-1213</strong> {t({ es: "para una cotización sin compromiso", en: "for a free quote" })}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
import React from "react";
import SEO from "../components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Building2, UtensilsCrossed, Hospital, AlertCircle, Wrench, Zap, Hammer, PaintBucket, Droplets } from "lucide-react";

const rubros = [
  {
    nombre: "Hogar",
    icono: Home,
    descripcion: "Servicios profesionales para tu casa y familia",
    color: "bg-blue-100"
  },
  {
    nombre: "Comercial",
    icono: Building2,
    descripcion: "Soluciones para oficinas y negocios",
    color: "bg-indigo-100"
  },
  {
    nombre: "Restaurantes",
    icono: UtensilsCrossed,
    descripcion: "Servicios especializados para cocinas industriales",
    color: "bg-orange-100"
  },
  {
    nombre: "Hospitales",
    icono: Hospital,
    descripcion: "Instalaciones de grado hospitalario",
    color: "bg-green-100"
  },
  {
    nombre: "Emergencias",
    icono: AlertCircle,
    descripcion: "Disponibles 24/7 para cualquier urgencia",
    color: "bg-red-100"
  }
];

const serviciosDetallados = [
  {
    titulo: "Fontanería y Plomería",
    icono: Droplets,
    descripcion: "Destapado de tuberías sin romper paredes, reparación de fugas, instalación de sistemas sanitarios, mantenimiento preventivo"
  },
  {
    titulo: "Electricidad",
    icono: Zap,
    descripcion: "Instalaciones eléctricas residenciales y comerciales, reparación de circuitos, iluminación LED, tableros eléctricos"
  },
  {
    titulo: "Construcción",
    icono: Hammer,
    descripcion: "Proyectos de construcción desde cero, ampliaciones, estructuras, obras civiles y acabados de calidad"
  },
  {
    titulo: "Remodelación",
    icono: Wrench,
    descripcion: "Renovación de espacios, modernización de baños y cocinas, acabados interiores y exteriores"
  },
  {
    titulo: "Pintura Profesional",
    icono: PaintBucket,
    descripcion: "Pintura interior y exterior, impermeabilización, acabados decorativos y protección de superficies"
  }
];

export default function Services() {
  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title="Servicios de Fontanería, Electricidad y Construcción | PROMAN Services"
        description="Servicios profesionales de fontanería, plomería, electricidad, construcción, remodelación y pintura en El Salvador. Atención 24/7 para emergencias. Destapado de tuberías, instalaciones eléctricas, obras de construcción y más."
        keywords="servicios fontanería El Salvador, plomería San Salvador, electricista profesional, construcción y remodelación, destapado tuberías, instalaciones eléctricas, pintura profesional, mantenimiento edificios, reparaciones urgentes, fontanero certificado"
      />
      <div className="gradient-navy-yellow text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Servicios Profesionales en San Salvador
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Fontanería, Electricidad, Construcción y Remodelaciones con Garantía de Calidad
          </p>
        </div>
      </div>

      {/* Servicios Detallados - Mejor para SEO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-proman-navy mb-4">
            Especialistas en Soluciones Integrales
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Más de 10 años brindando servicios profesionales de fontanería, electricidad y construcción en El Salvador
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

        {/* Rubros por Sector */}
        <div className="border-t pt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-proman-navy mb-4">
              Servicios por Sector
            </h2>
            <p className="text-lg text-gray-600">
              Soluciones personalizadas para cada tipo de cliente
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
            ¿Por qué elegir PROMAN Services?
          </h2>
          <div className="prose prose-lg text-gray-600 max-w-none">
            <p className="mb-4">
              Somos una empresa salvadoreña con más de 10 años de experiencia en el mercado, 
              especializada en <strong>servicios de fontanería</strong>, <strong>plomería</strong>, 
              <strong>electricidad</strong>, <strong>construcción</strong> y <strong>remodelaciones</strong>.
            </p>
            <p className="mb-4">
              Nuestro equipo de técnicos certificados utiliza tecnología de punta para el 
              <strong> destapado de tuberías sin romper paredes</strong>, ahorrándole tiempo y dinero. 
              Realizamos <strong>instalaciones eléctricas</strong> residenciales y comerciales cumpliendo 
              con todas las normas de seguridad.
            </p>
            <p>
              Atendemos <strong>emergencias 24/7</strong> en San Salvador, La Libertad y zonas aledañas. 
              Contáctenos al <strong>6053-1213</strong> para una cotización sin compromiso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
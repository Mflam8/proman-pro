import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Building2, UtensilsCrossed, Hospital, AlertCircle } from "lucide-react";

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

export default function Services() {
  return (
    <div className="min-h-screen bg-white">
      <div className="gradient-navy-yellow text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nuestros Servicios Profesionales
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Soluciones especializadas para cada sector con garantía de calidad
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
    </div>
  );
}
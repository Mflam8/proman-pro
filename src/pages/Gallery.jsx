import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const categoryNames = {
  fontaneria: "Fontanería",
  electricidad: "Electricidad",
  construccion: "Construcción",
  remodelacion: "Remodelación",
  pintura: "Pintura",
  mantenimiento: "Mantenimiento"
};

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-completion_date'),
    initialData: [],
  });

  const filteredProjects = activeCategory === "all" 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

  const categories = ["all", ...new Set(projects.map(p => p.category))];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="gradient-navy-yellow text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Galería de Proyectos
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Conoce algunos de los trabajos que hemos realizado para nuestros clientes
          </p>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-10">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-gray-100 p-1 overflow-x-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy">
                Todos
              </TabsTrigger>
              {categories.filter(c => c !== "all").map((category) => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="data-[state=active]:bg-proman-yellow data-[state=active]:text-proman-navy whitespace-nowrap"
                >
                  {categoryNames[category] || category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="overflow-hidden border-2 border-gray-100 hover:border-proman-yellow transition-all hover:shadow-lg">
              <div className="relative">
                {project.after_image_url ? (
                  <img 
                    src={project.after_image_url} 
                    alt={project.title}
                    className="w-full h-64 object-cover"
                  />
                ) : project.image_url ? (
                  <img 
                    src={project.image_url} 
                    alt={project.title}
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">Sin imagen</span>
                  </div>
                )}
                <Badge className="absolute top-4 right-4 bg-proman-yellow text-proman-navy">
                  {categoryNames[project.category] || project.category}
                </Badge>
              </div>
              
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-proman-navy mb-2">
                  {project.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {project.description}
                </p>

                <div className="space-y-2 text-sm text-gray-500">
                  {project.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-proman-yellow" />
                      <span>{project.location}</span>
                    </div>
                  )}
                  {project.completion_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-proman-yellow" />
                      <span>{format(new Date(project.completion_date), "MMMM yyyy", { locale: es })}</span>
                    </div>
                  )}
                </div>

                {project.before_image_url && project.after_image_url && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-proman-navy mb-2">Antes y Después:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <img 
                          src={project.before_image_url} 
                          alt="Antes"
                          className="w-full h-20 object-cover rounded"
                        />
                        <p className="text-xs text-gray-500 mt-1 text-center">Antes</p>
                      </div>
                      <div>
                        <img 
                          src={project.after_image_url} 
                          alt="Después"
                          className="w-full h-20 object-cover rounded"
                        />
                        <p className="text-xs text-gray-500 mt-1 text-center">Después</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay proyectos disponibles en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SEO from "../components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLanguage } from "@/components/LanguageContext";

const getCategoryNames = (t) => ({
  fontaneria: t({ es: "Fontanería", en: "Plumbing" }),
  electricidad: t({ es: "Electricidad", en: "Electrical" }),
  construccion: t({ es: "Construcción", en: "Construction" }),
  remodelacion: t({ es: "Remodelación", en: "Remodeling" }),
  pintura: t({ es: "Pintura", en: "Painting" }),
  mantenimiento: t({ es: "Mantenimiento", en: "Maintenance" })
});

export default function Gallery() {
  const { t, language } = useLanguage();
  const categoryNames = getCategoryNames(t);
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-completion_date'),
    initialData: [],
  });

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title="Galería de Proyectos - Trabajos Realizados | PROMAN Services"
        description="Conoce nuestros proyectos de fontanería, construcción, electricidad y remodelación en San Salvador. Fotos reales de trabajos terminados con antes y después."
        keywords="proyectos fontanería El Salvador, galería construcción, trabajos realizados plomería, antes y después remodelación, portafolio PROMAN, obras terminadas"
      />
      {/* Hero Section */}
      <div className="gradient-navy-yellow text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t({ es: "Galería de Proyectos", en: "Project Gallery" })}
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            {t({ es: "Conoce algunos de los trabajos que hemos realizado para nuestros clientes", en: "See some of the work we have done for our clients" })}
          </p>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden border-2 border-gray-100 hover:border-proman-yellow transition-all hover:shadow-lg">
              <div className="relative w-full" style={{ paddingBottom: '75%' }}>
              {project.after_image_url ? (
              <img 
                src={project.after_image_url} 
                alt={`${project.title} - ${t({ es: "Proyecto finalizado por PROMAN Services en", en: "Project completed by PROMAN Services in" })} ${project.location || 'El Salvador'}`}
                width="600"
                height="450"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-contain bg-gray-50"
              />
              ) : project.image_url ? (
              <img 
                src={project.image_url} 
                alt={`${project.title} - ${t({ es: "Proyecto de", en: "Project of" })} ${categoryNames[project.category] || project.category} ${t({ es: "en", en: "in" })} ${project.location || 'El Salvador'}`}
                width="600"
                height="450"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-contain bg-gray-50"
              />
              ) : (
              <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">{t({ es: "Sin imagen", en: "No image" })}</span>
              </div>
              )}
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
                      <span>{format(new Date(project.completion_date), "MMMM yyyy", { locale: language === 'es' ? es : enUS })}</span>
                    </div>
                  )}
                </div>

                {project.before_image_url && project.after_image_url && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-proman-navy mb-2">{t({ es: "Antes y Después:", en: "Before and After:" })}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                          <img 
                            src={project.before_image_url} 
                            alt={`${t({ es: "Estado inicial antes de la intervención", en: "Initial state before intervention" })} - ${project.title}`}
                            width="200"
                            height="200"
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-contain bg-gray-50 rounded"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">{t({ es: "Antes", en: "Before" })}</p>
                      </div>
                      <div>
                        <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                          <img 
                            src={project.after_image_url} 
                            alt={`${t({ es: "Resultado final después del trabajo", en: "Final result after work" })} - ${project.title}`}
                            width="200"
                            height="200"
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-contain bg-gray-50 rounded"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">{t({ es: "Después", en: "After" })}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {projects.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t({ es: "No hay proyectos disponibles", en: "No projects available" })}</p>
          </div>
        )}
      </div>
    </div>
  );
}
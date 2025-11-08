import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Briefcase, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Careers() {
  const [selectedImage, setSelectedImage] = useState(null);

  const { data: jobPostings, isLoading } = useQuery({
    queryKey: ['jobPostings'],
    queryFn: () => base44.entities.JobPosting.filter({ is_active: true }, 'order'),
    initialData: [],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="gradient-navy-yellow text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 hexagon bg-proman-yellow flex items-center justify-center">
                <Briefcase className="w-10 h-10 text-proman-navy" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Únete a Nuestro Equipo
            </h1>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto">
              Estamos buscando personas comprometidas y profesionales para formar parte de PROMAN Services
            </p>
          </div>
        </div>
      </div>

      {/* Job Postings Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proman-navy mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando vacantes...</p>
          </div>
        ) : jobPostings.length > 0 ? (
          <>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-proman-navy mb-4">
                Vacantes Disponibles
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Haz click en cualquier imagen para ver los detalles completos de la vacante
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {jobPostings.map((job) => (
                <Card 
                  key={job.id} 
                  className="border-2 border-gray-200 hover:border-proman-yellow transition-all cursor-pointer group overflow-hidden"
                  onClick={() => setSelectedImage(job.flyer_image_url)}
                >
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden">
                      <img
                        src={job.flyer_image_url}
                        alt={job.title}
                        className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-proman-navy/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                        <span className="text-white font-semibold text-lg">
                          Click para ampliar
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-white">
                      <h3 className="font-bold text-proman-navy text-lg text-center">
                        {job.title}
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay vacantes disponibles en este momento
            </h3>
            <p className="text-gray-500">
              Te invitamos a revisar próximamente o contáctanos directamente
            </p>
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-16 bg-proman-navy rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">
            ¿Tienes preguntas sobre las vacantes?
          </h3>
          <p className="text-gray-200 mb-6 max-w-2xl mx-auto">
            Nuestro equipo de Recursos Humanos está disponible para resolver tus dudas y guiarte en el proceso de aplicación
          </p>
          <a href="tel:71505331">
            <Button className="bg-proman-yellow text-proman-navy hover:opacity-90 text-lg px-8 py-6">
              <Phone className="w-5 h-5 mr-2" />
              Llamar: 7150-5331
            </Button>
          </a>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-7xl w-full h-[95vh] p-0 bg-black/95">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6 text-gray-800" />
            </button>
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={selectedImage}
                alt="Vacante"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
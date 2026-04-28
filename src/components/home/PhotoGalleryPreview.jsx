import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export default function PhotoGalleryPreview() {
  const { t } = useLanguage();
  const workPhotos = [
    {
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/3c7509e6a_20210227_141443.jpg",
      title: "Fontanería General",
      category: "Fontanería"
    },
    {
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/314cf23a8_20220408_200249.jpg",
      title: "Fontanería Comercial",
      category: "Fontanería"
    },
    {
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/4c5e09e7a_20220622_145406.jpg",
      title: "Pintura Comercial",
      category: "Pintura"
    },
    {
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/cd5fcf53e_WhatsAppImage2025-10-14at122739PM1.jpg",
      title: "Remodelación Comercial",
      category: "Remodelación"
    },
    {
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/bb24f7300_20220628_153515.jpg",
      title: "Pintura Profesional",
      category: "Pintura"
    },
    {
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/21423264f_WhatsAppImage2025-10-14at122741PM2.jpg",
      title: "Construcción de Estructuras",
      category: "Construcción"
    }
  ];

  return (
    <div className="py-12 md:py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-proman-navy mb-4">
            {t({ es: "Galería de Trabajos Realizados", en: "Gallery of Completed Projects" })}
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            {t({ es: "Proyectos reales que demuestran nuestra calidad y experiencia", en: "Real projects that demonstrate our quality and experience" })}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-8 md:mb-10">
          {workPhotos.map((photo, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl border-2 border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 aspect-[4/3] backdrop-blur-sm"
            >
              <img
                src={photo.image}
                alt={`Proyecto de ${photo.category} - ${photo.title} realizado por PROMAN Services`}
                width="400"
                height="300"
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "low"}
                decoding="async"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 50vw"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-proman-yellow flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white text-sm sm:text-base md:text-lg font-bold leading-tight">
                      {photo.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-proman-yellow">
                      {photo.category}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link to={createPageUrl("Gallery")}>
            <Button size="lg" className="bg-proman-navy text-white hover:bg-opacity-90">
              {t({ es: "Ver Galería Completa", en: "View Full Gallery" })}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
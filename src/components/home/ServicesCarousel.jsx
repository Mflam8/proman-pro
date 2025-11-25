import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageContext";

export default function ServicesCarousel() {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const slides = [
  {
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/21423264f_WhatsAppImage2025-10-14at122741PM2.jpg",
    title: t({ es: "Construcción y Estructuras", en: "Construction & Structures" }),
    description: t({ es: "Instalación de techos metálicos y estructuras con precisión profesional", en: "Installation of metal roofs and structures with professional precision" })
  },
  {
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/698a8782c_WhatsAppImage2025-10-14at122741PM.jpg",
    title: t({ es: "Pintura Exterior Premium", en: "Premium Exterior Painting" }),
    description: t({ es: "Acabados perfectos en fachadas residenciales y comerciales", en: "Perfect finishes on residential and commercial facades" })
  },
  {
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/393ddd769_WhatsAppImage2025-10-14at122740PM3.jpg",
    title: t({ es: "Fontanería Industrial", en: "Industrial Plumbing" }),
    description: t({ es: "Reparación y fabricación de sistemas de tuberías especializadas", en: "Repair and fabrication of specialized piping systems" })
  },
  {
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/fc61c6058_WhatsAppImage2025-10-14at122738PM2.jpg",
    title: t({ es: "Remodelaciones Completas", en: "Complete Remodeling" }),
    description: t({ es: "Transformación total de espacios con nuestro equipo experto", en: "Total space transformation with our expert team" })
  },
  {
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/9f95904f9_WhatsAppImage2025-10-14at122738PM.jpg",
    title: t({ es: "Servicio 24/7 Emergencias", en: "24/7 Emergency Service" }),
    description: t({ es: "Disponibles para emergencias en cualquier momento del día", en: "Available for emergencies at any time of the day" })
  },
  {
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ef04efb2facc1f9d963736/8c3760594_WhatsAppImage2025-10-14at122737PM1.jpg",
    title: t({ es: "Instalaciones Técnicas", en: "Technical Installations" }),
    description: t({ es: "Sistemas de climatización y fontanería con tecnología avanzada", en: "HVAC and plumbing systems with advanced technology" })
  }];


  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <div className="py-12 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-proman-navy mb-4">
            {t({ es: "Nuestro Trabajo Profesional", en: "Our Professional Work" })}
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            {t({ es: "Más de 10 años brindando soluciones de calidad", en: "Over 10 years providing quality solutions" })}
          </p>
        </div>

        <div className="relative">
          {/* Main Carousel */}
          <div className="relative h-64 sm:h-80 md:h-96 lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
            {slides.map((slide, index) =>
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ${
              index === currentIndex ? "opacity-100" : "opacity-0"}`
              }>

                <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover" />

                <div className="absolute inset-0 bg-gradient-to-t from-proman-navy/90 via-proman-navy/50 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-12 text-white">
                  <h3 className="text-2xl font-bold sm:text-3xl md:text-4xl mb-2 md:mb-3 drop-shadow-lg">
                    {slide.title}
                  </h3>
                  <p className="text-base sm:text-lg md:text-xl max-w-2xl drop-shadow-md">
                    {slide.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border-2 border-proman-yellow text-proman-navy rounded-full w-10 h-10 sm:w-12 sm:h-12">

            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border-2 border-proman-yellow text-proman-navy rounded-full w-10 h-10 sm:w-12 sm:h-12">

            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {slides.map((_, index) =>
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
              index === currentIndex ?
              "bg-proman-yellow w-6 sm:w-8" :
              "bg-gray-300 hover:bg-gray-400"}`
              } />

            )}
          </div>
        </div>
      </div>
    </div>);

}
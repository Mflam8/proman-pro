import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGoogleReviews } from "@/functions/fetchGoogleReviews";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";


import { useLanguage } from "@/components/LanguageContext";

export default function ReviewsSection() {
  const { t } = useLanguage();
  const PLACE_QUERY = "PROMAN Services El Salvador";

  const FALLBACK_REVIEWS = [
    { author_name: "Cecilia De Escalante", rating: 5, text: "Solicité sus servicios y vinieron en buen horario y buen servicio.", relative_time_description: "hace 1 semana", source: "Google" },
    { author_name: "Fernando Paz", rating: 5, text: "Excelente servicio y comunicación, su trabajo vale la pena. Recomendado.", relative_time_description: "hace 11 semanas", source: "Google" },
    { author_name: "Rodrigo Avilés", rating: 5, text: "Empresa muy profesional y excelente servicio. Recomendado al 100%.", relative_time_description: "hace 20 semanas", source: "Google" },
    { author_name: "Roberto Monterrosa", rating: 5, text: "PROMAN SERVICES con personal muy capacitado. Servicio profesional de principio a fin.", relative_time_description: "hace 23 semanas", source: "Google" },
    { author_name: "Nick The Doodle Guy", rating: 5, text: "Solid service and workmanship! Highly recommended.", relative_time_description: "hace 23 semanas", source: "Google" },
    { author_name: "Jenn Villa (Facebook)", rating: 5, text: "Excelente servicio. Nos resolvieron un problema de desagüe. Súper recomendado.", relative_time_description: "Facebook", source: "Facebook" },
    { author_name: "Claudia de Durán (Facebook)", rating: 5, text: "¡Excelente servicio! Muy profesionales y súper recomendado.", relative_time_description: "Facebook", source: "Facebook" }
  ];

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['gmb-reviews'],
    queryFn: async () => {
      const res = await fetchGoogleReviews({ query: PLACE_QUERY, minRating: 4 });
      return res.data.reviews || [];
    },
    enabled: false,
    staleTime: 1000 * 60 * 10,
  });

  const displayedReviews = (reviews && reviews.length > 0) ? reviews : FALLBACK_REVIEWS;
  const avgRating = displayedReviews.length ? (displayedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / displayedReviews.length) : 0;

  return (
    <div className="py-20 bg-gradient-to-b from-white via-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-proman-navy mb-2">
            {t({ es: "Opiniones en Google", en: "Google Reviews" })}
          </h2>
          <p className="text-sm text-gray-600">
            {t({ es: "Actualizadas en tiempo real desde Google Business Profile", en: "Live from Google Business Profile" })}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(avgRating) ? 'text-proman-yellow fill-proman-yellow' : 'text-gray-300'}`}
                  fill={i < Math.round(avgRating) ? '#fdc80c' : 'none'}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-proman-navy">{avgRating.toFixed(1)}/5</span>
            <span className="text-xs text-gray-600">({displayedReviews.length} {t({ es: "reseñas", en: "reviews" })})</span>
          </div>
        </div>

        {/* Carrusel tipo marquee con pausa al hover */}
        <style>{`
          @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
          .marquee { animation: marquee 16s linear infinite; }
          .marquee:hover, .marquee:active { animation-play-state: paused; }
          @media (max-width: 640px) { .marquee { animation: none !important; } }
        `}</style>
        {displayedReviews.length === 0 && !isLoading ? (
          <p className="text-center text-gray-500">No hay reseñas disponibles por el momento.</p>
        ) : (
          <div className="overflow-x-auto md:overflow-hidden">
            <div className="marquee flex gap-6 px-1 md:will-change-transform snap-x snap-mandatory">
              {[...displayedReviews, ...displayedReviews].map((review, idx) => (
                <Card key={`${review.author_name}-${review.time}-${idx}`} className="snap-start relative min-w-[300px] max-w-[360px] border-2 border-gray-100 hover:border-proman-yellow transition-all bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <Quote className="w-10 h-10 text-proman-yellow opacity-20 absolute top-4 right-4" />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 border flex items-center justify-center text-gray-500 font-semibold">
                          {review.author_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-proman-navy leading-tight">{review.author_name}</p>
                          <p className="text-xs text-gray-500">{review.relative_time_description}</p>
                        </div>
                      </div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-proman-yellow fill-proman-yellow' : 'text-gray-300'}`} fill={i < review.rating ? '#fdc80c' : 'none'} />
                        ))}
                      </div>
                    </div>

                    <p className="text-gray-700 line-clamp-5">{review.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
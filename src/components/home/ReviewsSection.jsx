import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGoogleReviews } from "@/functions/fetchGoogleReviews";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";


import { useLanguage } from "@/components/LanguageContext";

export default function ReviewsSection() {
  const { t } = useLanguage();
  const PLACE_QUERY = "PROMAN Services El Salvador";
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['gmb-reviews'],
    queryFn: async () => {
      const res = await fetchGoogleReviews({ query: PLACE_QUERY, minRating: 4 });
      return res.data.reviews || [];
    },
  });

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
        </div>

        {/* Carrusel tipo marquee con pausa al hover */}
        <style>{`
          @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
          .marquee { animation: marquee 28s linear infinite; }
          .marquee:hover { animation-play-state: paused; }
        `}</style>
        {reviews.length === 0 && !isLoading ? (
          <p className="text-center text-gray-500">No hay reseñas disponibles por el momento.</p>
        ) : (
          <div className="overflow-hidden">
            <div className="marquee flex gap-6 px-1 will-change-transform">
              {[...reviews, ...reviews].map((review, idx) => (
                <Card key={`${review.author_name}-${review.time}-${idx}`} className="relative min-w-[300px] max-w-[360px] border-2 border-gray-100 hover:border-proman-yellow transition-all bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <Quote className="w-10 h-10 text-proman-yellow opacity-20 absolute top-4 right-4" />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {review.profile_photo_url ? (
                          <img src={review.profile_photo_url} alt={review.author_name} className="w-10 h-10 rounded-full border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200" />
                        )}
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
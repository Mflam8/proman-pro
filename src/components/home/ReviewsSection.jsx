
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ReviewsSection() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-date', 6),
    initialData: [],
  });

  return (
    <div className="py-20 bg-gradient-to-b from-white via-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-proman-navy mb-4">
            Lo Que Dicen Nuestros Clientes
          </h2>
          <p className="text-lg text-gray-600">
            Testimonios reales de personas que confían en PROMAN Services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <Card key={review.id} className="relative border-2 border-gray-100 hover:border-proman-yellow transition-all">
              <CardContent className="p-6">
                <Quote className="w-10 h-10 text-proman-yellow opacity-20 absolute top-4 right-4" />
                
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < review.rating 
                          ? "text-proman-yellow fill-proman-yellow" 
                          : "text-gray-300"
                      }`}
                      fill={i < review.rating ? "#fdc80c" : "none"}
                    />
                  ))}
                </div>

                <p className="text-gray-700 mb-4 italic">
                  "{review.comment}"
                </p>

                <div className="border-t pt-4">
                  <p className="font-semibold text-proman-navy">{review.client_name}</p>
                  {review.service_type && (
                    <p className="text-sm text-gray-500">{review.service_type}</p>
                  )}
                  {review.location && (
                    <p className="text-xs text-gray-400 mt-1">{review.location}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

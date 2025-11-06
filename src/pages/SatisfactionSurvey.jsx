import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle } from "lucide-react";

export default function SatisfactionSurvey() {
    const [inquiryId, setInquiryId] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        setInquiryId(urlParams.get('id'));
    }, []);

    const { data: inquiry, isLoading } = useQuery({
        queryKey: ['clientInquiry', inquiryId],
        queryFn: () => base44.entities.ClientInquiry.get(inquiryId),
        enabled: !!inquiryId,
    });

    const submitSurvey = useMutation({
        mutationFn: (data) => base44.entities.ClientInquiry.update(inquiryId, data),
        onSuccess: () => {
            setIsSubmitted(true);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (rating > 0) {
            submitSurvey.mutate({
                satisfaction_rating: rating,
                satisfaction_comment: comment,
            });
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg text-center shadow-lg">
                    <CardHeader>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <CardTitle className="text-2xl text-proman-navy">¡Gracias por tu opinión!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600">Tu retroalimentación es muy valiosa para nosotros y nos ayuda a mejorar continuamente.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) return <div className="text-center p-8">Cargando encuesta...</div>;
    if (!inquiry) return <div className="text-center p-8">No se encontró la solicitud. Por favor, verifica el enlace.</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-proman-navy">Encuesta de Satisfacción</CardTitle>
                    <CardDescription>
                        Cuéntanos cómo fue tu experiencia con el servicio de <span className="font-semibold">{inquiry.service_type}</span> para <span className="font-semibold">{inquiry.client_name}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-proman-navy mb-3">
                                ¿Qué tan satisfecho estás con el servicio recibido? *
                            </label>
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-10 h-10 cursor-pointer transition-all ${rating >= star ? 'text-proman-yellow fill-proman-yellow' : 'text-gray-300'}`}
                                        onClick={() => setRating(star)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-proman-navy mb-2">
                                ¿Tienes algún comentario adicional? (Opcional)
                            </label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Tus comentarios nos ayudan a mejorar..."
                                rows={4}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold"
                            disabled={rating === 0 || submitSurvey.isPending}
                        >
                            {submitSurvey.isPending ? "Enviando..." : "Enviar Opinión"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
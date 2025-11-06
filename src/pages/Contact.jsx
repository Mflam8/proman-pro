
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MapPin, Clock, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: "",
    rubro: "", // Added 'rubro' field
    service: "",
    message: "",
    preferredTime: ""
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const whatsappNumber = "50360531213";

  const submitInquiry = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ClientInquiry.create({
        client_name: data.name,
        phone: data.phone,
        location: data.location,
        rubro: data.rubro, // Added 'rubro' to the payload
        service_type: data.service,
        message: data.message,
        preferred_time: data.preferredTime,
        status: "nuevo",
        whatsapp_sent: true
      });
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        const message = `Hola PROMAN, me gustaría agendar un servicio:

👤 Nombre: ${formData.name}
📱 Teléfono: ${formData.phone}
📍 Ubicación: ${formData.location}
🏢 Rubro: ${formData.rubro}
🔧 Servicio: ${formData.service}
⏰ Horario preferido: ${formData.preferredTime}

Mensaje: ${formData.message}`;

        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
        
        setFormData({
          name: "",
          phone: "",
          location: "",
          rubro: "", // Reset 'rubro' field
          service: "",
          message: "",
          preferredTime: ""
        });
        setShowSuccess(false);
      }, 1500);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    submitInquiry.mutate(formData);
  };

  const departamentos = [
    "Ahuachapán", "Santa Ana", "Sonsonate", "La Libertad", "San Salvador",
    "Chalatenango", "Cuscatlán", "La Paz", "Cabañas", "San Vicente",
    "Usulután", "San Miguel", "Morazán", "La Unión"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="gradient-navy-yellow text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Contáctanos
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Estamos listos para atender tu solicitud. Respuesta rápida garantizada.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="border-2 border-proman-yellow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center">
                <Phone className="w-8 h-8 text-proman-navy" />
              </div>
              <h3 className="font-bold text-proman-navy mb-2">Teléfono</h3>
              <a href="tel:60531213" className="text-gray-600 hover:text-proman-yellow">
                6053-1213
              </a>
            </CardContent>
          </Card>

          <Card className="border-2 border-proman-yellow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-proman-navy" />
              </div>
              <h3 className="font-bold text-proman-navy mb-2">Cobertura</h3>
              <p className="text-gray-600">
                San Salvador, La Libertad y Zona Occidental
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-proman-yellow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-8 h-8 text-proman-navy" />
              </div>
              <h3 className="font-bold text-proman-navy mb-2">Horario</h3>
              <p className="text-gray-600">
                Disponibles 24/7
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-bold text-proman-navy mb-6">
              Agenda tu Servicio
            </h2>
            <p className="text-gray-600 mb-8">
              Completa el formulario y serás redirigido a WhatsApp para continuar con tu solicitud. 
              Tu información quedará guardada en nuestro sistema.
            </p>

            {showSuccess && (
              <Alert className="mb-6 border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ¡Datos guardados! Redirigiendo a WhatsApp...
                </AlertDescription>
              </Alert>
            )}

            <Card className="border-2 border-gray-200">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      Nombre y Apellido *
                    </label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Tu nombre y apellido"
                      disabled={submitInquiry.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      Teléfono *
                    </label>
                    <Input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="7XXX-XXXX"
                      disabled={submitInquiry.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      Departamento
                    </label>
                    <Select
                      value={formData.location}
                      onValueChange={(value) => setFormData({...formData, location: value})}
                      disabled={submitInquiry.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      Rubro *
                    </label>
                    <Select
                      required
                      value={formData.rubro}
                      onValueChange={(value) => setFormData({...formData, rubro: value, service: ""})} // Reset service when rubro changes
                      disabled={submitInquiry.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el rubro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hogar">Hogar</SelectItem>
                        <SelectItem value="Comercial">Comercial</SelectItem>
                        <SelectItem value="Restaurantes">Restaurantes</SelectItem>
                        <SelectItem value="Hospitales">Hospitales</SelectItem>
                        <SelectItem value="Emergencias">Emergencias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      Tipo de Servicio
                    </label>
                    <Select
                      value={formData.service}
                      onValueChange={(value) => setFormData({...formData, service: value})}
                      disabled={submitInquiry.isPending || !formData.rubro} // Disable if rubro is not selected
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Updated service items */}
                        <SelectItem value="Fontanería General">Fontanería General</SelectItem>
                        <SelectItem value="Detección de Fugas">Detección de Fugas</SelectItem>
                        <SelectItem value="Servicios Eléctricos">Servicios Eléctricos</SelectItem>
                        <SelectItem value="Remodelación">Remodelación</SelectItem>
                        <SelectItem value="Tablaroca">Tablaroca</SelectItem>
                        <SelectItem value="Reparación de Techos">Reparación de Techos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      Horario Preferido
                    </label>
                    <Select
                      value={formData.preferredTime}
                      onValueChange={(value) => setFormData({...formData, preferredTime: value})}
                      disabled={submitInquiry.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un horario" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mañana (8am-12pm)">Mañana (8am-12pm)</SelectItem>
                        <SelectItem value="Tarde (12pm-5pm)">Tarde (12pm-5pm)</SelectItem>
                        <SelectItem value="Noche (5pm-8pm)">Noche (5pm-8pm)</SelectItem>
                        <SelectItem value="Emergencia 24/7">Emergencia 24/7</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      Descripción del Problema
                    </label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Describe brevemente lo que necesitas..."
                      rows={4}
                      disabled={submitInquiry.isPending}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                    size="lg"
                    disabled={submitInquiry.isPending}
                  >
                    {submitInquiry.isPending ? "Guardando..." : "Continuar por WhatsApp"}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Tus datos se guardarán automáticamente antes de redirigir a WhatsApp
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-proman-navy mb-6">
              ¿Cómo Funciona?
            </h2>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-proman-navy">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-proman-navy mb-2">Completa el Formulario</h3>
                  <p className="text-gray-600">
                    Proporciona tus datos básicos y el tipo de servicio que necesitas.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-proman-navy">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-proman-navy mb-2">Continúa por WhatsApp</h3>
                  <p className="text-gray-600">
                    Serás redirigido a WhatsApp donde nuestro asistente virtual te atenderá de inmediato.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-proman-navy">3</span>
                </div>
                <div>
                  <h3 className="font-bold text-proman-navy mb-2">Envía Detalles</h3>
                  <p className="text-gray-600">
                    Puedes compartir fotos o videos del problema para que nuestros técnicos lo evalúen.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-proman-navy">4</span>
                </div>
                <div>
                  <h3 className="font-bold text-proman-navy mb-2">Agenda tu Cita</h3>
                  <p className="text-gray-600">
                    Coordina el día y hora que mejor te convenga. Recibirás recordatorios automáticos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-proman-navy">5</span>
                </div>
                <div>
                  <h3 className="font-bold text-proman-navy mb-2">Servicio Completado</h3>
                  <p className="text-gray-600">
                    Nuestro técnico resolverá tu problema. Después te pediremos tu opinión.
                  </p>
                </div>
              </div>
            </div>

            <Card className="mt-8 bg-proman-navy text-white border-0">
              <CardContent className="p-6">
                <h3 className="font-bold text-proman-yellow mb-3">
                  ¿Prefieres Hablar Directamente?
                </h3>
                <p className="text-gray-200 mb-4">
                  Llámanos ahora y uno de nuestros representantes te atenderá personalmente.
                </p>
                <a href="tel:60531213">
                  <Button variant="outline" className="w-full border-2 border-proman-yellow text-proman-yellow hover:bg-proman-yellow hover:text-proman-navy">
                    <Phone className="w-5 h-5 mr-2" />
                    Llamar: 6053-1213
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

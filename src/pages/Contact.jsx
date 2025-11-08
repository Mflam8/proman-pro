import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MapPin, Clock, CheckCircle2, Mail, MessageCircle } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    client_name: "",
    phone: "",
    location: "",
    rubro: "",
    service_type: "",
    preferred_time: "",
    message: ""
  });
  const [successMessage, setSuccessMessage] = useState(false);
  const queryClient = useQueryClient();

  const submitInquiry = useMutation({
    mutationFn: (data) => base44.entities.ClientInquiry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientInquiries'] });
      setSuccessMessage(true);
      setFormData({
        client_name: "",
        phone: "",
        location: "",
        rubro: "",
        service_type: "",
        preferred_time: "",
        message: ""
      });
      setTimeout(() => setSuccessMessage(false), 5000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitInquiry.mutate({
      ...formData,
      status: "nuevo"
    });
  };

  const rubros = [
    { value: "Hogar", label: "Hogar" },
    { value: "Comercial", label: "Comercial" },
    { value: "Restaurantes", label: "Restaurantes" },
    { value: "Hospitales", label: "Hospitales" },
    { value: "Emergencias", label: "Emergencias" }
  ];

  const departamentos = [
    "Ahuachapán", "Santa Ana", "Sonsonate", "La Libertad", "San Salvador",
    "Chalatenango", "Cuscatlán", "La Paz", "Cabañas", "San Vicente",
    "Usulután", "San Miguel", "Morazán", "La Unión"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="gradient-navy-yellow text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Solicita tu Servicio
          </h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            Déjanos tus datos y nuestro equipo te contactará para confirmar tu servicio
          </p>
        </div>
      </div>

      {/* Contact Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-12">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-2 border-proman-yellow shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center">
                <Phone className="w-8 h-8 text-proman-navy" />
              </div>
              <h3 className="font-bold text-proman-navy mb-2">Teléfono</h3>
              <p className="text-gray-600 mb-2">Llámanos directamente</p>
              <a href="tel:60531213" className="text-proman-yellow font-semibold hover:underline">
                6053-1213
              </a>
            </CardContent>
          </Card>

          <Card className="border-2 border-proman-yellow shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-proman-navy" />
              </div>
              <h3 className="font-bold text-proman-navy mb-2">Cobertura</h3>
              <p className="text-gray-600">San Salvador, La Libertad y Zona Occidental</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-proman-yellow shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-8 h-8 text-proman-navy" />
              </div>
              <h3 className="font-bold text-proman-navy mb-2">Horario</h3>
              <p className="text-gray-600">Lun - Sáb: 7:00 AM - 6:00 PM</p>
              <p className="text-sm text-gray-500 mt-1">Emergencias 24/7</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="border-2 border-gray-200 shadow-lg h-fit">
            <CardHeader className="bg-proman-navy text-white">
              <CardTitle className="text-2xl">Solicita tu Servicio</CardTitle>
              <p className="text-sm text-gray-200 mt-1">
                Completa el formulario y te contactaremos
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">¡Solicitud Recibida!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Nuestro equipo se comunicará contigo pronto para confirmar los detalles del servicio.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-2">
                    Nombre Completo *
                  </label>
                  <Input
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-2">
                    Teléfono *
                  </label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="7XXX-XXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-2">
                    Departamento *
                  </label>
                  <Select
                    required
                    value={formData.location}
                    onValueChange={(value) => setFormData({...formData, location: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departamentos.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-2">
                    Tipo de Servicio *
                  </label>
                  <Select
                    required
                    value={formData.rubro}
                    onValueChange={(value) => setFormData({...formData, rubro: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {rubros.map((rubro) => (
                        <SelectItem key={rubro.value} value={rubro.value}>
                          {rubro.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-2">
                    Servicio Específico
                  </label>
                  <Input
                    value={formData.service_type}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    placeholder="Ej: Destapado de tuberías, instalación eléctrica..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-2">
                    Horario Preferido
                  </label>
                  <Select
                    value={formData.preferred_time}
                    onValueChange={(value) => setFormData({...formData, preferred_time: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu horario preferido" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mañana">Mañana (8:00 AM - 12:00 PM)</SelectItem>
                      <SelectItem value="tarde">Tarde (12:00 PM - 4:00 PM)</SelectItem>
                      <SelectItem value="vespertino">Vespertino (4:00 PM - 6:00 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-proman-navy mb-2">
                    Describe tu necesidad
                  </label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Cuéntanos los detalles de lo que necesitas..."
                    rows={4}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold text-lg py-6"
                  disabled={submitInquiry.isPending}
                >
                  {submitInquiry.isPending ? "Enviando..." : "Solicitar Servicio"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* How It Works Section */}
          <div className="space-y-6">
            <Card className="border-2 border-proman-yellow shadow-lg">
              <CardHeader className="bg-proman-yellow">
                <CardTitle className="text-2xl text-proman-navy">
                  ¿Cómo Funciona?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 hexagon bg-proman-navy flex items-center justify-center">
                        <span className="text-white font-bold text-xl">1</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-proman-navy mb-2 text-lg">
                        Completa el Formulario
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Llena todos los datos de tu solicitud. Mientras más detalles nos proporciones, mejor podremos prepararnos para atenderte.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 hexagon bg-proman-navy flex items-center justify-center">
                        <span className="text-white font-bold text-xl">2</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-proman-navy mb-2 text-lg">
                        Te Contactamos
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Nuestro equipo de servicio al cliente te llamará para confirmar los detalles, aclarar dudas y entender mejor tu necesidad.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 hexagon bg-proman-navy flex items-center justify-center">
                        <span className="text-white font-bold text-xl">3</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-proman-navy mb-2 text-lg">
                        Agendamos tu Servicio
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Coordinamos fecha, hora y asignamos al técnico más adecuado para tu caso. Te enviaremos toda la información por WhatsApp.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 hexagon bg-proman-yellow flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-proman-navy" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-proman-navy mb-2 text-lg">
                        Realizamos el Trabajo
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Nuestro técnico llega puntual, realiza el servicio con profesionalismo y te mantiene informado del progreso en todo momento.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Methods */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-xl text-proman-navy">
                  ¿Prefieres Contactarnos Directamente?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <a href="tel:60531213">
                  <Button variant="outline" className="w-full border-2 border-proman-navy text-proman-navy hover:bg-proman-navy hover:text-white text-lg py-6">
                    <Phone className="w-5 h-5 mr-2" />
                    Llamar Ahora: 6053-1213
                  </Button>
                </a>
                
                <a 
                  href="https://wa.me/50360531213?text=Hola,%20me%20interesa%20conocer%20más%20sobre%20los%20servicios%20de%20PROMAN"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white text-lg py-6">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp
                  </Button>
                </a>

                <div className="pt-4 border-t text-center">
                  <p className="text-sm text-gray-600">
                    <strong>Tiempo de respuesta:</strong> Menos de 2 horas en horario laboral
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SEO from "../components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MapPin, Clock, CheckCircle2, Mail, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export default function Contact() {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    location: "",
    rubro: "",
    service_type: "",
    preferred_time: "",
    message: ""
  });
  const [successMessage, setSuccessMessage] = useState(false);
  const queryClient = useQueryClient();

  const submitCustomer = useMutation({
    mutationFn: async (data) => {
      // Determinar si es emergencia basado en el rubro
      const isEmergency = data.rubro === "Emergencias";
      
      // Ajustar el rubro si es emergencia (no existe "Emergencias" como rubro principal)
      const primaryRubro = isEmergency ? "Hogar" : data.rubro;
      
      // Crear el cliente con estado "nuevo"
      const customerData = {
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || undefined,
        status: "nuevo",
        primary_rubro: primaryRubro,
        is_emergency: isEmergency,
        preferred_contact: "whatsapp",
        addresses: [{
          label: "Principal",
          location: data.location,
          is_primary: true
        }],
        notes: data.message ? `Solicitud web: ${data.service_type || 'Sin especificar'}. ${data.message}` : `Solicitud web: ${data.service_type || 'Sin especificar'}`
      };
      
      return base44.entities.Customer.create(customerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSuccessMessage(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitCustomer.mutate(formData);
  };

  const rubros = [
    { value: "Hogar", label: t({ es: "Hogar", en: "Home" }) },
    { value: "Comercial", label: t({ es: "Comercial", en: "Commercial" }) },
    { value: "Restaurantes", label: t({ es: "Restaurantes", en: "Restaurants" }) },
    { value: "Hospitales", label: t({ es: "Hospitales", en: "Hospitals" }) },
    { value: "Emergencias", label: t({ es: "Emergencias", en: "Emergencies" }) }
  ];

  const departamentos = [
    "Ahuachapán", "Santa Ana", "Sonsonate", "La Libertad", "San Salvador",
    "Chalatenango", "Cuscatlán", "La Paz", "Cabañas", "San Vicente",
    "Usulután", "San Miguel", "Morazán", "La Unión"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title={t({ 
          es: "Contacto - Solicita tu Servicio | PROMAN Services",
          en: "Contact - Request Your Service | PROMAN Services"
        })}
        description={t({ 
          es: "Contáctanos para servicios de fontanería, plomería, electricidad y construcción en San Salvador. Atención inmediata por WhatsApp o teléfono 6053-1213. Solicita tu cotización gratis.",
          en: "Contact us for plumbing, electrical and construction services in San Salvador. Immediate attention via WhatsApp or phone 6053-1213. Request your free quote."
        })}
        keywords={t({ 
          es: "contacto fontanero San Salvador, solicitar plomero, electricista urgente, cotización construcción, servicios de emergencia, fontanería La Libertad, WhatsApp PROMAN",
          en: "contact plumber San Salvador, request electrician, urgent electrician, construction quote, emergency services, La Libertad plumbing, PROMAN WhatsApp"
        })}
      />
      {/* Hero Section */}
      <div className="gradient-navy-yellow text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t({ es: "Solicita tu Servicio", en: "Request Your Service" })}
          </h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            {t({ es: "Déjanos tus datos y nuestro equipo te contactará para confirmar tu servicio", en: "Leave us your information and our team will contact you to confirm your service" })}
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
              <h3 className="font-bold text-proman-navy mb-2">{t({ es: "Teléfono", en: "Phone" })}</h3>
              <p className="text-gray-600 mb-2">{t({ es: "Llámanos directamente", en: "Call us directly" })}</p>
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
              <h3 className="font-bold text-proman-navy mb-2">{t({ es: "Cobertura", en: "Coverage" })}</h3>
              <p className="text-gray-600">{t({ es: "San Salvador, La Libertad y Zona Occidental", en: "San Salvador, La Libertad and Western Region" })}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-proman-yellow shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 hexagon bg-proman-yellow mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-8 h-8 text-proman-navy" />
              </div>
              <h3 className="font-bold text-proman-navy mb-2">{t({ es: "Horario", en: "Schedule" })}</h3>
              <p className="text-gray-600">{t({ es: "Lun - Sáb: 7:00 AM - 6:00 PM", en: "Mon - Sat: 7:00 AM - 6:00 PM" })}</p>
              <p className="text-sm text-gray-500 mt-1">{t({ es: "Emergencias 24/7", en: "24/7 Emergencies" })}</p>
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
              <CardTitle className="text-2xl">{t({ es: "Solicita tu Servicio", en: "Request Your Service" })}</CardTitle>
              <p className="text-sm text-gray-200 mt-1">
                {t({ es: "Completa el formulario y te contactaremos", en: "Complete the form and we will contact you" })}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {successMessage ? (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 hexagon bg-green-100 mx-auto mb-6 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-800 mb-4">
                    {t({ es: "¡Solicitud Enviada Exitosamente!", en: "Request Sent Successfully!" })}
                  </h3>
                  <div className="max-w-md mx-auto space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      {t({ es: "Tu solicitud ha sido recibida. Nuestro equipo se comunicará contigo pronto para confirmar los detalles del servicio.", en: "Your request has been received. Our team will contact you soon to confirm the service details." })}
                    </p>
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>📞 {t({ es: "Tiempo de respuesta:", en: "Response time:" })}</strong> {t({ es: "Menos de 2 horas en horario laboral", en: "Less than 2 hours during business hours" })}
                      </p>
                    </div>
                    <div className="pt-4">
                      <p className="text-gray-600 mb-4">
                        {t({ es: "¿Necesitas contactarnos de inmediato?", en: "Need to contact us immediately?" })}
                      </p>
                      <div className="space-y-3">
                        <a href="tel:60531213" className="block">
                          <Button variant="outline" className="w-full border-2 border-proman-navy text-proman-navy hover:bg-proman-navy hover:text-white">
                            <Phone className="w-4 h-4 mr-2" />
                            {t({ es: "Llamar: 6053-1213", en: "Call: 6053-1213" })}
                          </Button>
                        </a>
                        <a 
                          href={`https://wa.me/50360531213?text=${encodeURIComponent(t({ es: "Hola, me interesa conocer más sobre los servicios de PROMAN", en: "Hello, I want to know more about PROMAN services" }))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      {t({ es: "Nombre Completo *", en: "Full Name *" })}
                    </label>
                    <Input
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      placeholder={t({ es: "Juan Pérez", en: "John Doe" })}
                      disabled={submitCustomer.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      {t({ es: "Teléfono *", en: "Phone *" })}
                    </label>
                    <Input
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="7XXX-XXXX"
                      disabled={submitCustomer.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      {t({ es: "Email (Opcional)", en: "Email (Optional)" })}
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder={t({ es: "tu@email.com", en: "your@email.com" })}
                      disabled={submitCustomer.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      {t({ es: "Departamento *", en: "Department *" })}
                    </label>
                    <Select
                      required
                      value={formData.location}
                      onValueChange={(value) => setFormData({...formData, location: value})}
                      disabled={submitCustomer.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t({ es: "Selecciona tu departamento", en: "Select your department" })} />
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
                      {t({ es: "Tipo de Servicio *", en: "Service Type *" })}
                    </label>
                    <Select
                      required
                      value={formData.rubro}
                      onValueChange={(value) => setFormData({...formData, rubro: value})}
                      disabled={submitCustomer.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t({ es: "Selecciona el tipo de servicio", en: "Select service type" })} />
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
                      {t({ es: "Servicio Específico", en: "Specific Service" })}
                    </label>
                    <Input
                      value={formData.service_type}
                      onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                      placeholder={t({ es: "Ej: Destapado de tuberías, instalación eléctrica...", en: "Ex: Pipe unclogging, electrical installation..." })}
                      disabled={submitCustomer.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      {t({ es: "Horario Preferido", en: "Preferred Time" })}
                    </label>
                    <Select
                      value={formData.preferred_time}
                      onValueChange={(value) => setFormData({...formData, preferred_time: value})}
                      disabled={submitCustomer.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t({ es: "Selecciona tu horario preferido", en: "Select your preferred time" })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mañana">{t({ es: "Mañana (8:00 AM - 12:00 PM)", en: "Morning (8:00 AM - 12:00 PM)" })}</SelectItem>
                        <SelectItem value="tarde">{t({ es: "Tarde (12:00 PM - 4:00 PM)", en: "Afternoon (12:00 PM - 4:00 PM)" })}</SelectItem>
                        <SelectItem value="vespertino">{t({ es: "Vespertino (4:00 PM - 6:00 PM)", en: "Evening (4:00 PM - 6:00 PM)" })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-proman-navy mb-2">
                      {t({ es: "Describe tu necesidad", en: "Describe your need" })}
                    </label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder={t({ es: "Cuéntanos los detalles de lo que necesitas...", en: "Tell us the details of what you need..." })}
                      rows={4}
                      disabled={submitCustomer.isPending}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold text-lg py-6"
                    disabled={submitCustomer.isPending}
                  >
                    {submitCustomer.isPending ? t({ es: "Enviando...", en: "Sending..." }) : t({ es: "Solicitar Servicio", en: "Request Service" })}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* How It Works Section */}
          <div className="space-y-6">
            <Card className="border-2 border-proman-yellow shadow-lg">
              <CardHeader className="bg-proman-yellow">
                <CardTitle className="text-2xl text-proman-navy">
                  {t({ es: "¿Cómo Funciona?", en: "How Does It Work?" })}
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
                        {t({ es: "Completa el Formulario", en: "Complete the Form" })}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {t({ es: "Llena todos los datos de tu solicitud. Mientras más detalles nos proporciones, mejor podremos prepararnos para atenderte.", en: "Fill in all your request details. The more details you provide, the better we can prepare to serve you." })}
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
                        {t({ es: "Te Contactamos", en: "We Contact You" })}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {t({ es: "Nuestro equipo de servicio al cliente te llamará para confirmar los detalles, aclarar dudas y entender mejor tu necesidad.", en: "Our customer service team will call you to confirm details, clarify doubts and better understand your needs." })}
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
                        {t({ es: "Agendamos tu Servicio", en: "We Schedule Your Service" })}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {t({ es: "Coordinamos fecha, hora y asignamos al técnico más adecuado para tu caso. Te enviaremos toda la información por WhatsApp.", en: "We coordinate date, time and assign the most suitable technician for your case. We will send you all the information via WhatsApp." })}
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
                        {t({ es: "Realizamos el Trabajo", en: "We Do the Work" })}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {t({ es: "Nuestro técnico llega puntual, realiza el servicio con profesionalismo y te mantiene informado del progreso en todo momento.", en: "Our technician arrives on time, performs the service professionally and keeps you informed of progress at all times." })}
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
                  {t({ es: "¿Prefieres Contactarnos Directamente?", en: "Prefer to Contact Us Directly?" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <a href="tel:60531213">
                  <Button variant="outline" className="w-full border-2 border-proman-navy text-proman-navy hover:bg-proman-navy hover:text-white text-lg py-6">
                    <Phone className="w-5 h-5 mr-2" />
                    {t({ es: "Llamar Ahora: 6053-1213", en: "Call Now: 6053-1213" })}
                  </Button>
                </a>
                
                <a 
                  href={`https://wa.me/50360531213?text=${encodeURIComponent(t({ es: "Hola, me interesa conocer más sobre los servicios de PROMAN", en: "Hello, I want to know more about PROMAN services" }))}`}
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
                    <strong>{t({ es: "Tiempo de respuesta:", en: "Response time:" })}</strong> {t({ es: "Menos de 2 horas en horario laboral", en: "Less than 2 hours during business hours" })}
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
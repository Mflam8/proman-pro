
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, UserCheck, Database, Mail } from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdated = "11 de enero de 2025";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="gradient-navy-yellow text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 hexagon bg-proman-yellow flex items-center justify-center">
              <Shield className="w-10 h-10 text-proman-navy" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            Política de Privacidad
          </h1>
          <p className="text-xl text-gray-200 text-center">
            En PROMAN Services, protegemos tu información personal con los más altos estándares de seguridad
          </p>
          <p className="text-sm text-gray-300 text-center mt-4">
            Última actualización: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Introduction */}
        <Card className="mb-6 border-2 border-proman-yellow">
          <CardContent className="p-6">
            <p className="text-gray-700 leading-relaxed mb-4">
              PROMAN Services, con domicilio en 17 Avenida norte #1721, Colonia Layco, San Salvador, El Salvador, 
              es responsable del tratamiento de los datos personales que nos proporciones a través de nuestro 
              sitio web y servicios.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos 
              tu información personal en cumplimiento con las mejores prácticas internacionales de protección de datos.
            </p>
          </CardContent>
        </Card>

        {/* Data Collection */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-3 text-proman-navy">
              <Database className="w-6 h-6 text-proman-yellow" />
              1. Información que Recopilamos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-proman-navy mb-2">1.1 Datos de Identificación Personal</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Nombre completo</li>
                <li>Números de teléfono (principal y secundario)</li>
                <li>Dirección de correo electrónico</li>
                <li>Dirección física y referencias de ubicación</li>
                <li>Departamento de residencia o trabajo</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-proman-navy mb-2">1.2 Datos de Servicios Contratados</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Tipo de servicio solicitado (fontanería, electricidad, construcción, etc.)</li>
                <li>Descripción detallada de la necesidad o problema</li>
                <li>Horarios preferidos para la prestación del servicio</li>
                <li>Historial de trabajos realizados</li>
                <li>Fotografías del antes y después de los trabajos (cuando aplique)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-proman-navy mb-2">1.3 Datos Comerciales</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Cotizaciones y presupuestos</li>
                <li>Montos de servicios contratados</li>
                <li>Estado de pagos y transacciones</li>
                <li>Calificaciones y comentarios sobre nuestros servicios</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-proman-navy mb-2">1.4 Datos Técnicos (Automáticos)</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Dirección IP</li>
                <li>Tipo de navegador y dispositivo</li>
                <li>Cookies de sesión y preferencias</li>
                <li>Páginas visitadas y tiempo de navegación</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Purpose */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-3 text-proman-navy">
              <FileText className="w-6 h-6 text-proman-yellow" />
              2. Finalidad del Tratamiento de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-gray-700">Utilizamos tu información personal para los siguientes propósitos:</p>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-proman-yellow font-bold">•</span>
                <p className="text-gray-700"><strong>Gestión de servicios:</strong> Coordinar, programar y ejecutar los servicios solicitados</p>
              </div>
              <div className="flex gap-2">
                <span className="text-proman-yellow font-bold">•</span>
                <p className="text-gray-700"><strong>Comunicación con clientes:</strong> Contactarte para confirmar citas, enviar actualizaciones del trabajo y resolver consultas</p>
              </div>
              <div className="flex gap-2">
                <span className="text-proman-yellow font-bold">•</span>
                <p className="text-gray-700"><strong>Administración de perfiles:</strong> Mantener un registro de clientes para facilitar servicios futuros y personalizar la atención</p>
              </div>
              <div className="flex gap-2">
                <span className="text-proman-yellow font-bold">•</span>
                <p className="text-gray-700"><strong>Seguimiento profesional:</strong> Documentar el progreso de trabajos, generar reportes de avance y mantener historial de servicios</p>
              </div>
              <div className="flex gap-2">
                <span className="text-proman-yellow font-bold">•</span>
                <p className="text-gray-700"><strong>Facturación y cobranza:</strong> Emitir cotizaciones, facturas y gestionar pagos</p>
              </div>
              <div className="flex gap-2">
                <span className="text-proman-yellow font-bold">•</span>
                <p className="text-gray-700"><strong>Mejora continua:</strong> Analizar calificaciones y comentarios para optimizar nuestros servicios</p>
              </div>
              <div className="flex gap-2">
                <span className="text-proman-yellow font-bold">•</span>
                <p className="text-gray-700"><strong>Cumplimiento legal:</strong> Mantener registros conforme a obligaciones fiscales y comerciales en El Salvador</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No Third Party Sharing */}
        <Card className="mb-6 border-2 border-green-500">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-3 text-proman-navy">
              <Lock className="w-6 h-6 text-green-600" />
              3. No Compartimos tu Información con Terceros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-green-100 border-l-4 border-green-600 p-4 rounded">
              <p className="font-semibold text-green-800 mb-2">
                ✓ Compromiso de Confidencialidad
              </p>
              <p className="text-gray-700">
                PROMAN Services <strong>NO vende, alquila ni comparte</strong> tu información personal con terceros 
                para fines comerciales, publicitarios o de marketing.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-proman-navy mb-2">Excepciones Limitadas</h3>
              <p className="text-gray-700 mb-2">
                Tu información solo podría ser compartida en las siguientes circunstancias excepcionales:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li><strong>Proveedores de servicios técnicos:</strong> Empresas que nos brindan servicios de hosting, almacenamiento en la nube y sistemas de gestión (con contratos de confidencialidad)</li>
                <li><strong>Obligación legal:</strong> Cuando sea requerido por autoridades competentes mediante orden judicial</li>
                <li><strong>Protección de derechos:</strong> Para hacer valer nuestros derechos legales o proteger la seguridad de nuestros empleados y clientes</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 italic">
              En todos los casos, garantizamos que cualquier tercero que acceda a tu información está 
              obligado a mantener la misma confidencialidad y protección que nosotros.
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-3 text-proman-navy">
              <Shield className="w-6 h-6 text-proman-yellow" />
              4. Seguridad de la Información
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-gray-700">
              Implementamos medidas de seguridad técnicas, administrativas y físicas para proteger 
              tu información personal contra acceso no autorizado, pérdida, alteración o divulgación:
            </p>
            
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li><strong>Encriptación:</strong> Utilizamos protocolos SSL/TLS para proteger la transmisión de datos</li>
              <li><strong>Control de acceso:</strong> Solo personal autorizado tiene acceso a información sensible</li>
              <li><strong>Respaldos regulares:</strong> Realizamos copias de seguridad periódicas de la información</li>
              <li><strong>Autenticación:</strong> Sistemas de login seguros con contraseñas encriptadas</li>
              <li><strong>Auditorías:</strong> Revisión periódica de nuestras medidas de seguridad</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-3 text-proman-navy">
              <Eye className="w-6 h-6 text-proman-yellow" />
              5. Retención de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-gray-700">
              Conservamos tu información personal durante el tiempo necesario para:
            </p>
            
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Cumplir con la finalidad para la cual fue recopilada</li>
              <li>Mantener un historial de servicios que facilite atenciones futuras</li>
              <li>Cumplir con obligaciones legales, fiscales y contables (mínimo 5 años según legislación salvadoreña)</li>
              <li>Resolver disputas o hacer valer derechos legales</li>
            </ul>

            <p className="text-gray-700 mt-3">
              Una vez que tu información ya no sea necesaria, procederemos a eliminarla de manera segura 
              o a anonimizarla para que no pueda ser identificada.
            </p>
          </CardContent>
        </Card>

        {/* User Rights */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-3 text-proman-navy">
              <UserCheck className="w-6 h-6 text-proman-yellow" />
              6. Tus Derechos como Titular de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-gray-700 mb-3">
              Tienes derecho a ejercer los siguientes derechos respecto a tu información personal:
            </p>
            
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded">
                <p className="font-semibold text-proman-navy">Acceso</p>
                <p className="text-sm text-gray-700">Conocer qué datos personales tenemos sobre ti</p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded">
                <p className="font-semibold text-proman-navy">Rectificación</p>
                <p className="text-sm text-gray-700">Solicitar la corrección de datos inexactos o incompletos</p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded">
                <p className="font-semibold text-proman-navy">Cancelación</p>
                <p className="text-sm text-gray-700">Solicitar la eliminación de tus datos cuando ya no sean necesarios</p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded">
                <p className="font-semibold text-proman-navy">Oposición</p>
                <p className="text-sm text-gray-700">Oponerte al tratamiento de tus datos para fines específicos</p>
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <p className="font-semibold text-proman-navy">Portabilidad</p>
                <p className="text-sm text-gray-700">Obtener una copia de tus datos en formato electrónico</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-proman-yellow bg-opacity-10 border-l-4 border-proman-yellow rounded">
              <p className="text-sm text-gray-700">
                <strong>Para ejercer cualquiera de estos derechos, contáctanos:</strong>
              </p>
              <ul className="text-sm text-gray-700 mt-2 space-y-1">
                <li>📞 Teléfono: 6053-1213</li>
                <li>📍 Dirección: Urbanización Elisa, 17 Avenida Norte #1721, San Salvador, San Salvador</li>
              </ul>
              <p className="text-xs text-gray-600 mt-2 italic">
                Responderemos a tu solicitud en un plazo máximo de 15 días hábiles.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cookies */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-3 text-proman-navy">
              <FileText className="w-6 h-6 text-proman-yellow" />
              7. Uso de Cookies y Tecnologías Similares
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-gray-700">
              Nuestro sitio web utiliza cookies y tecnologías similares para:
            </p>
            
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Mantener tu sesión activa cuando inicias sesión</li>
              <li>Recordar tus preferencias de navegación</li>
              <li>Mejorar la funcionalidad del sitio web</li>
              <li>Analizar el tráfico y uso del sitio (de forma anónima)</li>
            </ul>

            <p className="text-gray-700 mt-3">
              Puedes configurar tu navegador para rechazar cookies, aunque esto podría afectar 
              la funcionalidad de algunas características del sitio.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Policy */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-3 text-proman-navy">
              <Mail className="w-6 h-6 text-proman-yellow" />
              8. Cambios a esta Política de Privacidad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-gray-700">
              Nos reservamos el derecho de actualizar esta Política de Privacidad periódicamente 
              para reflejar cambios en nuestras prácticas o en la legislación aplicable.
            </p>
            
            <p className="text-gray-700">
              Cualquier cambio será publicado en esta página con la fecha de "Última actualización" 
              modificada. Te recomendamos revisar esta política periódicamente.
            </p>

            <p className="text-gray-700">
              Si realizamos cambios significativos, te notificaremos por correo electrónico o 
              mediante un aviso destacado en nuestro sitio web.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-2 border-proman-yellow">
          <CardHeader className="bg-proman-yellow">
            <CardTitle className="text-proman-navy">
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-700 mb-4">
              Si tienes preguntas, comentarios o inquietudes sobre esta Política de Privacidad 
              o sobre el tratamiento de tus datos personales, no dudes en contactarnos:
            </p>
            
            <div className="space-y-2 text-gray-700">
              <p><strong>PROMAN Services</strong></p>
              <p>📍 Urbanización Elisa, 17 Avenida Norte #1721, San Salvador, San Salvador</p>
              <p>📞 Teléfono: 6053-1213</p>
              <p>🕒 Horario de atención: Lunes a Sábado, 7:00 AM - 6:00 PM</p>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                Al utilizar nuestro sitio web y servicios, aceptas los términos establecidos en esta 
                Política de Privacidad. Si no estás de acuerdo con estos términos, te solicitamos 
                que no utilices nuestros servicios.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Last Updated Notice */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Última actualización: {lastUpdated}</p>
          <p className="mt-2">© 2024 PROMAN Services. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}

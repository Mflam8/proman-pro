import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Database, ClipboardList, Cpu, Lock, Archive, UserCheck, MessageSquare, Cookie, RefreshCw, Mail, CheckCircle2 } from "lucide-react";

const sections = [
  {
    id: "01",
    title: "Información que recopilamos",
    icon: Database,
    intro: "Podemos recopilar información necesaria para atender solicitudes, cotizar, coordinar, ejecutar y dar seguimiento a nuestros servicios.",
    blocks: [
      {
        title: "1.1 Datos de identificación y contacto",
        items: [
          "Nombre completo o nombre proporcionado por el cliente.",
          "Número de teléfono.",
          "Dirección de correo electrónico.",
          "Dirección física, referencias de ubicación o zona del servicio.",
          "Datos de contacto de personas autorizadas para recibir al técnico o coordinar el servicio."
        ]
      },
      {
        title: "1.2 Datos relacionados con servicios",
        items: [
          "Tipo de servicio solicitado.",
          "Descripción del problema, necesidad o trabajo requerido.",
          "Fotografías, audios, videos, documentos, ubicaciones, referencias o mensajes enviados voluntariamente por el cliente para explicar su solicitud.",
          "Fechas y horarios preferidos para visitas técnicas o trabajos.",
          "Historial de cotizaciones, visitas, trabajos realizados, reclamos, garantías o seguimientos."
        ]
      },
      {
        title: "1.3 Datos comerciales y administrativos",
        items: [
          "Cotizaciones, presupuestos y montos de servicios.",
          "Estado de pagos, comprobantes, referencias o información necesaria para facturación y cobranza.",
          "Comentarios, calificaciones o retroalimentación del cliente.",
          "Registros necesarios para obligaciones comerciales, fiscales, contables o legales."
        ]
      },
      {
        title: "1.4 Datos técnicos y de uso",
        items: [
          "Dirección IP.",
          "Tipo de navegador, dispositivo y sistema operativo.",
          "Cookies, preferencias de navegación y datos de sesión.",
          "Páginas visitadas, interacciones y datos generales de uso del sitio."
        ],
        note: "Estos datos se utilizan para operar, proteger, medir y mejorar nuestros canales digitales."
      }
    ]
  },
  {
    id: "02",
    title: "Finalidad del tratamiento de datos",
    icon: ClipboardList,
    intro: "Usamos la información personal para fines relacionados con la prestación de nuestros servicios, incluyendo:",
    items: [
      "Responder consultas y solicitudes de información.",
      "Entender la necesidad del cliente y clasificar el servicio solicitado.",
      "Preparar cotizaciones o presupuestos.",
      "Coordinar visitas técnicas, agenda, horarios, direcciones y contactos.",
      "Ejecutar servicios y dar seguimiento al avance del trabajo.",
      "Registrar historial de atención para mantener continuidad en futuras comunicaciones.",
      "Gestionar pagos, comprobantes, facturación y cobranza.",
      "Atender reclamos, garantías, incidencias o solicitudes posteriores al servicio.",
      "Mejorar nuestros procesos de atención, calidad y respuesta.",
      "Cumplir obligaciones legales, fiscales, contables o administrativas aplicables."
    ],
    note: "Los datos pueden provenir de distintos canales, pero PROMAN Services aplica las mismas reglas de manejo, seguridad y confidencialidad independientemente del canal por el cual hayan sido recibidos."
  },
  {
    id: "03",
    title: "Uso de herramientas automatizadas",
    icon: Cpu,
    paragraphs: [
      "PROMAN Services puede utilizar herramientas digitales, automatizaciones o sistemas de apoyo para organizar conversaciones, resumir solicitudes, transcribir audios, identificar datos operativos relevantes y mantener un registro ordenado del cliente y del servicio solicitado.",
      "Estas herramientas se usan para ayudar al equipo administrativo y técnico a entender mejor la conversación, dar seguimiento, reducir errores, mejorar tiempos de respuesta y mantener continuidad en la atención.",
      "PROMAN Services no utiliza estas herramientas para vender datos personales, tomar decisiones ajenas al servicio solicitado, discriminar personas ni realizar actividades de vigilancia."
    ]
  },
  {
    id: "04",
    title: "Compartir información con terceros",
    icon: Lock,
    highlight: "PROMAN Services no vende, alquila ni comercializa datos personales de clientes.",
    paragraphs: [
      "La información personal no se comparte con terceros para fines publicitarios externos, venta de bases de datos o usos ajenos a la prestación del servicio.",
      "Podemos compartir información únicamente cuando sea necesario para operar, administrar, proteger o cumplir el servicio solicitado, por ejemplo:"
    ],
    items: [
      "con personal administrativo o técnico autorizado;",
      "con proveedores de infraestructura, comunicación, almacenamiento, automatización, análisis, soporte técnico o herramientas digitales necesarias para operar el servicio;",
      "cuando sea requerido por una obligación legal, fiscal, contable, administrativa o por autoridad competente;",
      "cuando sea necesario para proteger derechos, seguridad o intereses legítimos de PROMAN Services, sus clientes o colaboradores."
    ],
    note: "En todos los casos, PROMAN Services procura limitar la información compartida a lo necesario y mantener controles razonables de confidencialidad, acceso y seguridad."
  },
  {
    id: "05",
    title: "Seguridad de la información",
    icon: Shield,
    paragraphs: [
      "Implementamos medidas técnicas, administrativas y organizativas razonables para proteger la información contra acceso no autorizado, pérdida, alteración, uso indebido o divulgación no autorizada.",
      "Estas medidas pueden incluir:"
    ],
    items: [
      "controles de acceso para personal autorizado;",
      "protección de cuentas y credenciales;",
      "almacenamiento en sistemas con medidas de seguridad;",
      "respaldos o registros operativos cuando sean necesarios;",
      "revisión de accesos y prácticas internas;",
      "manejo cuidadoso de información sensible como direcciones, comprobantes, ubicaciones y conversaciones."
    ],
    note: "Ningún sistema digital es absolutamente infalible, pero PROMAN Services trabaja para mantener prácticas razonables y proporcionales al tipo de información tratada."
  },
  {
    id: "06",
    title: "Retención y eliminación de datos",
    icon: Archive,
    paragraphs: [
      "Conservamos la información personal durante el tiempo necesario para cumplir las finalidades para las que fue recopilada, mantener historial de servicios, atender seguimientos, resolver reclamos, cumplir obligaciones legales o proteger derechos comerciales y administrativos.",
      "De forma general:"
    ],
    items: [
      "Las conversaciones, solicitudes y datos operativos se conservan mientras sean necesarios para prestar el servicio, mantener continuidad, atender garantías, reclamos o relación comercial.",
      "Los registros de pagos, facturación, comprobantes y documentos administrativos pueden conservarse durante el plazo requerido por obligaciones fiscales, contables o legales aplicables.",
      "Audios, imágenes, videos, ubicaciones o documentos enviados por el cliente se conservan cuando sean necesarios como evidencia del servicio, cotización, reclamo, pago o cumplimiento legal."
    ],
    note: "Cuando la información ya no sea necesaria, PROMAN Services podrá eliminarla, anonimizarla o conservarla de forma agregada sin identificar directamente al cliente."
  },
  {
    id: "07",
    title: "Derechos del titular de datos",
    icon: UserCheck,
    intro: "El cliente o titular de datos puede solicitar:",
    items: [
      "acceso a la información personal que PROMAN Services conserva;",
      "corrección de datos inexactos o incompletos;",
      "eliminación de datos cuando ya no sean necesarios o cuando corresponda legalmente;",
      "oposición al tratamiento para fines no esenciales;",
      "información sobre el uso general de sus datos."
    ],
    paragraphs: [
      "Para ejercer estos derechos, el titular puede contactar a PROMAN Services por los canales oficiales de atención:",
      "PROMAN Services responderá en un plazo razonable, y cuando sea posible dentro de 15 días hábiles. Algunas solicitudes pueden estar limitadas cuando exista una obligación legal, fiscal, contractual o administrativa de conservar ciertos registros."
    ],
    contactList: [
      "Teléfono: 6053-1213",
      "Dirección: Urbanización Elisa, 17 Avenida Norte #1721, San Salvador, El Salvador",
      "Correo de contacto: admin@proman.services"
    ]
  },
  {
    id: "08",
    title: "Comunicaciones y mensajes",
    icon: MessageSquare,
    paragraphs: [
      "PROMAN Services puede comunicarse con clientes para responder solicitudes, confirmar citas, coordinar visitas, enviar información del servicio, dar seguimiento a cotizaciones, atender pagos, resolver reclamos o mantener continuidad de la relación comercial.",
      "El cliente puede solicitar dejar de recibir comunicaciones no esenciales o promocionales. Las comunicaciones necesarias para ejecutar o dar seguimiento a un servicio activo pueden continuar mientras sean razonablemente necesarias."
    ]
  },
  {
    id: "09",
    title: "Cookies y tecnologías similares",
    icon: Cookie,
    intro: "Nuestro sitio web puede utilizar cookies y tecnologías similares para:",
    items: [
      "mantener sesiones activas;",
      "recordar preferencias;",
      "mejorar funcionalidad;",
      "analizar tráfico y uso del sitio;",
      "proteger y optimizar nuestros canales digitales."
    ],
    note: "El usuario puede configurar su navegador para rechazar cookies, aunque esto podría afectar algunas funciones del sitio."
  },
  {
    id: "10",
    title: "Cambios a esta política",
    icon: RefreshCw,
    paragraphs: [
      "PROMAN Services puede actualizar esta Política de Privacidad para reflejar cambios en sus servicios, canales de atención, herramientas, procesos internos o requisitos legales.",
      "La versión actualizada se publicará en esta página con su fecha de última actualización. Recomendamos revisar esta política periódicamente."
    ]
  },
  {
    id: "11",
    title: "Contacto",
    icon: Mail,
    paragraphs: [
      "Si tienes preguntas sobre esta Política de Privacidad o sobre el tratamiento de tus datos personales, puedes contactar a PROMAN Services:"
    ],
    contactList: [
      "PROMAN Services",
      "Urbanización Elisa, 17 Avenida Norte #1721, San Salvador, El Salvador",
      "Teléfono: 6053-1213",
      "Horario de atención: lunes a sábado, 7:00 a.m. a 6:00 p.m.",
      "Correo de contacto: admin@proman.services"
    ],
    note: "Al utilizar nuestros canales de atención, sitio web o servicios, reconoces que tu información será tratada conforme a esta Política de Privacidad."
  }
];

function BulletList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-gray-700 leading-relaxed">
          <CheckCircle2 className="w-5 h-5 mt-0.5 text-proman-yellow flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicy() {
  const lastUpdated = "septiembre de 2026";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="gradient-navy-yellow text-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-proman-yellow shadow-xl">
            <Shield className="w-10 h-10 text-proman-navy" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Política de Privacidad</h1>
          <p className="mt-4 text-lg md:text-xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
            Transparencia, confidencialidad y manejo responsable de la información en cada canal de atención de PROMAN Services.
          </p>
          <div className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-slate-100 backdrop-blur-sm">
            Última actualización propuesta: {lastUpdated}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-6">
        <Card className="border-2 border-proman-yellow shadow-xl">
          <CardContent className="p-6 md:p-8 space-y-4">
            <p className="text-gray-700 leading-8">
              <strong className="text-proman-navy">PROMAN Services</strong>, con domicilio en Urbanización Elisa, 17 Avenida Norte #1721, San Salvador, El Salvador, es responsable del tratamiento de los datos personales que los clientes, prospectos, proveedores o usuarios nos proporcionen a través de nuestros canales de atención, sitio web, formularios, llamadas, mensajes, redes sociales, aplicaciones, herramientas digitales o cualquier otro medio de contacto habilitado por PROMAN Services.
            </p>
            <p className="text-gray-700 leading-8">
              Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos, protegemos y, cuando corresponde, eliminamos o anonimizamos la información personal relacionada con nuestros servicios.
            </p>
          </CardContent>
        </Card>

        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id} className="overflow-hidden border border-slate-200 shadow-lg">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-start gap-4 text-proman-navy">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-proman-yellow/15 border border-proman-yellow/30 flex-shrink-0">
                    <Icon className="w-6 h-6 text-proman-navy" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-1">Sección {section.id}</p>
                    <h2 className="text-2xl font-bold leading-tight">{section.title}</h2>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-5">
                {section.highlight && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 font-semibold leading-relaxed">
                    {section.highlight}
                  </div>
                )}

                {section.intro && <p className="text-gray-700 leading-8">{section.intro}</p>}

                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="text-gray-700 leading-8">{paragraph}</p>
                ))}

                {section.blocks?.map((block) => (
                  <div key={block.title} className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                    <h3 className="text-lg font-semibold text-proman-navy">{block.title}</h3>
                    <BulletList items={block.items} />
                    {block.note && <p className="text-sm text-slate-600 leading-7">{block.note}</p>}
                  </div>
                ))}

                {section.items && !section.blocks && <BulletList items={section.items} />}

                {section.contactList && (
                  <div className="rounded-2xl border border-proman-yellow/40 bg-amber-50 px-5 py-5">
                    <div className="space-y-2 text-gray-700">
                      {section.contactList.map((item) => (
                        <p key={item} className="leading-7">{item}</p>
                      ))}
                    </div>
                  </div>
                )}

                {section.note && <p className="text-sm text-slate-600 leading-7">{section.note}</p>}
              </CardContent>
            </Card>
          );
        })}

        <div className="text-center pt-2 text-sm text-slate-500">
          <p>Última actualización propuesta: {lastUpdated}</p>
          <p className="mt-2">© 2026 PROMAN Services. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
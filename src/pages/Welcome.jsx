import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users, Briefcase, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const getDisplayName = (user) => user?.employee_name || user?.full_name || 'Usuario';

export default function Welcome() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.onboarding_completed) {
          redirectToPortal(currentUser.role, currentUser.employee_type);
        }
      } catch (error) {
        console.error("Error loading user", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const redirectToPortal = (role, employeeType) => {
    if (role === 'admin' || employeeType === 'Supervisor') {
      navigate(createPageUrl("ClientManagement"));
    } else {
      navigate(createPageUrl("EmployeeDashboard"));
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await base44.auth.updateMe({ onboarding_completed: true });
      redirectToPortal(user.role, user.employee_type);
    } catch (error) {
      console.error("Error completing onboarding", error);
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proman-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Error al cargar usuario</p>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const employeeType = user.employee_type || (isAdmin ? 'Admin' : 'Empleado');
  const displayName = getDisplayName(user);

  const roleInfo = {
    'Admin': {
      title: 'Administrador',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Tendrás acceso completo al sistema de gestión',
      features: [
        'Gestión completa de trabajos y empleados',
        'Asignación y programación de servicios',
        'Control de inventario y equipos',
        'Gestión de clientes y cotizaciones',
        'Reportes y análisis del negocio'
      ]
    },
    'Supervisor': {
      title: 'Supervisor / Secretaria',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Coordinarás el trabajo de los técnicos y gestionarás clientes',
      features: [
        'Ver todos los clientes nuevos (automáticos y manuales)',
        'Crear y editar trabajos para técnicos',
        'Gestionar información de clientes',
        'Ver horarios y disponibilidad de técnicos',
        'Asignar técnicos a trabajos según disponibilidad',
        'Seguimiento de progreso de trabajos'
      ]
    },
    'Empleado': {
      title: 'Técnico',
      icon: Briefcase,
      bgColor: 'bg-blue-100',
      color: 'text-blue-600',
      description: 'Verás tus servicios asignados y podrás registrar tu avance en campo',
      features: [
        'Ver tus trabajos asignados',
        'Abrir la orden con dirección, contacto y servicio',
        'Registrar horas de entrada, salida y horas extra',
        'Guardar el avance y notas del trabajo',
        'Actualizar tu disponibilidad semanal'
      ]
    }
  };

  const info = roleInfo[employeeType] || roleInfo['Empleado'];
  const IconComponent = info.icon;

  const getFirstSteps = () => {
    if (employeeType === 'Supervisor') {
      return [
        'Familiarízate con el panel de control',
        'Revisa los clientes nuevos en la pestaña de Clientes',
        'Verifica la disponibilidad de técnicos',
        'Asigna trabajos según prioridad'
      ];
    } else if (employeeType === 'Empleado') {
      return [
        'Familiarízate con tu portal de empleado',
        'Revisa la pestaña Mis Trabajos',
        'Abre una orden asignada para ver los detalles del servicio',
        'Registra tu entrada o salida cuando corresponda'
      ];
    } else {
      return [
        'Familiarízate con el panel de control',
        'Configura los empleados y supervisores',
        'Revisa las integraciones activas',
        'Gestiona el inventario de equipos'
      ];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="gradient-navy-yellow text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68ef020757cff60f209415e9/1ab38f408_21558763_235265087000605_2527538411050239409_n-Editado.png"
              alt="PROMAN Services"
              className="h-16 mx-auto"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-proman-navy">
            ¡Bienvenido a PROMAN Pro! 🎉
          </h1>
          <p className="text-xl text-proman-navy">
            Estamos emocionados de tenerte en el equipo
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border-2 border-proman-yellow mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
              <img
                src={user.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=fdc80c&color=252a5c&size=128`}
                alt={displayName}
                className="w-24 h-24 rounded-full border-4 border-proman-yellow object-cover"
              />
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-proman-navy mb-2">
                  {displayName}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <div className={`w-12 h-12 hexagon ${info.bgColor} flex items-center justify-center`}>
                    <IconComponent className={`w-6 h-6 ${info.color}`} />
                  </div>
                  <span className="text-xl font-semibold text-gray-700">{info.title}</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Calendar className="w-4 h-4 text-proman-yellow" />
                  <span className="text-sm font-medium">Fecha de Ingreso</span>
                </div>
                <p className="text-lg font-bold text-proman-navy">
                  {user.hire_date 
                    ? format(new Date(user.hire_date), "d 'de' MMMM, yyyy", { locale: es })
                    : "Pendiente de configurar"
                  }
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Users className="w-4 h-4 text-proman-yellow" />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <p className="text-lg font-bold text-proman-navy break-all">
                  {user.email}
                </p>
              </div>
            </div>

            {!user.profile_picture_url && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  📸 <strong>Nota:</strong> Tu administrador subirá tu foto oficial con uniforme de PROMAN próximamente.
                </p>
              </div>
            )}

            <div className="border-t pt-6">
              <p className="text-gray-600 mb-4">{info.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-proman-yellow" />
              Tu Rol en PROMAN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Como <strong>{info.title}</strong>, tendrás acceso a:
            </p>
            <ul className="space-y-3 mb-6">
              {info.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 hexagon bg-proman-yellow flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-proman-navy" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-proman-navy mb-2">📱 Primeros Pasos:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                {getFirstSteps().map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>

            <Button 
              onClick={handleComplete}
              className="w-full bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold text-lg py-6"
              disabled={isCompleting}
            >
              {isCompleting ? "Cargando..." : "Comenzar a Trabajar →"}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>¿Necesitas ayuda? Contacta a tu administrador</p>
        </div>
      </div>
    </div>
  );
}
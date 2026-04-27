import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Phone, Menu, X, Users, Briefcase, Facebook, Instagram, Youtube, LogIn, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { LanguageProvider, useLanguage } from "@/components/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import WhatsAppMascot from "@/components/WhatsAppMascot";
import MobileStickyCTA from "@/components/MobileStickyCTA";

// Helper function to get display name
const getDisplayName = (user) => user?.employee_name || user?.full_name || 'Usuario';

function LayoutContent({ children }) {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = React.useState(true);
  
  // Check if we're on management page
  const isManagementPage = location.pathname === createPageUrl("ClientManagement");

  React.useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Si el usuario no ha completado onboarding y no está en la página de bienvenida
        if (currentUser && !currentUser.onboarding_completed && location.pathname !== createPageUrl("Welcome")) {
          navigate(createPageUrl("Welcome"));
        }
      } catch (error) {
        setUser(null);
      } finally {
        setCheckingOnboarding(false);
      }
    };
    checkUser();
  }, [location.pathname, navigate]);

  // Mostrar loading mientras verifica onboarding
  if (checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proman-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si está en página de bienvenida, mostrar sin layout
  if (location.pathname === createPageUrl("Welcome")) {
    return children;
  }

  const navigation = [
    { name: t({ es: "Inicio", en: "Home" }), href: createPageUrl("Home") },
    { name: t({ es: "Servicios", en: "Services" }), href: createPageUrl("Services") },
    { name: t({ es: "Galería", en: "Gallery" }), href: createPageUrl("Gallery") },
    { name: t({ es: "Empleos", en: "Careers" }), href: createPageUrl("Careers") },
    { name: t({ es: "Contacto", en: "Contact" }), href: createPageUrl("Contact") }
  ];

  // Add portal link if user is logged in
  if (user) {
    const isAdmin = user.role === 'admin';
    const isSupervisor = user.employee_type === 'Supervisor';
    
    // Admin y Supervisor van a Gestión, Empleado va a Portal
    if (isAdmin || isSupervisor) {
      navigation.push({ 
        name: "Gestión", 
        href: createPageUrl("ClientManagement"),
        icon: Users 
      });
      navigation.push({
        name: t({ es: "Mensajes", en: "Messages" }),
        href: createPageUrl("MessageCenter"),
        icon: MessageCircle
      });
    } else {
      navigation.push({ 
        name: t({ es: "Mi Portal", en: "My Portal" }), 
        href: createPageUrl("EmployeeDashboard"),
        icon: Briefcase 
      });
    }
  }

  const isActive = (href) => location.pathname === href;

  const whatsappNumber = "50360531213";
  const whatsappMessage = "Hola, me interesa conocer más sobre los servicios de PROMAN";

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.pathname);
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    navigate(createPageUrl("Home"));
  };

  const displayName = getDisplayName(user);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        :root {
          --proman-navy: #252a5c;
          --proman-yellow: #fdc80c;
        }
        .gradient-navy-yellow {
          background: linear-gradient(135deg, #252a5c 0%, #3d4488 100%);
        }
        .text-proman-navy { color: #252a5c; }
        .text-proman-yellow { color: #fdc80c; }
        .bg-proman-navy { background-color: #252a5c; }
        .bg-proman-yellow { background-color: #fdc80c; }
        .border-proman-yellow { border-color: #fdc80c; }
        .hexagon {
          clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
        }
        .diagonal-separator {
          height: 12px;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 60%);
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center" aria-label="Ir a página de inicio">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68ef020757cff60f209415e9/1ab38f408_21558763_235265087000605_2527538411050239409_n-Editado.png"
                alt="Logo PROMAN Services - Fontanería y Construcción"
                width="120"
                height="48"
                loading="eager"
                className="h-12 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-semibold transition-colors flex items-center gap-2 px-4 py-2 rounded-full ${
                    isActive(item.href)
                      ? "bg-proman-yellow text-proman-navy shadow"
                      : "text-proman-navy hover:bg-proman-navy/5"
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              {!isManagementPage && <LanguageSelector />}
              <a href="tel:60531213" aria-label="Llamar a PROMAN Services al 6053-1213">
                <Button variant="outline" className="rounded-full px-5 border-2 border-proman-navy text-proman-navy hover:bg-proman-navy hover:text-white shadow-md">
                  <Phone className="w-4 h-4 mr-2" aria-hidden="true" />
                  6053-1213
                </Button>
              </a>
              <a 
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contactar por WhatsApp"
              >
                <Button className="bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold rounded-full px-5 shadow-lg">
                  WhatsApp
                </Button>
              </a>
              
              {/* Login/Logout Button */}
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <img 
                      src={user.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=fdc80c&color=252a5c&size=32`}
                      alt={displayName}
                      className="w-8 h-8 rounded-full border-2 border-proman-yellow"
                    />
                    <span className="text-sm font-medium text-proman-navy">{displayName}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-proman-navy"
                  >
                    Salir
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleLogin}
                  className="bg-proman-navy text-white hover:bg-opacity-90 rounded-full shadow-md"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Iniciar Sesión
                </Button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-proman-navy hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-4 py-2 rounded-full text-base font-medium flex items-center gap-2 ${
                    isActive(item.href)
                      ? "bg-proman-yellow text-proman-navy"
                      : "text-proman-navy hover:bg-gray-100"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.name}
                </Link>
              ))}
              
              {/* User Section Mobile */}
              {user ? (
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                    <img 
                      src={user.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=fdc80c&color=252a5c&size=32`}
                      alt={displayName}
                      className="w-10 h-10 rounded-full border-2 border-proman-yellow"
                    />
                    <div>
                      <p className="font-semibold text-proman-navy">{displayName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleLogout}
                  >
                    {t({ es: "Cerrar Sesión", en: "Logout" })}
                  </Button>
                </div>
              ) : (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleLogin}
                    className="w-full bg-proman-navy text-white hover:bg-opacity-90"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {t({ es: "Iniciar Sesión", en: "Login" })}
                  </Button>
                </div>
              )}

              <div className="pt-4 space-y-2 border-t">
                {!isManagementPage && (
                  <div className="pb-2">
                    <LanguageSelector />
                  </div>
                )}
                <a href="tel:60531213" className="block">
                  <Button variant="outline" className="w-full border-2 border-proman-navy text-proman-navy">
                    <Phone className="w-4 h-4 mr-2" />
                    {t({ es: "Llamar: 6053-1213", en: "Call: 6053-1213" })}
                  </Button>
                </a>
                <a 
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-proman-yellow text-proman-navy hover:opacity-90 font-semibold rounded-full">
                    {t({ es: "Contactar por WhatsApp", en: "Contact via WhatsApp" })}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="diagonal-separator gradient-navy-yellow"></div>
      <main>{children}</main>
      <MobileStickyCTA />

      {/* Footer */}
      <footer className="gradient-navy-yellow text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-semibold mb-4 text-proman-yellow">PROMAN Services</h3>
                <p className="text-sm text-gray-300 mb-4">
                  {t({ 
                    es: "Generando soluciones en tu ambiente de trabajo.",
                    en: "Generating solutions in your work environment."
                  })}
                </p>
              <div className="flex space-x-4">
                <a 
                  href="https://www.facebook.com/profile.php?id=100028099016956" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-proman-yellow transition-colors"
                  aria-label="Visitar página de Facebook de PROMAN Services"
                >
                  <Facebook className="w-6 h-6" aria-hidden="true" />
                </a>
                <a 
                  href="https://www.instagram.com/proman_services/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-proman-yellow transition-colors"
                  aria-label="Visitar Instagram de PROMAN Services"
                >
                  <Instagram className="w-6 h-6" aria-hidden="true" />
                </a>
                <a 
                  href="https://www.youtube.com/@promanservices" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-proman-yellow transition-colors"
                  aria-label="Visitar canal de YouTube de PROMAN Services"
                >
                  <Youtube className="w-6 h-6" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-proman-yellow">{t({ es: "Contacto", en: "Contact" })}</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-proman-yellow flex-shrink-0" />
                  <span>{t({ es: "Teléfono: 6053-1213", en: "Phone: 6053-1213" })}</span>
                </li>
                <li>
                  <a 
                    href="https://www.google.com/maps?q=13.715468,-89.198499"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 hover:text-proman-yellow transition-colors group"
                  >
                    <MapPin className="w-4 h-4 text-proman-yellow flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      Urbanización Elisa<br />
                      17 Avenida Norte #1721<br />
                      San Salvador, San Salvador
                    </span>
                  </a>
                </li>
                <li className="pt-2">
                  <a 
                    href="https://www.google.com/maps?q=13.715468,-89.198499"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-proman-yellow hover:underline text-xs"
                  >
                    <MapPin className="w-3 h-3" />
                    {t({ es: "Ver en Google Maps", en: "View on Google Maps" })}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-proman-yellow">{t({ es: "Servicios", en: "Services" })}</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>{t({ es: "Fontanería", en: "Plumbing" })}</li>
                <li>{t({ es: "Electricidad", en: "Electrical" })}</li>
                <li>{t({ es: "Remodelaciones", en: "Remodeling" })}</li>
                <li>{t({ es: "Construcción", en: "Construction" })}</li>
                <li>{t({ es: "Pintura", en: "Painting" })}</li>
                <li>{t({ es: "Mantenimiento", en: "Maintenance" })}</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-600 mt-8 pt-8 text-center text-sm text-gray-300">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
              <Link to={createPageUrl("PrivacyPolicy")} className="hover:text-proman-yellow transition-colors">
                {t({ es: "Política de Privacidad", en: "Privacy Policy" })}
              </Link>
            </div>
            <p>&copy; 2024 PROMAN Services. {t({ es: "Todos los derechos reservados.", en: "All rights reserved." })}</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Assistant */}
      <WhatsAppMascot 
        phoneNumber={whatsappNumber} 
        message={whatsappMessage}
        mascotUrl="https://media.base44.com/images/public/68ef04efb2facc1f9d963736/c0e5e5f69_Gemini_Generated_Image_w55grvw55grvw55g.png"
        bubbleText="¡Hablemos!"
        hideBubble
      />
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <LanguageProvider>
      <LayoutContent>{children}</LayoutContent>
    </LanguageProvider>
  );
}
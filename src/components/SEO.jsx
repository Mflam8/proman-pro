import { useEffect } from 'react';

export default function SEO({ 
  title, 
  description, 
  keywords,
  image = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68ef020757cff60f209415e9/1ab38f408_21558763_235265087000605_2527538411050239409_n-Editado.png",
  type = "website",
  structuredData = null
}) {
  useEffect(() => {
    // Set page title
    document.title = title;

    // Helper function to set or update meta tags
    const setMetaTag = (name, content, property = false) => {
      if (!content) return;
      
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Basic meta tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    setMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
    setMetaTag('theme-color', '#252a5c');

    // Open Graph tags
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', image, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:url', window.location.href, true);
    setMetaTag('og:site_name', 'PROMAN Services', true);
    setMetaTag('og:locale', 'es_SV', true);

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);

    // Performance hints
    const preconnectLinks = [
      'https://qtrypzzcjebvfcihiynt.supabase.co',
      'https://fonts.googleapis.com',
      'https://ui-avatars.com'
    ];

    preconnectLinks.forEach(href => {
      let link = document.querySelector(`link[rel="preconnect"][href="${href}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });

    // Structured Data (JSON-LD)
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    // Cleanup function
    return () => {
      // Remove structured data when component unmounts
      const script = document.querySelector('script[type="application/ld+json"]');
      if (script) {
        script.remove();
      }
    };
  }, [title, description, keywords, image, type, structuredData]);

  return null;
}

// Helper function to create LocalBusiness structured data
export const createLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "PROMAN Services",
  "description": "Empresa salvadoreña especializada en fontanería, electricidad, construcción, remodelaciones y mantenimiento. Servicio profesional 24/7 en San Salvador y La Libertad.",
  "image": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68ef020757cff60f209415e9/1ab38f408_21558763_235265087000605_2527538411050239409_n-Editado.png",
  "telephone": "+503-6053-1213",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "17 Avenida norte #1721, Colonia Layco",
    "addressLocality": "San Salvador",
    "addressCountry": "SV"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "13.715468",
    "longitude": "-89.198499"
  },
  "url": window.location.origin,
  "priceRange": "$$",
  "openingHours": "Mo-Sa 07:00-18:00",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      "opens": "07:00",
      "closes": "18:00"
    }
  ],
  "areaServed": [
    {
      "@type": "City",
      "name": "San Salvador"
    },
    {
      "@type": "State",
      "name": "La Libertad"
    }
  ],
  "serviceType": [
    "Fontanería",
    "Plomería",
    "Electricidad",
    "Construcción",
    "Remodelación",
    "Pintura",
    "Mantenimiento",
    "Destapado de tuberías",
    "Instalaciones eléctricas",
    "Reparaciones de emergencia"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Servicios de PROMAN",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Fontanería y Plomería",
          "description": "Destapado de tuberías, instalación y reparación de sistemas sanitarios"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Electricidad",
          "description": "Instalaciones eléctricas residenciales y comerciales"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Construcción y Remodelación",
          "description": "Proyectos de construcción y remodelación profesional"
        }
      }
    ]
  }
});

// Service-specific schema
export const createServiceSchema = (serviceName, description) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": serviceName,
  "provider": {
    "@type": "LocalBusiness",
    "name": "PROMAN Services",
    "telephone": "+503-6053-1213"
  },
  "areaServed": {
    "@type": "State",
    "name": "San Salvador, La Libertad"
  },
  "description": description
});
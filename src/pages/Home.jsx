import React from "react";
import SEO, { createLocalBusinessSchema } from "../components/SEO";
import HeroSection from "../components/home/HeroSection";
import ServicesCarousel from "../components/home/ServicesCarousel";
import TrustIndicators from "../components/home/TrustIndicators";
import PhotoGalleryPreview from "../components/home/PhotoGalleryPreview";
import CompanyShowcase from "../components/home/CompanyShowcase";
import ServicesPreview from "../components/home/ServicesPreview";
import WhyChooseUs from "../components/home/WhyChooseUs";
import ReviewsSection from "../components/home/ReviewsSection";
import CTASection from "../components/home/CTASection";

export default function Home() {
  return (
    <div>
      <SEO 
        title="PROMAN Services | Fontanería, Electricidad y Construcción en San Salvador"
        description="Expertos en fontanería, plomería, electricidad, construcción y remodelaciones en El Salvador. Servicio profesional 24/7 en San Salvador y La Libertad. Destapado de tuberías sin romper paredes. ¡Llámanos al 6053-1213!"
        keywords="fontanería San Salvador, plomería El Salvador, electricista San Salvador, construcción El Salvador, remodelaciones, destapado de tuberías, instalaciones eléctricas, mantenimiento, reparaciones, PROMAN Services, fontanero urgente, plomero 24 horas, electricidad comercial, pintura profesional"
        structuredData={createLocalBusinessSchema()}
      />
      <HeroSection />
      <ServicesCarousel />
      <TrustIndicators />
      <PhotoGalleryPreview />
      <CompanyShowcase />
      <ServicesPreview />
      <WhyChooseUs />
      <ReviewsSection />
      <CTASection />
    </div>
  );
}
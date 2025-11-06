import React from "react";
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
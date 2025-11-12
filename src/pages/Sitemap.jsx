import { useEffect } from 'react';

export default function Sitemap() {
  useEffect(() => {
    // Get the base URL
    const baseUrl = window.location.origin;
    
    // Define all pages
    const pages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/services', priority: '0.9', changefreq: 'weekly' },
      { url: '/gallery', priority: '0.8', changefreq: 'weekly' },
      { url: '/contact', priority: '0.9', changefreq: 'monthly' },
      { url: '/careers', priority: '0.7', changefreq: 'monthly' },
    ];

    // Get current date
    const today = new Date().toISOString().split('T')[0];

    // Generate sitemap XML
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    // Set the content type to XML
    document.contentType = 'application/xml';
    
    // Replace page content with sitemap
    document.open();
    document.write(sitemapContent);
    document.close();
  }, []);

  return null;
}
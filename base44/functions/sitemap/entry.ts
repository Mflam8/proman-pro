import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // Get the base URL from the request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Define all public pages with SEO data
    const pages = [
      { 
        path: '', 
        priority: '1.0', 
        changefreq: 'daily',
        title: 'Home'
      },
      { 
        path: 'services', 
        priority: '0.9', 
        changefreq: 'weekly',
        title: 'Servicios'
      },
      { 
        path: 'gallery', 
        priority: '0.8', 
        changefreq: 'weekly',
        title: 'Galería'
      },
      { 
        path: 'contact', 
        priority: '0.9', 
        changefreq: 'monthly',
        title: 'Contacto'
      },
      { 
        path: 'careers', 
        priority: '0.7', 
        changefreq: 'monthly',
        title: 'Empleos'
      }
    ];

    // Get current date in ISO format
    const today = new Date().toISOString().split('T')[0];

    // Generate sitemap XML
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map(page => {
  const pageUrl = page.path ? `${baseUrl}/${page.path}` : baseUrl;
  return `  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

    return new Response(sitemapXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
});
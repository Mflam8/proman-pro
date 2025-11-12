import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // Get the base URL from the request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Generate robots.txt content
    const robotsTxt = `# Robots.txt for PROMAN Services
User-agent: *
Allow: /
Disallow: /clientmanagement
Disallow: /employeedashboard
Disallow: /welcome

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (optional, be nice to servers)
Crawl-delay: 1
`;

    return new Response(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    return new Response('Error generating robots.txt', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
});
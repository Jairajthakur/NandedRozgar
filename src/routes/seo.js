const router = require('express').Router();

// Sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'https://nandedrozgar.in';
    const now = new Date().toISOString().split('T')[0];

    const staticRoutes = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/jobs', priority: '0.9', changefreq: 'hourly' },
      { loc: '/vehicles', priority: '0.8', changefreq: 'daily' },
      { loc: '/buysell', priority: '0.8', changefreq: 'daily' },
      { loc: '/rooms', priority: '0.8', changefreq: 'daily' },
      { loc: '/login', priority: '0.5', changefreq: 'monthly' },
      { loc: '/register', priority: '0.5', changefreq: 'monthly' },
    ];

    const urls = staticRoutes
      .map(
        ({ loc, priority, changefreq }) => `
  <url>
    <loc>${baseUrl}${loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
      )
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[seo] sitemap error:', err);
    res.status(500).send('Could not generate sitemap');
  }
});

// Robots.txt
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.SITE_URL || 'https://nandedrozgar.in';
  res.set('Content-Type', 'text/plain');
  res.send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

module.exports = { router };


import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    // /r/ holds private receipts (reachable only by their unguessable link): never crawl it.
    rules: { userAgent: '*', allow: '/', disallow: ['/r/'] },
    sitemap: 'https://www.tassytrucks.com/sitemap.xml',
  };
}

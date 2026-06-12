import type { MetadataRoute } from 'next';

const BASE = 'https://www.tassytrucks.com';

// Static + SEO landing routes. Add new landing pages here when they ship.
const routes: Array<{ path: string; priority: number }> = [
  { path: '/', priority: 1.0 },
  { path: '/nemt', priority: 0.9 },
  { path: '/vip', priority: 0.9 },
  { path: '/winnie', priority: 0.9 },
  { path: '/renew', priority: 0.8 },
  { path: '/recover', priority: 0.8 },
  { path: '/pricing', priority: 0.8 },
  { path: '/school', priority: 0.8 },
  // MEGA_SEO_001 — NEMT / VIP cluster
  { path: '/partners', priority: 0.9 },
  { path: '/charlotte/nemt-rides', priority: 0.8 },
  { path: '/charlotte/dialysis-transport', priority: 0.8 },
  { path: '/charlotte/post-surgery-transport', priority: 0.8 },
  { path: '/charlotte/wheelchair-transport', priority: 0.8 },
  { path: '/charlotte/veteran-transport', priority: 0.8 },
  { path: '/charlotte/concierge-medical-transport', priority: 0.8 },
  { path: '/charlotte/best-nemt-providers', priority: 0.7 },
  { path: '/charlotte/family-medical-rides', priority: 0.7 },
  { path: '/compare/tassy-vs-uber-health-vs-lyft-healthcare', priority: 0.7 },
  // MEGA_SEO_002 — Winnie Ride pet transport cluster
  { path: '/partners/veterinary', priority: 0.9 },
  { path: '/charlotte/pet-transport', priority: 0.8 },
  { path: '/charlotte/vet-appointment-rides', priority: 0.8 },
  { path: '/charlotte/post-surgery-pet-transport', priority: 0.8 },
  { path: '/charlotte/pet-boarding-transport', priority: 0.7 },
  { path: '/charlotte/calm-pet-transport', priority: 0.8 },
  { path: '/charlotte/dog-grooming-pickup', priority: 0.7 },
  { path: '/compare/winnie-vs-uber-pet-vs-lyft-pet', priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    changeFrequency: 'weekly',
    priority: r.priority,
  }));
}

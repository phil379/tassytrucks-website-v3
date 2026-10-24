/**
 * Numbers and lists the Privacy Policy quotes, kept together so Phil can approve them
 * in one place. STATUS: PROPOSED. These are drafts for Phil and for counsel; none is
 * legal advice.
 *
 * IMPORTANT: no job in this codebase deletes records automatically. The retention
 * periods below describe what Tassy intends to do and will have to do by hand (or with
 * a job someone writes later). If Phil does not want to promise a period, delete the row.
 */

export const PRIVACY_POLICY_UPDATED = 'October 24, 2026';

/** How many days we say we take to answer an access, correction or deletion request. PROPOSED. */
export const PRIVACY_RESPONSE_DAYS = 30;

export interface RetentionRow {
  records: string;
  keptFor: string;
}

/** PROPOSED retention periods. */
export const RETENTION: RetentionRow[] = [
  { records: 'Ride requests, confirmations, receipts and payment records', keptFor: '7 years after the trip, for tax, insurance and billing' },
  { records: 'Trip notes and health-related trip details (mobility, assistance, notes you typed)', keptFor: 'As part of the trip record above' },
  { records: 'Tassy Scholar student and family records', keptFor: 'While your child is enrolled, then 1 year after the last ride' },
  { records: 'Custom household requests that never became a booking', keptFor: '12 months' },
  { records: 'Text-message consent records', keptFor: '4 years after you stop receiving texts' },
  { records: 'Privacy requests we receive and our replies', keptFor: '3 years' },
];

export interface ProviderRow {
  name: string;
  does: string;
  receives: string;
}

/**
 * Every outside service the code was found to use (audit of 2026-10-24). If a new one is added to
 * the site, add it here and the Privacy Policy table updates with it.
 */
export const PROVIDERS: ProviderRow[] = [
  {
    name: 'Stripe',
    does: 'Takes card payments on its own page and stores a card for Tassy Scholar plans',
    receives: 'The amount, a trip or student reference, and for Scholar the parent’s name, email and phone. Your card details are typed on Stripe’s page and are not seen or kept by us.',
  },
  {
    name: 'Resend',
    does: 'Sends our emails (request received, confirmation, receipt, rating request)',
    receives: 'Your email address and the content of each email, which includes trip details',
  },
  {
    name: 'Supabase',
    does: 'Hosts our database where your requests and accounts are stored',
    receives: 'Everything you submit through our forms',
  },
  {
    name: 'Google Maps (address suggestions) and Google Routes (distance)',
    does: 'Suggests addresses as you type and works out driving distance for the price',
    receives: 'Your IP address and the address text you type (from your browser), and the pickup and drop-off map coordinates (from our server)',
  },
  {
    name: 'Vercel',
    does: 'Hosts the website and runs scheduled jobs. If you press Accept on our cookie banner, also counts page visits with Vercel Web Analytics',
    receives: 'Standard server logs (IP address, pages requested, browser type). With Accept: pages visited, where you came from, device and browser type',
  },
  {
    name: 'ntfy (push notification service)',
    does: 'Sends an alert to our staff phones when a request arrives',
    receives: 'A reference number and pickup time only. We keep names, phone numbers and addresses out of these alerts',
  },
  {
    name: 'Our text-messaging system and its provider',
    does: 'Sends the trip texts you asked for',
    receives: 'Your mobile number and the trip details in each text',
  },
  {
    name: 'Tassy’s applicant system (tassytrucksops.vercel.app)',
    does: 'Handles job applications that start on our Careers page. It is run by Tassy and is a separate website',
    receives: 'What you enter on the application',
  },
];

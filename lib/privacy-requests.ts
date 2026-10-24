/**
 * Requests to see, correct or delete personal information, or to stop texts or emails.
 *
 * The page is /privacy/request, the route is /api/privacy-request. A request is emailed to
 * the operator (the real record until the table below exists) and, if the requester gave an
 * email address, a receipt with a reference number goes back to them.
 *
 * NOTHING HERE DELETES OR CHANGES ANY CUSTOMER DATA. A person reads the request, checks it
 * is really from the data subject, and acts by hand.
 */
import { z } from 'zod';
import { PRIVACY_RESPONSE_DAYS } from '@/lib/privacy-policy';

export const PRIVACY_REQUESTS_TABLE = 'privacy_requests';

/**
 * STORAGE GATE. false = store nothing; the operator email is the only record.
 * The table is staged in docs/migrations_pending/20261024T0100_privacy_requests.sql and has NOT
 * been applied. After Phil applies it to the Tassy database, change this to true.
 */
export const STORE_PRIVACY_REQUESTS = false;

export const REQUEST_TYPES = [
  { value: 'access', label: 'See the information you hold about me' },
  { value: 'correct', label: 'Correct something' },
  { value: 'delete', label: 'Delete my information' },
  { value: 'stop_texts', label: 'Stop text messages' },
  { value: 'stop_emails', label: 'Stop non-essential emails' },
  { value: 'other', label: 'Something else' },
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number]['value'];

export function requestTypeLabel(v: string): string {
  return REQUEST_TYPES.find((t) => t.value === v)?.label ?? v;
}

const typeValues = REQUEST_TYPES.map((t) => t.value) as [RequestType, ...RequestType[]];

export const privacyRequestSchema = z
  .object({
    name: z.string().trim().min(1, 'Please tell us your name').max(120),
    email: z.string().trim().max(200).optional().default(''),
    phone: z.string().trim().max(40).optional().default(''),
    requestType: z.enum(typeValues, { message: 'Please choose what you are asking for' }),
    details: z.string().trim().max(1500).optional().default(''),
  })
  .superRefine((v, ctx) => {
    const hasEmail = v.email !== '';
    const hasPhone = v.phone.replace(/\D/g, '').length >= 7;
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'That email address does not look right' });
    }
    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'Please give the email address or phone number you used with us, so we can find and check your records',
      });
    }
  });

export type PrivacyRequestInput = z.infer<typeof privacyRequestSchema>;

export const RESPONSE_DAYS = PRIVACY_RESPONSE_DAYS;

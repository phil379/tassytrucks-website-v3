import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { apply, contact, portal, facilitySignup } from '@/lib/saas-links';

export default function Footer() {
  return (
    <footer className="bg-ink-section">
      {/* FIX_PROD_021 — facility self-serve CTA (FIX_PROD_020 magic-link path) */}
      <div className="border-b border-white/10">
        <div className="container-x py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="serif text-2xl font-semibold">Are you a clinic, vet, hospital, or school?</div>
            <p className="mt-1 text-sm opacity-75">Get your facility on Tassy in 60 seconds — no credit card.</p>
          </div>
          <a href={facilitySignup()} className="btn-gold shrink-0">
            Get started · no credit card <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <div className="container-x py-16 grid grid-cols-2 lg:grid-cols-7 gap-10">
        <div className="col-span-2">
          <div className="flex items-center gap-3">
            <div className="logo-mark">
              <span className="serif font-bold text-[color:var(--gold)] text-xl">T</span>
            </div>
            <div>
              <div className="serif text-xl font-semibold leading-none">Tassy Transportation</div>
              <div className="text-[10px] tracking-eyebrow uppercase mt-1 opacity-60">
                Premium Transport · Veteran-Owned
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm opacity-75 max-w-xs leading-relaxed">
            From hospital discharges to post-procedure concierge transport, Tassy moves the
            people who matter to you with discretion, dignity, and Army-grade reliability.
          </p>
          <div className="mt-6 text-xs opacity-60 space-y-1">
            <div>USDOT #3104152 · MC #79222</div>
            <div>SDVOSB Certified · Charlotte, North Carolina</div>
          </div>
        </div>

        <div>
          <div className="eyebrow opacity-60 text-current">Services</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/nemt" className="hover:text-[color:var(--gold-warm)]">NEMT</Link></li>
            <li><Link href="/vip" className="hover:text-[color:var(--gold-warm)]">VIP Concierge</Link></li>
            <li><Link href="/winnie" className="hover:text-[color:var(--gold-warm)]">Winnie Ride</Link></li>
            <li><Link href="/renew" className="hover:text-[color:var(--gold-warm)]">Tassy Renew</Link></li>
            <li><Link href="/recover" className="hover:text-[color:var(--gold-warm)]">Tassy Recover</Link></li>
            <li><Link href="/school" className="hover:text-[color:var(--gold-warm)]">Tassy School</Link></li>
            <li><Link href="/pricing" className="hover:text-[color:var(--gold-warm)]">Pricing</Link></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow opacity-60 text-current">Charlotte Services</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/charlotte/nemt-rides" className="hover:text-[color:var(--gold-warm)]">NEMT rides</Link></li>
            <li><Link href="/charlotte/dialysis-transport" className="hover:text-[color:var(--gold-warm)]">Dialysis transport</Link></li>
            <li><Link href="/charlotte/wheelchair-transport" className="hover:text-[color:var(--gold-warm)]">Wheelchair transport</Link></li>
            <li><Link href="/charlotte/post-surgery-transport" className="hover:text-[color:var(--gold-warm)]">Post-surgery transport</Link></li>
            <li><Link href="/charlotte/veteran-transport" className="hover:text-[color:var(--gold-warm)]">Veteran transport</Link></li>
            <li><Link href="/charlotte/concierge-medical-transport" className="hover:text-[color:var(--gold-warm)]">Concierge transport</Link></li>
            <li><Link href="/charlotte/family-medical-rides" className="hover:text-[color:var(--gold-warm)]">Book for a loved one</Link></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow opacity-60 text-current">Pet Transport</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/charlotte/pet-transport" className="hover:text-[color:var(--gold-warm)]">Pet transport</Link></li>
            <li><Link href="/charlotte/vet-appointment-rides" className="hover:text-[color:var(--gold-warm)]">Vet appointment rides</Link></li>
            <li><Link href="/charlotte/post-surgery-pet-transport" className="hover:text-[color:var(--gold-warm)]">Post-surgery pet pickup</Link></li>
            <li><Link href="/charlotte/calm-pet-transport" className="hover:text-[color:var(--gold-warm)]">Calm pet transport</Link></li>
            <li><Link href="/charlotte/dog-grooming-pickup" className="hover:text-[color:var(--gold-warm)]">Grooming pickup</Link></li>
            <li><Link href="/charlotte/pet-boarding-transport" className="hover:text-[color:var(--gold-warm)]">Boarding transport</Link></li>
            <li><Link href="/partners/veterinary" className="hover:text-[color:var(--gold-warm)]">For vet clinics</Link></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow opacity-60 text-current">Partners</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/partners" className="hover:text-[color:var(--gold-warm)]">Partner with Tassy</Link></li>
            <li><a href={apply.facility} className="hover:text-[color:var(--gold-warm)]">Facility partners</a></li>
            <li><a href={apply.salesRep} className="hover:text-[color:var(--gold-warm)]">Become a sales rep</a></li>
            <li><a href={apply.driver} className="hover:text-[color:var(--gold-warm)]">Drive with Tassy</a></li>
            <li><a href={portal.facilityLogin} className="hover:text-[color:var(--gold-warm)]">Existing facility · Sign in</a></li>
            <li><a href={portal.login} className="hover:text-[color:var(--gold-warm)]">Sign in</a></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow opacity-60 text-current">Contact</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={contact.phone} className="hover:text-[color:var(--gold-warm)]">{contact.phoneDisplay}</a></li>
            <li><a href={contact.bookingEmail} className="hover:text-[color:var(--gold-warm)]">booking@tassytrucks.com</a></li>
            <li><a href={contact.salesEmail} className="hover:text-[color:var(--gold-warm)]">partners@tassytrucks.com</a></li>
            <li className="opacity-60 pt-2">Charlotte, NC</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <div className="container-x flex flex-col sm:flex-row justify-between items-center gap-2 text-xs opacity-60">
          <div>© {new Date().getFullYear()} Tassy Trucks LLC. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:opacity-100">Privacy</Link>
            <Link href="/terms" className="hover:opacity-100">Terms</Link>
            <Link href="/accessibility" className="hover:opacity-100">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import type { ReactNode } from 'react';

export interface LegalSection {
  /** Anchor id, also used as the React key. */
  id: string;
  heading: string;
  /** Paragraphs, lists or tables. */
  children: ReactNode;
}

/** The shared layout for policy pages (Refunds, Cookies, Data requests, ...). */
export default function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-3xl">
        <div className="eyebrow">Legal</div>
        <h1 className="h-section mt-3">{title}</h1>
        <p className="mt-3 text-sm ink-mute">Last updated: {updated}</p>
        {intro ? <div className="mt-6 ink-soft leading-relaxed space-y-3">{intro}</div> : null}
        <div className="mt-8 space-y-10">
          {sections.map((s) => (
            <div key={s.id} id={s.id}>
              <h2 className="serif text-2xl font-semibold">{s.heading}</h2>
              <div className="mt-3 ink-soft leading-relaxed space-y-3">{s.children}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

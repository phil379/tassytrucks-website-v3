import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCHOOLS_TABLE = 'schools';
const LIMIT = 8;

/**
 * GET /api/schools?q=ardrey — the type-ahead behind the school field.
 *
 * Reads the LOCAL table. No third-party call at request time: the county
 * refreshes its list about once a year, and a booking form must never depend on
 * a GIS service being up.
 *
 * Degrades to an empty list, never an error the form has to handle. A parent
 * whose school is missing — or who hits this while the database is unhappy —
 * falls through to "Can't find your school?" and still books. A reference list
 * must not be able to block a booking.
 */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ schools: [] });

  // PostgREST pattern syntax: * is the wildcard. Escape the characters that
  // would otherwise let a query reshape the filter.
  const safe = q.replace(/[%,()*\\]/g, ' ').trim();
  if (!safe) return NextResponse.json({ schools: [] });

  try {
    const { data, error } = await supabaseAdmin()
      .from(SCHOOLS_TABLE)
      .select('id, name, address, level, kind, bell_am, bell_pm')
      .eq('active', true)
      .ilike('name', `*${safe}*`)
      .order('name')
      .limit(LIMIT);

    // A FAILED LOOKUP IS NOT AN EMPTY RESULT. This used to answer 200 with
    // `{ schools: [] }`, which the picker cannot tell apart from "we have no
    // school by that name" — so a parent typing "Ardrey Kell" during a database
    // hiccup saw no suggestions, typed the name by hand, and the booking landed
    // with school_id null. It still goes through (that is deliberate), but it
    // joins the manual-review pile for a reason that was never true.
    //
    // 503 so the picker can say the search is down and keep the parent moving.
    if (error) {
      console.error('[schools] lookup failed:', error.message);
      return NextResponse.json({ schools: [], ok: false }, { status: 503 });
    }
    return NextResponse.json({ schools: data ?? [], ok: true });
  } catch (e) {
    console.error('[schools] lookup threw:', e instanceof Error ? e.message : e);
    return NextResponse.json({ schools: [], ok: false }, { status: 503 });
  }
}

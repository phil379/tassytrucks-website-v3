import type { LatLng } from '@/lib/quote';

/**
 * ZIP centroids for the Charlotte service area. GENERATED — see
 * scripts/gen-zip-centroids.py. Do not hand-edit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * The instant price needs two coordinates. Those normally come from Google
 * Places when the visitor PICKS an address from the suggestions. When the Maps
 * key is missing, or the visitor types an address instead of picking one, or
 * Places is simply having a bad day, there is nothing to measure and the page
 * cannot quote. That is a booking lost to an outage the customer never sees.
 *
 * A ZIP centroid is a worse measurement and a much better outcome. Charlotte
 * ZIP areas run roughly 2-4 miles across, the distance bands are 4-5 miles
 * wide, and the engine already prices the optimistic and the pessimistic road
 * distance separately. So when a ZIP pair lands near a band edge the customer
 * sees a RANGE instead of a single number — which is exactly what an estimate
 * built from a ZIP deserves to look like.
 *
 * Spot-checked against real routes: Uptown (28202) to Matthews (28105) resolves
 * to 13.7-15.9 road miles against roughly 14 in reality; Uptown to Concord
 * (28025) resolves to 23.5-27.2 against roughly 25.
 *
 * THIS IS NOT A SUBSTITUTE FOR THE MAPS KEY. With the key, coordinates are
 * exact, `exact` comes back true, and this file is never consulted.
 */
export const ZIP_CENTROIDS: Record<string, readonly [number, number, string]> = {
  '28006': [35.3653, -81.088, 'Alexis, NC'],
  '28012': [35.2784, -81.1971, 'Belmont, NC'],
  '28016': [35.3196, -81.2348, 'Bessemer City, NC'],
  '28021': [35.3067, -81.237, 'Cherryville, NC'],
  '28023': [35.5715, -80.5965, 'China Grove, NC'],
  '28025': [35.3716, -80.5621, 'Concord, NC'],
  '28026': [35.3463, -80.5411, 'Concord, NC'],
  '28027': [35.4107, -80.6584, 'Concord, NC'],
  '28031': [35.4733, -80.8726, 'Cornelius, NC'],
  '28032': [35.3142, -81.1343, 'Cramerton, NC'],
  '28033': [35.4359, -81.3385, 'Crouse, NC'],
  '28034': [35.3499, -81.2215, 'Dallas, NC'],
  '28035': [35.5, -80.84, 'Davidson College, NC'],
  '28036': [35.2834, -80.8446, 'Davidson, NC'],
  '28037': [35.4861, -81.0553, 'Denver, NC'],
  '28041': [35.5817, -80.4581, 'Faith, NC'],
  '28052': [35.2679, -81.1787, 'Gastonia, NC'],
  '28053': [35.2751, -81.2134, 'Gastonia, NC'],
  '28054': [35.2495, -81.133, 'Gastonia, NC'],
  '28055': [35.284, -81.1897, 'Gastonia, NC'],
  '28056': [35.242, -81.1691, 'Gastonia, NC'],
  '28070': [35.4622, -80.8987, 'Huntersville, NC'],
  '28071': [35.5475, -80.3102, 'Gold Hill, NC'],
  '28072': [35.6109, -80.4361, 'Granite Quarry, NC'],
  '28075': [35.3537, -80.6724, 'Harrisburg, NC'],
  '28077': [35.4042, -81.1942, 'High Shoals, NC'],
  '28078': [35.4011, -80.8695, 'Huntersville, NC'],
  '28079': [35.1156, -80.5979, 'Indian Trail, NC'],
  '28080': [35.4729, -81.1062, 'Iron Station, NC'],
  '28081': [35.463, -80.6725, 'Kannapolis, NC'],
  '28082': [35.3463, -80.5411, 'Kannapolis, NC'],
  '28083': [35.4766, -80.5715, 'Kannapolis, NC'],
  '28088': [35.5454, -80.608, 'Landis, NC'],
  '28092': [35.4851, -81.1818, 'Lincolnton, NC'],
  '28093': [35.4848, -81.2395, 'Lincolnton, NC'],
  '28097': [35.2621, -80.4245, 'Locust, NC'],
  '28098': [35.2624, -81.098, 'Lowell, NC'],
  '28101': [35.2675, -81.091, 'Mc Adenville, NC'],
  '28103': [34.9973, -80.3642, 'Marshville, NC'],
  '28104': [35.089, -80.7044, 'Matthews, NC'],
  '28105': [35.1149, -80.705, 'Matthews, NC'],
  '28106': [35.26, -80.8042, 'Matthews, NC'],
  '28107': [35.2506, -80.5356, 'Midland, NC'],
  '28108': [34.9163, -80.6404, 'Mineral Springs, NC'],
  '28110': [35.0742, -80.5278, 'Monroe, NC'],
  '28111': [35.0112, -80.5587, 'Monroe, NC'],
  '28112': [34.9016, -80.5272, 'Monroe, NC'],
  '28117': [35.584, -80.8685, 'Mooresville, NC'],
  '28120': [35.3187, -81.0267, 'Mount Holly, NC'],
  '28123': [35.5298, -80.947, 'Mount Mourne, NC'],
  '28124': [35.4168, -80.4165, 'Mount Pleasant, NC'],
  '28126': [35.2768, -80.7165, 'Newell, NC'],
  '28129': [35.2407, -80.3192, 'Oakboro, NC'],
  '28130': [35.26, -80.8042, 'Paw Creek, NC'],
  '28134': [35.0785, -80.8911, 'Pineville, NC'],
  '28138': [35.5416, -80.4559, 'Rockwell, NC'],
  '28146': [35.6187, -80.4022, 'Salisbury, NC'],
  '28163': [35.2584, -80.4152, 'Stanfield, NC'],
  '28164': [35.3292, -81.0574, 'Stanley, NC'],
  '28173': [34.9251, -80.7278, 'Waxhaw, NC'],
  '28174': [34.9648, -80.4277, 'Wingate, NC'],
  '28201': [35.26, -80.8042, 'Charlotte, NC'],
  '28202': [35.2262, -80.8435, 'Charlotte, NC'],
  '28203': [35.209, -80.8563, 'Charlotte, NC'],
  '28204': [35.2153, -80.8287, 'Charlotte, NC'],
  '28205': [35.326, -80.8274, 'Charlotte, NC'],
  '28206': [35.2508, -80.8201, 'Charlotte, NC'],
  '28207': [35.1954, -80.8264, 'Charlotte, NC'],
  '28208': [35.2091, -80.9218, 'Charlotte, NC'],
  '28209': [35.1744, -80.8534, 'Charlotte, NC'],
  '28210': [35.1568, -80.8513, 'Charlotte, NC'],
  '28211': [35.1696, -80.7908, 'Charlotte, NC'],
  '28212': [35.1862, -80.7496, 'Charlotte, NC'],
  '28213': [35.2836, -80.7638, 'Charlotte, NC'],
  '28214': [35.2799, -80.8641, 'Charlotte, NC'],
  '28215': [35.2466, -80.7887, 'Charlotte, NC'],
  '28216': [35.2988, -80.8957, 'Charlotte, NC'],
  '28217': [35.1336, -80.9636, 'Charlotte, NC'],
  '28218': [35.26, -80.8042, 'Charlotte, NC'],
  '28219': [35.26, -80.8042, 'Charlotte, NC'],
  '28220': [35.26, -80.8042, 'Charlotte, NC'],
  '28221': [35.26, -80.8042, 'Charlotte, NC'],
  '28222': [35.26, -80.8042, 'Charlotte, NC'],
  '28223': [35.3041, -80.7267, 'Charlotte, NC'],
  '28224': [35.26, -80.8042, 'Charlotte, NC'],
  '28225': [35.26, -80.8042, 'Charlotte, NC'],
  '28226': [35.1086, -80.8275, 'Charlotte, NC'],
  '28227': [35.1366, -80.7112, 'Charlotte, NC'],
  '28228': [35.26, -80.8042, 'Charlotte, NC'],
  '28229': [35.26, -80.8042, 'Charlotte, NC'],
  '28230': [35.26, -80.8042, 'Charlotte, NC'],
  '28231': [35.26, -80.8042, 'Charlotte, NC'],
  '28232': [35.26, -80.8042, 'Charlotte, NC'],
  '28233': [35.4894, -80.8254, 'Charlotte, NC'],
  '28234': [35.26, -80.8042, 'Charlotte, NC'],
  '28235': [35.26, -80.8042, 'Charlotte, NC'],
  '28236': [35.26, -80.8042, 'Charlotte, NC'],
  '28237': [35.26, -80.8042, 'Charlotte, NC'],
  '28240': [35.26, -80.8042, 'Charlotte, NC'],
  '28241': [35.26, -80.8042, 'Charlotte, NC'],
  '28242': [35.26, -80.8042, 'Charlotte, NC'],
  '28243': [35.26, -80.8042, 'Charlotte, NC'],
  '28244': [35.26, -80.8042, 'Charlotte, NC'],
  '28246': [35.2275, -80.8425, 'Charlotte, NC'],
  '28247': [35.0656, -80.8511, 'Charlotte, NC'],
  '28250': [35.26, -80.8042, 'Charlotte, NC'],
  '28253': [35.26, -80.8042, 'Charlotte, NC'],
  '28254': [35.26, -80.8042, 'Charlotte, NC'],
  '28255': [35.26, -80.8042, 'Charlotte, NC'],
  '28256': [35.26, -80.8042, 'Charlotte, NC'],
  '28258': [35.26, -80.8042, 'Charlotte, NC'],
  '28260': [35.26, -80.8042, 'Charlotte, NC'],
  '28261': [35.26, -80.8042, 'Charlotte, NC'],
  '28262': [35.3183, -80.7476, 'Charlotte, NC'],
  '28263': [35.22, -80.84, 'First Citizens Bank, NC'],
  '28265': [35.26, -80.8042, 'Charlotte, NC'],
  '28266': [35.2845, -80.8582, 'Charlotte, NC'],
  '28269': [35.332, -80.7986, 'Charlotte, NC'],
  '28270': [35.113, -80.7626, 'Charlotte, NC'],
  '28271': [35.22, -80.84, 'Charlotte, NC'],
  '28272': [35.26, -80.8042, 'Charlotte, NC'],
  '28273': [35.1287, -80.9338, 'Charlotte, NC'],
  '28274': [35.1879, -80.8317, 'Charlotte, NC'],
  '28275': [35.26, -80.8042, 'Charlotte, NC'],
  '28277': [35.0552, -80.8195, 'Charlotte, NC'],
  '28278': [35.2072, -80.9568, 'Charlotte, NC'],
  '28280': [35.26, -80.8042, 'Charlotte, NC'],
  '28281': [35.26, -80.8042, 'Charlotte, NC'],
  '28282': [35.2242, -80.8447, 'Charlotte, NC'],
  '28283': [35.26, -80.8042, 'Charlotte, NC'],
  '28284': [35.26, -80.8042, 'Charlotte, NC'],
  '28285': [35.26, -80.8042, 'Charlotte, NC'],
  '28286': [35.26, -80.8042, 'Charlotte, NC'],
  '28287': [35.26, -80.8042, 'Charlotte, NC'],
  '28288': [35.26, -80.8042, 'Charlotte, NC'],
  '28289': [35.26, -80.8042, 'Charlotte, NC'],
  '28290': [35.26, -80.8042, 'Charlotte, NC'],
  '28296': [35.2252, -80.8458, 'Charlotte, NC'],
  '28297': [35.26, -80.8042, 'Charlotte, NC'],
  '28299': [35.26, -80.8042, 'Charlotte, NC'],
  '28650': [35.5889, -81.1628, 'Maiden, NC'],
  '28658': [35.6319, -81.1719, 'Newton, NC'],
  '28673': [35.6031, -80.9971, 'Sherrills Ford, NC'],
  '28682': [35.5794, -80.9682, 'Terrell, NC'],
  '28687': [35.5298, -80.947, 'Statesville, NC'],
  '28688': [35.5298, -80.947, 'Turnersburg, NC'],
  '29703': [34.9926, -81.1787, 'Bowling Green, SC'],
  '29704': [34.8596, -80.9383, 'Catawba, SC'],
  '29708': [35.0502, -80.9908, 'Fort Mill, SC'],
  '29710': [35.036, -81.1652, 'Clover, SC'],
  '29715': [34.9876, -81.1552, 'Fort Mill, SC'],
  '29716': [35.0628, -80.969, 'Fort Mill, SC'],
  '29726': [34.8599, -81.2274, 'Mc Connells, SC'],
  '29730': [34.9091, -81.0524, 'Rock Hill, SC'],
  '29731': [34.9926, -81.1787, 'Rock Hill, SC'],
  '29732': [34.9377, -81.0922, 'Rock Hill, SC'],
  '29733': [34.9926, -81.1787, 'Rock Hill, SC'],
  '29734': [34.9926, -81.1787, 'Rock Hill, SC'],
  '29742': [34.9328, -81.3385, 'Sharon, SC'],
  '29744': [34.9739, -80.8518, 'Van Wyck, SC'],
  '29745': [34.9918, -81.2086, 'York, SC'],
};

/**
 * Pull a 5-digit ZIP out of whatever the visitor typed.
 *
 * The LAST match wins, deliberately: "123 28th Street, Charlotte NC 28205" has
 * two five-digit-looking runs and only the trailing one is the ZIP.
 */
export function extractZip(address: string | null | undefined): string | null {
  if (!address) return null;
  const all = String(address).match(/\b(\d{5})(?:-\d{4})?\b/g);
  if (!all) return null;
  const last = all[all.length - 1]!.slice(0, 5);
  return last in ZIP_CENTROIDS ? last : null;
}

/** The centroid of a ZIP inside the service area, or null. */
export function zipCentroid(zip: string | null | undefined): LatLng | null {
  if (!zip) return null;
  const hit = ZIP_CENTROIDS[zip];
  return hit ? { lat: hit[0], lng: hit[1] } : null;
}

/** "Charlotte, NC" for a ZIP, so the panel can name where it measured from. */
export function zipPlace(zip: string | null | undefined): string | null {
  if (!zip) return null;
  return ZIP_CENTROIDS[zip]?.[2] ?? null;
}

export type ResolvedPoint = { point: LatLng; exact: boolean; zip: string | null };

/**
 * Coordinates from a picked place when we have them, otherwise from the ZIP the
 * visitor typed. `exact` is what the difference is called downstream: an exact
 * point gets a firm estimate, a ZIP point gets one labelled as approximate.
 */
export function resolvePoint(
  picked: { lat?: number | null; lng?: number | null } | null | undefined,
  address: string | null | undefined,
): ResolvedPoint | null {
  if (picked?.lat != null && picked?.lng != null) {
    return { point: { lat: picked.lat, lng: picked.lng }, exact: true, zip: extractZip(address) };
  }
  const zip = extractZip(address);
  const point = zipCentroid(zip);
  return point ? { point, exact: false, zip } : null;
}

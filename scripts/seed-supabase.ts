/**
 * Seed baseline data into Supabase (services, artists, availability, company brain).
 *   npm run seed:supabase     (loads web/.env.local; needs SUPABASE_SERVICE_ROLE_KEY + an AI key for the brain)
 * Idempotent: upserts by natural key; brain chunks are skipped if the title exists.
 */
import './ws-polyfill';
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/llm';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in web/.env.local'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const services = [
  { title: '1hr Consultation', slug: '1hr-consultation', description: 'A one-hour focused session on music business fundamentals — PRO/MLC, distribution, publishing, catalog management.', duration: 60, price: 24500, is_free: false, is_active: true, sort_order: 1 },
  { title: 'Free Consultation (10 min)', slug: 'free-consultation', description: 'A free 10-minute consultation to see if X7 Music Group is the right fit for you.', duration: 12, price: 0, is_free: true, is_active: true, sort_order: 2 },
];

const artists = [
  { name: 'Steven Pantojas', slug: 'steven-pantojas', tagline: 'Founder · Artist · Producer', is_featured: true, is_published: true, sort_order: 1 },
  { name: 'Drum & Mic Project', slug: 'drum-and-mic-project', tagline: 'Live Worship Collective', is_featured: true, is_published: true, sort_order: 2 },
  { name: 'Worship', slug: 'worship', tagline: 'Worship Ministry', is_featured: false, is_published: true, sort_order: 3 },
  { name: 'Sampel', slug: 'sampel', tagline: 'Artist', is_featured: false, is_published: true, sort_order: 4 },
];

const schedule = [1, 2, 3, 4, 5].map((d) => ({ day_of_week: d, start_time: '09:00', end_time: '18:00', is_blocked: false, buffer_minutes: 15 }));

const brainSeed = [
  { title: 'About X7 Music Group', source_type: 'knowledge', visibility: 'public', tags: ['about', 'x7'], content: 'X7 Music Group is a Christian music label, consulting firm, and publishing company founded by Steven Pantojas. It helps artists, producers, and labels build sustainable careers through consulting, distribution, PRO/MLC registration, publishing administration, and catalog auditing.' },
  { title: 'X7 brand names', source_type: 'knowledge', visibility: 'public', tags: ['brands'], content: 'NEXTEP is X7\'s consulting/services brand. CHECKZONE is X7\'s music-education content. Event series: X7 Music Spotlight, Night of Worship, Pinstage. X7 Meeting is a community gathering for artists and music professionals.' },
  { title: 'Booking a consultation', source_type: 'faq', visibility: 'public', tags: ['booking', 'pricing'], content: 'X7 offers a 1-hour Consultation ($245) and a free 10-minute Consultation, booked on the website. Paid sessions check out via Stripe; the free session confirms immediately. Steven leads the sessions.' },
  { title: 'PRO vs MLC', source_type: 'music-business', visibility: 'public', tags: ['publishing', 'pro', 'mlc'], content: 'A PRO (ASCAP, BMI, SESAC) collects PERFORMANCE royalties (public performance/broadcast/streaming). The MLC collects MECHANICAL royalties from US digital streaming/downloads for the composition. Songwriters need BOTH. X7 handles these registrations.' },
  { title: 'Songwriter split sheets', source_type: 'music-business', visibility: 'public', tags: ['splits', 'publishing'], content: 'A split sheet documents who wrote a song and each writer\'s ownership percentage (must total 100%), with role, PRO, and IPI/CAE number. X7 generates a branded split-sheet PDF; artist PRO info auto-fills from their profile.' },
  { title: 'Copyright basics: composition vs master', source_type: 'music-business', visibility: 'public', tags: ['copyright', 'composition', 'master'], content: 'Copyright is born automatically when an idea becomes tangible. Every song has TWO rights: the COMPOSITION/publishing (lyrics + music) and the MASTER/recording (the finished audio). They are owned and monetized separately.' },
  { title: 'Who owns the master and the publishing', source_type: 'music-business', visibility: 'public', tags: ['copyright', 'ownership', 'splits'], content: 'Without a signed contract, everyone who records together co-owns the master; paying for the session does not make you sole owner. Everyone who wrote lyrics/music co-owns the publishing (split equally absent a contract). Producing/recording does not make you a publishing owner if you wrote nothing. Define percentages BEFORE releasing/registering, in a signed split sheet.' },
];

async function run() {
  for (const s of services) { await sb.from('services').upsert(s, { onConflict: 'slug' }); console.log(`✓ service ${s.title}`); }
  for (const a of artists) {
    const { data: existing } = await sb.from('artists').select('id').eq('slug', a.slug).maybeSingle();
    if (!existing) { await sb.from('artists').insert(a); console.log(`✓ artist ${a.name}`); } else console.log(`⚠ artist ${a.name} exists`);
  }
  const { count } = await sb.from('availability').select('*', { count: 'exact', head: true }).is('specific_date', null);
  if (!count) { await sb.from('availability').insert(schedule); console.log('✓ weekly schedule'); } else console.log('⚠ schedule exists');

  if (process.env.OPENAI_API_KEY || process.env.LLM_EMBED_API_KEY) {
    for (const b of brainSeed) {
      const { data: existing } = await sb.from('brain_chunks').select('id').eq('title', b.title).maybeSingle();
      if (existing) { console.log(`⚠ brain "${b.title}" exists`); continue; }
      const embedding = await embedOne(`${b.title}\n\n${b.content}`);
      await sb.from('brain_chunks').insert({ ...b, embedding });
      console.log(`✓ brain ${b.title}`);
    }
  } else console.log('⚠ no AI key — skipping brain seed');

  console.log('\n✅ Supabase seed complete.');
}
run().catch((e) => { console.error(e); process.exit(1); });

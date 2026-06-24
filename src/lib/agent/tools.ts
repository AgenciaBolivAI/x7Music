import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendNewsletterEmail, sendInquiryReply, sendCatalogStatusUpdate, sendSignatureRequestEmail } from '@/lib/services/email';
import { searchBrain, ingestBrainChunk } from './brain';
import { loadAgreement, agreementCreateSchema } from '@/lib/agreements';
import { webSearch, type LlmTool } from '@/lib/llm';
import type { AgentCaller } from './context';

type Role = 'public' | 'client' | 'admin';
type ToolResult = Record<string, unknown>;

interface AgentTool {
  description: string;
  parameters: Record<string, unknown>;
  roles: Role[];
  mutates?: boolean;
  run: (args: Record<string, unknown>, caller: AgentCaller) => Promise<ToolResult>;
}

const NO_PARAMS = { type: 'object', properties: {} };
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').slice(0, 80) || `item-${Date.now()}`;
// Strip characters that would break a PostgREST .or()/ilike filter built from user input.
const safeLike = (s: string) => s.replace(/[%,()*]/g, ' ').trim();

export const TOOLS: Record<string, AgentTool> = {
  search_brain: {
    roles: ['public', 'client', 'admin'],
    description:
      "Search X7 Music Group's company brain (policies, FAQs, music-business reference). Use this FIRST for any question about how X7 works, its policies, or documented music-business concepts.",
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'What to look up.' } }, required: ['query'] },
    run: async (args, caller) => {
      const hits = await searchBrain(String(args.query ?? ''), 5, { includeInternal: caller.role === 'admin' });
      return { matches: hits.map((h) => ({ title: h.title, content: h.content, type: h.sourceType })) };
    },
  },

  list_services: {
    roles: ['public', 'client', 'admin'],
    description: 'The live bookable services with current pricing (USD) and duration.',
    parameters: NO_PARAMS,
    run: async () => {
      const { data } = await createClient().from('services').select('title, slug, price, is_free, duration').eq('is_active', true).order('sort_order');
      return { services: (data ?? []).map((s) => ({ title: s.title, slug: s.slug, price_usd: s.is_free ? 0 : (s.price as number) / 100, isFree: s.is_free, duration_min: s.duration })) };
    },
  },

  list_artists: {
    roles: ['public', 'client', 'admin'],
    description: 'Published X7 roster artists (name, tagline, profile slug). Public info only.',
    parameters: NO_PARAMS,
    run: async () => {
      const { data } = await createClient().from('artists').select('name, slug, tagline').eq('is_published', true).order('sort_order');
      return { artists: data ?? [] };
    },
  },

  list_releases: {
    roles: ['public', 'client', 'admin'],
    description: 'Published music releases (title, artist, type, release date).',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } } },
    run: async (args) => {
      const limit = Math.min(30, Math.max(1, Number(args.limit) || 10));
      const { data } = await createClient().from('releases').select('title, artist, type, release_date').eq('is_published', true).order('release_date', { ascending: false }).limit(limit);
      return { releases: data ?? [] };
    },
  },

  list_events: {
    roles: ['public', 'client', 'admin'],
    description: 'Published events. scope=upcoming (default) or past.',
    parameters: { type: 'object', properties: { scope: { type: 'string', enum: ['upcoming', 'past'] } } },
    run: async (args) => {
      const past = args.scope === 'past';
      const nowIso = new Date().toISOString();
      let q = createClient().from('events').select('title, type, date, location').eq('is_published', true).limit(20);
      q = past ? q.lt('date', nowIso).order('date', { ascending: false }) : q.gte('date', nowIso).order('date', { ascending: true });
      const { data } = await q;
      return { events: data ?? [] };
    },
  },

  list_education: {
    roles: ['public', 'client', 'admin'],
    description: 'Published CHECKZONE music-education articles (title, slug, excerpt, category).',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 20 } } },
    run: async (args) => {
      const limit = Math.min(20, Math.max(1, Number(args.limit) || 10));
      const { data } = await createClient().from('blog_posts').select('title, slug, excerpt, category').eq('is_published', true).order('published_at', { ascending: false }).limit(limit);
      return { posts: data ?? [] };
    },
  },

  // ── Caller-scoped (RLS also enforces own-rows-only for clients) ───────────
  get_my_bookings: {
    roles: ['client', 'admin'],
    description: "The CALLER's own bookings (service, date, status, payment status).",
    parameters: NO_PARAMS,
    run: async (_args, caller) => {
      const { data } = await createClient()
        .from('bookings')
        .select('scheduled_at, status, payment_status, service:services(title)')
        .eq('client_id', caller.userId)
        .order('scheduled_at', { ascending: false })
        .limit(25);
      return {
        bookings: (data ?? []).map((b) => ({
          service: (b.service as unknown as { title?: string })?.title ?? 'Session',
          scheduledAt: b.scheduled_at, status: b.status, paymentStatus: b.payment_status,
        })),
      };
    },
  },

  get_my_catalog: {
    roles: ['client', 'admin'],
    description: "The CALLER's own catalog entries and registration status (ISRC/ISWC/UPC, PRO/MLC, status).",
    parameters: NO_PARAMS,
    run: async (_args, caller) => {
      const { data } = await createClient()
        .from('catalog_entries')
        .select('title, type, isrc, iswc, upc, registered_pro, registered_mlc, status, status_notes')
        .eq('client_id', caller.userId)
        .order('created_at', { ascending: false })
        .limit(50);
      return { catalog: data ?? [] };
    },
  },

  get_my_documents: {
    roles: ['client', 'admin'],
    description: "The CALLER's own documents shared by X7 (title, type, date). Metadata only.",
    parameters: NO_PARAMS,
    run: async (_args, caller) => {
      const { data } = await createClient()
        .from('documents')
        .select('title, type, created_at')
        .eq('client_id', caller.userId)
        .order('created_at', { ascending: false })
        .limit(50);
      return { documents: data ?? [] };
    },
  },

  // ── Admin-only reads ──────────────────────────────────────────────────────
  get_admin_stats: {
    roles: ['admin'],
    description: 'Platform-wide admin snapshot: clients, pending bookings, unread messages, upcoming events, active subscribers, paid revenue (USD).',
    parameters: NO_PARAMS,
    run: async () => {
      const sb = createClient();
      const head = { count: 'exact' as const, head: true };
      const nowIso = new Date().toISOString();
      const [clients, pending, unread, upcoming, subs, paid] = await Promise.all([
        sb.from('profiles').select('*', head).eq('role', 'client'),
        sb.from('bookings').select('*', head).eq('status', 'pending'),
        sb.from('messages').select('*', head).eq('status', 'unread'),
        sb.from('events').select('*', head).eq('is_published', true).gte('date', nowIso),
        sb.from('subscribers').select('*', head).eq('is_active', true),
        sb.from('bookings').select('total_amount').eq('payment_status', 'paid'),
      ]);
      const revenue = (paid.data ?? []).reduce((s, b) => s + ((b.total_amount as number) || 0), 0);
      return {
        total_clients: clients.count ?? 0,
        pending_bookings: pending.count ?? 0,
        unread_messages: unread.count ?? 0,
        upcoming_events: upcoming.count ?? 0,
        active_subscribers: subs.count ?? 0,
        paid_revenue_usd: revenue / 100,
      };
    },
  },

  list_recent_bookings: {
    roles: ['admin'],
    description: 'Recent bookings across ALL clients (client name, service, date, status). Admin only.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 25 } } },
    run: async (args) => {
      const limit = Math.min(25, Math.max(1, Number(args.limit) || 10));
      const { data } = await createClient()
        .from('bookings')
        .select('id, scheduled_at, status, payment_status, client:profiles(first_name,last_name), service:services(title)')
        .order('created_at', { ascending: false })
        .limit(limit);
      return {
        bookings: (data ?? []).map((b) => {
          const c = b.client as unknown as { first_name?: string; last_name?: string };
          return {
            id: b.id,
            client: `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || '—',
            service: (b.service as unknown as { title?: string })?.title ?? 'Session',
            scheduledAt: b.scheduled_at, status: b.status, paymentStatus: b.payment_status,
          };
        }),
      };
    },
  },

  // ── Admin-only writes (preview unless confirm:true) ───────────────────────
  update_booking_status: {
    roles: ['admin'],
    mutates: true,
    description:
      "Change a booking's status (pending|confirmed|completed|cancelled). Identify it via list_recent_bookings, confirm with the admin, then call with confirm:true.",
    parameters: {
      type: 'object',
      properties: {
        booking_id: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] },
        confirm: { type: 'boolean' },
      },
      required: ['booking_id', 'status'],
    },
    run: async (args) => {
      const id = String(args.booking_id || '');
      const status = String(args.status || '');
      if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) return { error: 'Invalid status.' };
      const sb = createClient();
      const { data: booking } = await sb.from('bookings').select('id, status').eq('id', id).maybeSingle();
      if (!booking) return { error: 'Booking not found.' };
      if (args.confirm !== true) {
        return { requires_confirmation: true, summary: `Change booking ${id} to "${status}".`, action: { name: 'update_booking_status', args: { booking_id: id, status } } };
      }
      const { error } = await sb.from('bookings').update({ status }).eq('id', id);
      if (error) return { error: error.message };
      return { ok: true, message: `Booking marked ${status}.` };
    },
  },

  send_newsletter_broadcast: {
    roles: ['admin'],
    mutates: true,
    description:
      'Send a newsletter announcement to active subscribers. audience: all | en | es. Preview first; send only with confirm:true after the admin approves.',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        body: { type: 'string' },
        audience: { type: 'string', enum: ['all', 'en', 'es'] },
        confirm: { type: 'boolean' },
      },
      required: ['subject', 'body'],
    },
    run: async (args) => {
      const subject = String(args.subject || '').trim();
      const body = String(args.body || '').trim();
      const audience = ['all', 'en', 'es'].includes(String(args.audience)) ? String(args.audience) : 'all';
      if (!subject || !body) return { error: 'Subject and body are required.' };

      const svc = createServiceClient();
      let q = svc.from('subscribers').select('id, email, unsubscribe_token').eq('is_active', true);
      if (audience !== 'all') q = q.eq('language', audience);
      const { data: recipients } = await q;
      const list = recipients ?? [];

      if (args.confirm !== true) {
        return { requires_confirmation: true, summary: `Send "${subject}" to ${list.length} ${audience} subscriber(s).`, action: { name: 'send_newsletter_broadcast', args: { subject, body, audience } } };
      }
      if (list.length === 0) return { error: 'No active subscribers match this audience.' };

      const bodyHtml = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
      const baseUrl = process.env.CLIENT_URL || '';
      let sent = 0, failed = 0;
      for (let i = 0; i < list.length; i += 5) {
        const batch = list.slice(i, i + 5);
        const results = await Promise.allSettled(batch.map(async (sub) => {
          let token = sub.unsubscribe_token as string;
          if (!token) {
            token = crypto.randomBytes(24).toString('hex');
            await svc.from('subscribers').update({ unsubscribe_token: token }).eq('id', sub.id);
          }
          await sendNewsletterEmail(sub.email as string, subject, bodyHtml, `${baseUrl}/api/newsletter/unsubscribe?token=${token}`);
        }));
        results.forEach((r) => (r.status === 'fulfilled' ? sent++ : failed++));
      }
      const status = failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial';
      await svc.from('campaigns').insert({ subject, body, audience, recipient_count: list.length, sent_count: sent, failed_count: failed, status });
      return { ok: true, message: `Broadcast sent to ${sent} subscriber(s)${failed ? ` (${failed} failed)` : ''}.` };
    },
  },

  // ══ Admin reads — full platform coverage ══════════════════════════════════
  list_bookings: {
    roles: ['admin'],
    description: 'List bookings across all clients, optionally filtered by status (pending|confirmed|completed|cancelled).',
    parameters: { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'] }, limit: { type: 'integer', minimum: 1, maximum: 50 } } },
    run: async (args) => {
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
      let q = createClient().from('bookings')
        .select('id, scheduled_at, status, payment_status, total_amount, client:profiles(first_name,last_name,email), service:services(title)')
        .order('scheduled_at', { ascending: false }).limit(limit);
      if (typeof args.status === 'string') q = q.eq('status', args.status);
      const { data } = await q;
      return {
        bookings: (data ?? []).map((b) => {
          const c = b.client as unknown as { first_name?: string; last_name?: string; email?: string };
          return { id: b.id, client: `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || '—', email: c?.email, service: (b.service as unknown as { title?: string })?.title ?? 'Session', scheduledAt: b.scheduled_at, status: b.status, paymentStatus: b.payment_status, amountUsd: ((b.total_amount as number) || 0) / 100 };
        }),
      };
    },
  },

  get_client: {
    roles: ['admin'],
    description: "Look up one client by email or id: profile + counts of their bookings/catalog/documents.",
    parameters: { type: 'object', properties: { email: { type: 'string' }, id: { type: 'string' } } },
    run: async (args) => {
      const sb = createClient();
      let q = sb.from('profiles').select('id, first_name, last_name, email, phone, company, is_active, created_at').eq('role', 'client');
      if (args.id) q = q.eq('id', String(args.id));
      else if (args.email) q = q.ilike('email', safeLike(String(args.email)));
      else return { error: 'Provide an email or id.' };
      const { data: p } = await q.maybeSingle();
      if (!p) return { error: 'Client not found.' };
      const head = { count: 'exact' as const, head: true };
      const [bk, cat, doc] = await Promise.all([
        sb.from('bookings').select('*', head).eq('client_id', p.id),
        sb.from('catalog_entries').select('*', head).eq('client_id', p.id),
        sb.from('documents').select('*', head).eq('client_id', p.id),
      ]);
      return { client: { id: p.id, name: `${p.first_name} ${p.last_name}`.trim(), email: p.email, phone: p.phone, company: p.company, active: p.is_active, joined: p.created_at, bookings: bk.count ?? 0, catalogEntries: cat.count ?? 0, documents: doc.count ?? 0 } };
    },
  },

  list_clients: {
    roles: ['admin'],
    description: 'Search/list clients by name, email, or company.',
    parameters: { type: 'object', properties: { search: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50 } } },
    run: async (args) => {
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
      let q = createClient().from('profiles').select('first_name, last_name, email, company, is_active, created_at').eq('role', 'client').order('created_at', { ascending: false }).limit(limit);
      const s = safeLike(String(args.search || ''));
      if (s) q = q.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`);
      const { data } = await q;
      return { clients: (data ?? []).map((c) => ({ name: `${c.first_name} ${c.last_name}`.trim(), email: c.email, company: c.company, active: c.is_active, joined: c.created_at })) };
    },
  },

  list_catalog_all: {
    roles: ['admin'],
    description: 'All catalog entries across clients (optionally by status). title, type, ISRC/ISWC/UPC, PRO/MLC, status, owner.',
    parameters: { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'in_progress', 'registered', 'issue'] }, limit: { type: 'integer', minimum: 1, maximum: 50 } } },
    run: async (args) => {
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 25));
      let q = createClient().from('catalog_entries')
        .select('id, title, type, isrc, iswc, upc, registered_pro, registered_mlc, status, client:profiles(first_name,last_name)')
        .order('created_at', { ascending: false }).limit(limit);
      if (typeof args.status === 'string') q = q.eq('status', args.status);
      const { data } = await q;
      return {
        catalog: (data ?? []).map((e) => {
          const c = e.client as unknown as { first_name?: string; last_name?: string };
          return { id: e.id, title: e.title, type: e.type, isrc: e.isrc, iswc: e.iswc, upc: e.upc, pro: e.registered_pro, mlc: e.registered_mlc, status: e.status, owner: `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || '—' };
        }),
      };
    },
  },

  list_inbox: {
    roles: ['admin'],
    description: 'Contact-form messages, optionally by status (unread|read|replied).',
    parameters: { type: 'object', properties: { status: { type: 'string', enum: ['unread', 'read', 'replied'] }, limit: { type: 'integer', minimum: 1, maximum: 50 } } },
    run: async (args) => {
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 15));
      let q = createClient().from('messages').select('id, sender_name, sender_email, subject, status, created_at').order('created_at', { ascending: false }).limit(limit);
      if (typeof args.status === 'string') q = q.eq('status', args.status);
      const { data } = await q;
      return { messages: (data ?? []).map((m) => ({ id: m.id, from: m.sender_name, email: m.sender_email, subject: m.subject, status: m.status, date: m.created_at })) };
    },
  },

  list_subscribers: {
    roles: ['admin'],
    description: 'Newsletter subscriber count + recent signups (optionally by language en|es).',
    parameters: { type: 'object', properties: { audience: { type: 'string', enum: ['all', 'en', 'es'] } } },
    run: async (args) => {
      const sb = createClient();
      const audience = ['en', 'es'].includes(String(args.audience)) ? String(args.audience) : null;
      let cq = sb.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true);
      if (audience) cq = cq.eq('language', audience);
      const { count } = await cq;
      let rq = sb.from('subscribers').select('email, name, language, source, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(10);
      if (audience) rq = rq.eq('language', audience);
      const { data } = await rq;
      return { active_count: count ?? 0, audience: audience ?? 'all', recent: data ?? [] };
    },
  },

  list_agreements: {
    roles: ['admin'],
    description: 'Generated agreements (split sheets / distribution) with signing progress. Optional status filter.',
    parameters: { type: 'object', properties: { status: { type: 'string', enum: ['draft', 'sent', 'partially_signed', 'completed', 'voided'] } } },
    run: async (args) => {
      let q = createClient().from('agreements').select('id, type, title, status, created_at, signers:agreement_signers(status)').order('created_at', { ascending: false }).limit(25);
      if (typeof args.status === 'string') q = q.eq('status', args.status);
      const { data } = await q;
      return {
        agreements: (data ?? []).map((a) => {
          const signers = (a.signers as unknown as { status: string }[]) ?? [];
          return { id: a.id, type: a.type, title: a.title, status: a.status, signed: `${signers.filter((s) => s.status === 'signed').length}/${signers.length}` };
        }),
      };
    },
  },

  get_agreement: {
    roles: ['admin'],
    description: 'One agreement: status + each signer name/email/role/status + their signing link (if not yet signed).',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    run: async (args) => {
      const ag = await loadAgreement(createClient(), String(args.id || ''));
      if (!ag) return { error: 'Agreement not found.' };
      const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');
      return {
        title: ag.title, type: ag.type, status: ag.status,
        signers: (ag.signers ?? []).map((s) => ({ name: s.name, email: s.email, role: s.role, status: s.status, signLink: s.status !== 'signed' ? `${base}/sign/${s.token}` : undefined })),
      };
    },
  },

  get_availability: {
    roles: ['admin'],
    description: 'The weekly booking schedule + any blocked dates.',
    parameters: NO_PARAMS,
    run: async () => {
      const { data } = await createClient().from('availability').select('day_of_week, start_time, end_time, is_blocked, specific_date, buffer_minutes').order('day_of_week', { ascending: true });
      const rows = data ?? [];
      return { weekly: rows.filter((a) => a.specific_date == null), blockedDates: rows.filter((a) => a.specific_date != null).map((b) => b.specific_date) };
    },
  },

  list_resources: {
    roles: ['admin'],
    description: 'Free lead-magnet resources with download counts and active flag.',
    parameters: NO_PARAMS,
    run: async () => {
      const { data } = await createClient().from('resources').select('title, slug, category, is_active, download_count').order('created_at', { ascending: false });
      return { resources: data ?? [] };
    },
  },

  list_campaigns: {
    roles: ['admin'],
    description: 'Past newsletter broadcasts (subject, audience, recipient/sent counts, status, date).',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 25 } } },
    run: async (args) => {
      const limit = Math.min(25, Math.max(1, Number(args.limit) || 10));
      const { data } = await createClient().from('campaigns').select('subject, audience, recipient_count, sent_count, failed_count, status, created_at').order('created_at', { ascending: false }).limit(limit);
      return { campaigns: data ?? [] };
    },
  },

  list_content: {
    roles: ['admin'],
    description: 'List content INCLUDING drafts. kind = releases | events | posts.',
    parameters: { type: 'object', properties: { kind: { type: 'string', enum: ['releases', 'events', 'posts'] }, limit: { type: 'integer', minimum: 1, maximum: 50 } }, required: ['kind'] },
    run: async (args) => {
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
      const sb = createClient();
      if (args.kind === 'releases') {
        const { data } = await sb.from('releases').select('id, title, artist, type, release_date, is_published').order('release_date', { ascending: false }).limit(limit);
        return { items: data ?? [] };
      }
      if (args.kind === 'events') {
        const { data } = await sb.from('events').select('id, title, type, date, location, is_published').order('date', { ascending: false }).limit(limit);
        return { items: data ?? [] };
      }
      const { data } = await sb.from('blog_posts').select('id, title, slug, category, is_published, published_at').order('created_at', { ascending: false }).limit(limit);
      return { items: data ?? [] };
    },
  },

  web_research: {
    roles: ['admin'],
    description:
      'Search the LIVE web for current, factual information/news on a topic and return a sourced summary plus source URLs. ALWAYS use this before drafting a news-based or time-sensitive blog post so the content is current and grounded — never invent recent events. After researching, write the post with create_blog_post and cite the sources.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'What to research, e.g. "latest 2026 news on AI and music publishing royalties"' } }, required: ['query'] },
    run: async (args) => {
      const q = String(args.query || '').trim();
      if (!q) return { error: 'Provide a research query.' };
      const r = await webSearch(q);
      if (!r.ok) return { error: r.error };
      return { findings: r.text, sources: r.sources };
    },
  },

  // ══ Admin writes (preview unless confirm:true) ════════════════════════════
  reply_to_message: {
    roles: ['admin'], mutates: true,
    description: 'Reply to an inbox message — emails the sender and marks it replied. Preview, then confirm.',
    parameters: { type: 'object', properties: { message_id: { type: 'string' }, body: { type: 'string' }, confirm: { type: 'boolean' } }, required: ['message_id', 'body'] },
    run: async (args) => {
      const id = String(args.message_id || ''); const body = String(args.body || '').trim();
      if (!body) return { error: 'Reply body is required.' };
      const sb = createClient();
      const { data: m } = await sb.from('messages').select('sender_name, sender_email, subject').eq('id', id).maybeSingle();
      if (!m) return { error: 'Message not found.' };
      if (args.confirm !== true) return { requires_confirmation: true, summary: `Email a reply to ${m.sender_name} <${m.sender_email}> re: "${m.subject}".`, action: { name: 'reply_to_message', args: { message_id: id, body } } };
      await sendInquiryReply(m.sender_email as string, m.sender_name as string, m.subject as string, body);
      await sb.from('messages').update({ status: 'replied', admin_reply: body, replied_at: new Date().toISOString() }).eq('id', id);
      return { ok: true, message: 'Reply sent.' };
    },
  },

  update_catalog_status: {
    roles: ['admin'], mutates: true,
    description: "Update a catalog entry's registration status (pending|in_progress|registered|issue) + optional notes; emails the client. Preview, then confirm.",
    parameters: { type: 'object', properties: { entry_id: { type: 'string' }, status: { type: 'string', enum: ['pending', 'in_progress', 'registered', 'issue'] }, notes: { type: 'string' }, confirm: { type: 'boolean' } }, required: ['entry_id', 'status'] },
    run: async (args) => {
      const id = String(args.entry_id || ''); const status = String(args.status || '');
      if (!['pending', 'in_progress', 'registered', 'issue'].includes(status)) return { error: 'Invalid status.' };
      const notes = String(args.notes || '');
      const sb = createClient();
      const { data: e } = await sb.from('catalog_entries').select('title, client:profiles(first_name,email)').eq('id', id).maybeSingle();
      if (!e) return { error: 'Catalog entry not found.' };
      if (args.confirm !== true) return { requires_confirmation: true, summary: `Set "${e.title}" to ${status}${notes ? ` (note: ${notes})` : ''} and email the client.`, action: { name: 'update_catalog_status', args: { entry_id: id, status, notes } } };
      const { error } = await sb.from('catalog_entries').update({ status, status_notes: notes || null }).eq('id', id);
      if (error) return { error: error.message };
      const c = e.client as unknown as { first_name?: string; email?: string };
      if (c?.email) await sendCatalogStatusUpdate(c.email, c.first_name ?? '', e.title as string, status, notes).catch(() => {});
      return { ok: true, message: `Catalog entry marked ${status}.` };
    },
  },

  create_release: {
    roles: ['admin'], mutates: true,
    description: 'Create a music release (draft unless published:true). Preview, then confirm.',
    parameters: { type: 'object', properties: { title: { type: 'string' }, artist: { type: 'string' }, type: { type: 'string', enum: ['single', 'ep', 'album'] }, release_date: { type: 'string', description: 'YYYY-MM-DD' }, description: { type: 'string' }, published: { type: 'boolean' }, confirm: { type: 'boolean' } }, required: ['title', 'artist'] },
    run: async (args) => {
      const title = String(args.title || '').trim(); const artist = String(args.artist || '').trim();
      if (!title || !artist) return { error: 'Title and artist are required.' };
      const type = ['single', 'ep', 'album'].includes(String(args.type)) ? String(args.type) : 'single';
      const release_date = args.release_date ? String(args.release_date) : new Date().toISOString().slice(0, 10);
      const published = args.published === true;
      if (args.confirm !== true) return { requires_confirmation: true, summary: `Create ${type} "${title}" by ${artist} (${release_date})${published ? ' — published' : ' — draft'}.`, action: { name: 'create_release', args: { title, artist, type, release_date, description: args.description, published } } };
      const { error } = await createClient().from('releases').insert({ title, artist, type, release_date, description: args.description ? String(args.description) : null, is_published: published });
      if (error) return { error: error.message };
      return { ok: true, message: `Release "${title}" created${published ? ' and published' : ' as a draft'}.` };
    },
  },

  create_event: {
    roles: ['admin'], mutates: true,
    description: 'Create an event (draft unless published:true). type: spotlight|worship|pinstage|meeting|other. Preview, then confirm.',
    parameters: { type: 'object', properties: { title: { type: 'string' }, type: { type: 'string', enum: ['spotlight', 'worship', 'pinstage', 'meeting', 'other'] }, date: { type: 'string', description: 'ISO date/time' }, location: { type: 'string' }, description: { type: 'string' }, published: { type: 'boolean' }, confirm: { type: 'boolean' } }, required: ['title', 'date', 'description'] },
    run: async (args) => {
      const title = String(args.title || '').trim(); const description = String(args.description || '').trim();
      if (!title || !description) return { error: 'Title and description are required.' };
      if (!args.date) return { error: 'An event date is required.' };
      const type = ['spotlight', 'worship', 'pinstage', 'meeting', 'other'].includes(String(args.type)) ? String(args.type) : 'other';
      const published = args.published === true;
      if (args.confirm !== true) return { requires_confirmation: true, summary: `Create ${type} event "${title}" on ${args.date}${published ? ' — published' : ' — draft'}.`, action: { name: 'create_event', args: { title, type, date: args.date, location: args.location, description, published } } };
      const { error } = await createClient().from('events').insert({ title, slug: slugify(title), type, date: new Date(String(args.date)).toISOString(), location: args.location ? String(args.location) : null, description, is_published: published });
      if (error) return { error: error.message };
      return { ok: true, message: `Event "${title}" created${published ? ' and published' : ' as a draft'}.` };
    },
  },

  create_blog_post: {
    roles: ['admin'], mutates: true,
    description: 'Create a CHECKZONE blog/press post (draft unless published:true). Preview, then confirm.',
    parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, excerpt: { type: 'string' }, category: { type: 'string' }, published: { type: 'boolean' }, confirm: { type: 'boolean' } }, required: ['title', 'content'] },
    run: async (args) => {
      const title = String(args.title || '').trim(); const content = String(args.content || '').trim();
      if (!title || !content) return { error: 'Title and content are required.' };
      const excerpt = (args.excerpt ? String(args.excerpt) : content.replace(/<[^>]+>/g, '').slice(0, 160)).trim();
      const published = args.published === true;
      if (args.confirm !== true) return { requires_confirmation: true, summary: `Create post "${title}"${published ? ' — published' : ' — draft'}.`, action: { name: 'create_blog_post', args: { title, content, excerpt, category: args.category, published } } };
      const { error } = await createClient().from('blog_posts').insert({ title, slug: slugify(title), excerpt, content, category: args.category ? String(args.category) : null, is_published: published, published_at: published ? new Date().toISOString() : null });
      if (error) return { error: error.message };
      return { ok: true, message: `Post "${title}" created${published ? ' and published' : ' as a draft'}.` };
    },
  },

  set_publish_status: {
    roles: ['admin'], mutates: true,
    description: 'Publish or unpublish content. entity: release|event|blog_post|artist. Preview, then confirm.',
    parameters: { type: 'object', properties: { entity: { type: 'string', enum: ['release', 'event', 'blog_post', 'artist'] }, id: { type: 'string' }, published: { type: 'boolean' }, confirm: { type: 'boolean' } }, required: ['entity', 'id', 'published'] },
    run: async (args) => {
      const table = ({ release: 'releases', event: 'events', blog_post: 'blog_posts', artist: 'artists' } as Record<string, string>)[String(args.entity)];
      if (!table) return { error: 'Invalid entity.' };
      const id = String(args.id || ''); const published = args.published === true;
      if (args.confirm !== true) return { requires_confirmation: true, summary: `${published ? 'Publish' : 'Unpublish'} ${args.entity} ${id}.`, action: { name: 'set_publish_status', args: { entity: args.entity, id, published } } };
      const updates: Record<string, unknown> = { is_published: published };
      if (table === 'blog_posts' && published) updates.published_at = new Date().toISOString();
      const { error } = await createClient().from(table).update(updates).eq('id', id);
      if (error) return { error: error.message };
      return { ok: true, message: `${args.entity} ${published ? 'published' : 'unpublished'}.` };
    },
  },

  add_brain_knowledge: {
    roles: ['admin'], mutates: true,
    description: "Add an entry to the company brain (X7's knowledge). visibility: public (default) or internal. Preview, then confirm.",
    parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, source_type: { type: 'string' }, visibility: { type: 'string', enum: ['public', 'internal'] }, confirm: { type: 'boolean' } }, required: ['title', 'content'] },
    run: async (args, caller) => {
      const title = String(args.title || '').trim(); const content = String(args.content || '').trim();
      if (!title || !content) return { error: 'Title and content are required.' };
      const visibility = args.visibility === 'internal' ? 'internal' : 'public';
      if (args.confirm !== true) return { requires_confirmation: true, summary: `Add "${title}" to the company brain (${visibility}).`, action: { name: 'add_brain_knowledge', args: { title, content, source_type: args.source_type, visibility } } };
      try { await ingestBrainChunk({ title, content, sourceType: args.source_type ? String(args.source_type) : 'knowledge', visibility, createdBy: caller.userId || undefined }); }
      catch { return { error: 'Could not store the entry (is the AI key configured?).' }; }
      return { ok: true, message: `Added "${title}" to the brain.` };
    },
  },

  update_artist_profile: {
    roles: ['admin'], mutates: true,
    description: "Update an artist's profile / PRO / contact fields (these auto-fill agreements). Preview, then confirm.",
    parameters: { type: 'object', properties: { artist_id: { type: 'string' }, legalName: { type: 'string' }, stageName: { type: 'string' }, address: { type: 'string' }, phone: { type: 'string' }, country: { type: 'string' }, pro: { type: 'string' }, ipiNumber: { type: 'string' }, publisherName: { type: 'string' }, publisherIpi: { type: 'string' }, contactEmail: { type: 'string' }, confirm: { type: 'boolean' } }, required: ['artist_id'] },
    run: async (args) => {
      const id = String(args.artist_id || ''); if (!id) return { error: 'artist_id is required.' };
      const cols: Record<string, string> = { legalName: 'legal_name', stageName: 'stage_name', address: 'address', phone: 'phone', country: 'country', pro: 'pro', ipiNumber: 'ipi_number', publisherName: 'publisher_name', publisherIpi: 'publisher_ipi', contactEmail: 'contact_email' };
      const updates: Record<string, unknown> = {};
      for (const [key, col] of Object.entries(cols)) if (typeof args[key] === 'string' && (args[key] as string).length) updates[col] = args[key];
      if (!Object.keys(updates).length) return { error: 'No profile fields provided to update.' };
      const sb = createClient();
      const { data: a } = await sb.from('artists').select('name').eq('id', id).maybeSingle();
      if (!a) return { error: 'Artist not found.' };
      if (args.confirm !== true) { const { confirm, ...rest } = args; void confirm; return { requires_confirmation: true, summary: `Update ${a.name}'s profile (${Object.keys(updates).join(', ')}).`, action: { name: 'update_artist_profile', args: rest } }; }
      const { error } = await sb.from('artists').update(updates).eq('id', id);
      if (error) return { error: error.message };
      return { ok: true, message: `${a.name}'s profile updated.` };
    },
  },

  create_agreement: {
    roles: ['admin'], mutates: true,
    description: 'Create a split sheet or distribution agreement. data is the type-specific payload; signers each need name + email. Then use send_agreement to email signing links. Preview, then confirm.',
    parameters: {
      type: 'object',
      properties: {
        agreement_type: { type: 'string', enum: ['split_sheet', 'distribution_agreement'] },
        title: { type: 'string' },
        data: { type: 'object', description: 'split_sheet: {songTitle, artists?, producer?, effectiveDate?, recordingVersion?, isrc?, iswc?, writers:[{name, pro?, ipi?, publisher?, publisherIpi?, percentage}]}. distribution_agreement: {artistName, legalName?, address?, email?, phone?, releaseTitle?, territory?, term?, distributionFeePct?, effectiveDate?}' },
        signers: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' }, artistId: { type: 'string' } }, required: ['name', 'email'] } },
        confirm: { type: 'boolean' },
      },
      required: ['agreement_type', 'title', 'data', 'signers'],
    },
    run: async (args, caller) => {
      const parsed = agreementCreateSchema.safeParse({ type: args.agreement_type, title: args.title, data: args.data ?? {}, signers: args.signers ?? [] });
      if (!parsed.success) return { error: 'Invalid input: ' + parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
      const { type, title, data, signers } = parsed.data;
      if (args.confirm !== true) return { requires_confirmation: true, summary: `Create ${type === 'split_sheet' ? 'split sheet' : 'distribution agreement'} "${title}" with ${signers.length} signer(s).`, action: { name: 'create_agreement', args: { agreement_type: type, title, data, signers } } };
      const sb = createClient();
      const { data: ag, error } = await sb.from('agreements').insert({ type, title, data, created_by: caller.userId || null }).select('id').maybeSingle();
      if (error || !ag) return { error: error?.message || 'Could not create the agreement.' };
      const rows = signers.map((s, i) => ({ agreement_id: ag.id, artist_id: s.artistId ?? null, name: s.name, email: s.email, role: s.role ?? null, sort_order: i }));
      const { error: sErr } = await sb.from('agreement_signers').insert(rows);
      if (sErr) { await sb.from('agreements').delete().eq('id', ag.id); return { error: sErr.message }; }
      return { ok: true, message: `Created "${title}". Use send_agreement to email signing links.`, agreement_id: ag.id };
    },
  },

  send_agreement: {
    roles: ['admin'], mutates: true,
    description: 'Email signing links to an agreement\'s pending signers. Preview, then confirm.',
    parameters: { type: 'object', properties: { agreement_id: { type: 'string' }, confirm: { type: 'boolean' } }, required: ['agreement_id'] },
    run: async (args) => {
      const id = String(args.agreement_id || '');
      const sb = createClient();
      const ag = await loadAgreement(sb, id);
      if (!ag) return { error: 'Agreement not found.' };
      const pending = (ag.signers ?? []).filter((s) => s.status !== 'signed');
      if (args.confirm !== true) return { requires_confirmation: true, summary: `Email signing links for "${ag.title}" to ${pending.length} signer(s).`, action: { name: 'send_agreement', args: { agreement_id: id } } };
      if (pending.length === 0) return { error: 'All signers have already signed.' };
      const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');
      const results = await Promise.allSettled(pending.map((s) => sendSignatureRequestEmail(s.email, s.name, ag.title, `${base}/sign/${s.token}`)));
      const sent = results.filter((r) => r.status === 'fulfilled').length;
      const anySigned = (ag.signers ?? []).some((s) => s.status === 'signed');
      await sb.from('agreements').update({ status: anySigned ? 'partially_signed' : 'sent' }).eq('id', id);
      return { ok: true, message: `Sent ${sent} signing link(s).` };
    },
  },
};

export const WRITE_TOOL_NAMES = new Set(Object.entries(TOOLS).filter(([, t]) => t.mutates).map(([n]) => n));

export function toolSpecsForRole(role: Role): LlmTool[] {
  return Object.entries(TOOLS)
    .filter(([, t]) => t.roles.includes(role))
    .map(([name, t]) => ({ type: 'function', function: { name, description: t.description, parameters: t.parameters } }));
}

/**
 * Run a tool with a hard role gate. Caller identity/role comes from the session,
 * never the model. Reads use the request-scoped client (RLS scopes to the caller);
 * writes preview unless allowWrite + confirm.
 */
export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  caller: AgentCaller,
  opts: { allowWrite?: boolean } = {}
): Promise<ToolResult> {
  const tool = TOOLS[name];
  if (!tool) return { error: `Unknown tool: ${name}` };
  if (!tool.roles.includes(caller.role)) return { error: 'You are not allowed to use that capability.' };
  const safeArgs = tool.mutates && !opts.allowWrite ? { ...args, confirm: false } : args;
  try {
    return await tool.run(safeArgs, caller);
  } catch (e) {
    console.error('[agent tool error]', name, e);
    return { error: 'That action could not be completed.' };
  }
}

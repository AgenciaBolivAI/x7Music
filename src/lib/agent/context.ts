import { createClient } from '@/lib/supabase/server';

export type AgentRole = 'public' | 'client' | 'admin';

export interface AgentCaller {
  userId: string;       // '' for anonymous public visitors
  role: AgentRole;
  firstName: string;
}

/**
 * Static business context injected into the system prompt every turn so the
 * agent always knows who/what X7 is. Live data comes from tools.
 */
export async function buildAgentContext(caller: AgentCaller): Promise<string> {
  const sb = createClient();
  const { data: services } = await sb
    .from('services')
    .select('title, price, is_free, duration')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const serviceLines = (services ?? [])
    .map((s) => `- ${s.title}: ${s.is_free ? 'free' : `$${((s.price as number) / 100).toFixed(2)}`}, ${s.duration} min`)
    .join('\n');

  return [
    'BUSINESS: X7 Music Group — a Christian music label, consulting firm, and publishing company founded by Steven Pantojas.',
    'It helps artists, producers, and labels with consulting, distribution, PRO/MLC registration, publishing administration, and catalog auditing.',
    'Brand surfaces: NEXTEP (services), CHECKZONE (music education), Pinstage / X7 Music Spotlight / Night of Worship (event series), X7 Meeting (community gatherings).',
    'Bookable services (live):',
    serviceLines || '- (no active services configured)',
    '',
    caller.role === 'public'
      ? 'CALLER: an anonymous website visitor. You can share public info about X7 and general music-business guidance, and point them to booking a consultation or the free resources. You have NO access to any user account data — if they ask about "my bookings/catalog/account", invite them to log in to the client portal.'
      : `CALLER: ${caller.firstName} (role: ${caller.role}). Address them by name. Never reveal another user's private data to a client.`,
  ].join('\n');
}

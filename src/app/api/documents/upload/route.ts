import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const metaSchema = z.object({
  clientId: z.string().min(1),
  title:    z.string().min(1).max(200),
  type:     z.enum(['invoice','contract','report','receipt','other']).default('other'),
  bookingId:z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return fail('No file uploaded', 400);

  const parsed = metaSchema.safeParse({
    clientId:  String(form.get('clientId') ?? ''),
    title:     String(form.get('title') ?? ''),
    type:      form.get('type') ?? undefined,
    bookingId: form.get('bookingId') ?? undefined,
  });
  if (!parsed.success) {
    return fail('Invalid metadata', 400, { errors: parsed.error.flatten() });
  }

  const { url, size } = await uploadToBlob(file, 'documents', { private: true });

  const row = {
    client_id:   parsed.data.clientId,
    booking_id:  parsed.data.bookingId || null,
    title:       parsed.data.title,
    type:        parsed.data.type,
    file_url:    url,
    file_size:   size,
    uploaded_by: 'admin',
  };

  const sb = createClient();
  const { data, error } = await sb.from('documents').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ document: toCamel(data) }, 201);
});

export const dynamic = 'force-dynamic';

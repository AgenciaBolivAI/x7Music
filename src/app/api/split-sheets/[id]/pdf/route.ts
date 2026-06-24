import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { fail, handler } from '@/lib/api';
import { buildSplitSheetPdf } from '@/lib/splitSheetPdf';

interface SheetWriter {
  name: string;
  role: string;
  pro?: string;
  ipi?: string;
  publisher?: string;
  percentage: number;
}

export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const { data: sheet, error } = await sb
    .from('split_sheets')
    .select('song_title, work_date, notes, writers')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!sheet) return fail('Split sheet not found', 404);

  const writers = (sheet.writers ?? []) as SheetWriter[];
  const pdf = await buildSplitSheetPdf({
    songTitle: sheet.song_title,
    workDate: sheet.work_date,
    notes: sheet.notes,
    writers: writers.map((w) => ({
      name: w.name,
      role: w.role,
      pro: w.pro,
      ipi: w.ipi,
      publisher: w.publisher,
      percentage: w.percentage,
    })),
  });

  const filename = `${sheet.song_title.replace(/[^a-z0-9]+/gi, '-')}-split-sheet.pdf`;
  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
});

export const dynamic = 'force-dynamic';

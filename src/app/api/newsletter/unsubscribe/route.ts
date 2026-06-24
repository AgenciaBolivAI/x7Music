import { createServiceClient } from '@/lib/supabase/service';
import { handler } from '@/lib/api';

// GET /api/newsletter/unsubscribe — public, returns an HTML confirmation page
export const GET = handler(async (req: Request) => {
  const token = String(new URL(req.url).searchParams.get('token') || '');

  const page = (heading: string, message: string) => `
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>X7 Music Group</title></head>
    <body style="margin:0;background:#0A0A0A;font-family:Arial,sans-serif;">
      <div style="max-width:520px;margin:80px auto;background:#141414;border-radius:12px;
                  border-top:3px solid #C0392B;padding:40px;text-align:center;color:#d4d4d4;">
        <h1 style="color:#fff;font-size:22px;margin:0 0 12px;">${heading}</h1>
        <p style="line-height:1.6;margin:0 0 24px;">${message}</p>
        <a href="${process.env.CLIENT_URL || '/'}"
           style="color:#C0392B;text-decoration:none;font-weight:bold;">Return to x7musicgroup.com</a>
      </div>
    </body></html>`;

  if (token) {
    const sb = createServiceClient();
    const { data: sub } = await sb
      .from('subscribers')
      .update({ is_active: false })
      .eq('unsubscribe_token', token)
      .select('id')
      .maybeSingle();
    if (sub) {
      return new Response(
        page('You have been unsubscribed', "You won't receive any more emails from X7 Music Group. You can resubscribe anytime from our website."),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }
  }
  return new Response(
    page('Link not valid', 'This unsubscribe link is invalid or has expired.'),
    { status: 404, headers: { 'Content-Type': 'text/html' } }
  );
});

export const dynamic = "force-dynamic";

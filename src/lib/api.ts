import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

/** Success JSON: { success: true, ...data } */
export function ok(data: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

/** Error JSON: { success: false, message, ...extra } */
export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

/** Zod validation error → 400 with flattened field errors */
export function zodFail(err: ZodError) {
  return NextResponse.json(
    { success: false, message: 'Invalid input', errors: err.flatten() },
    { status: 400 }
  );
}

/**
 * Wrap a route handler so thrown errors become a 500 JSON response
 * (the App Router equivalent of the old Express asyncHandler/errorHandler).
 */
export function handler<Ctx>(
  fn: (req: Request, ctx: Ctx) => Promise<Response>
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      // Log full detail server-side; never leak internals (DB errors, missing-secret
      // messages, stack traces, connection strings) to the client.
      console.error('[API error]', err);
      return fail('Internal server error', 500);
    }
  };
}

import { put, del } from '@vercel/blob';
import crypto from 'crypto';

const ALLOWED = /^(jpe?g|png|gif|webp|pdf|docx?)$/;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Save a multipart-uploaded File to Vercel Blob and return its URL + size.
 * Replaces the old Multer disk storage (Vercel's filesystem is ephemeral).
 *
 * `private` files (documents) get an unguessable, random key so the public blob
 * URL cannot be derived/enumerated; those URLs are never sent to the browser —
 * documents are served only through the authenticated /api/documents/[id]/download proxy.
 */
export async function uploadToBlob(
  file: File,
  folder: string,
  opts: { private?: boolean } = {}
): Promise<{ url: string; size: number }> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ext || !ALLOWED.test(ext)) throw new Error(`File type .${ext} is not allowed`);
  if (file.size > MAX_BYTES) throw new Error('File exceeds the 10MB limit');

  const rand = crypto.randomBytes(12).toString('hex');
  const key = `${folder}/${Date.now()}-${rand}.${ext}`;
  const blob = await put(key, file, {
    access: 'public',
    addRandomSuffix: opts.private === true, // extra unguessable suffix for private docs
  });
  return { url: blob.url, size: file.size };
}

/** Best-effort delete of a previously uploaded blob (ignores errors / non-blob URLs). */
export async function deleteBlob(url?: string): Promise<void> {
  if (!url || !url.includes('blob.vercel-storage.com')) return;
  try {
    await del(url);
  } catch {
    /* ignore */
  }
}

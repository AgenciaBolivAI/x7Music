// Publishing/PRO fields on Artist are PII (used only to auto-fill split sheets):
// legal_name, pro, ipi_number, publisher_name, publisher_ipi, contact_email.
// Never expose them on public artist endpoints — non-admin reads must select only
// the safe columns below. Admin (?all=true) may select '*'.
export const PUBLIC_ARTIST_COLUMNS =
  'id,name,slug,tagline,bio,image_url,streaming_links,social_links,featured_video_url,spotify_embed_url,is_featured,is_published,sort_order,created_at';

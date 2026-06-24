'use client';

import { useEffect } from 'react';

/**
 * Root error boundary — catches errors thrown in the root layout / providers.
 * It REPLACES the root layout, so global CSS and React context are unavailable;
 * everything here must be self-contained with inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const btn: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontWeight: 600,
    fontFamily: 'Inter, system-ui, sans-serif',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '1rem',
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#0A0A0A',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <p style={{ fontSize: '4.5rem', fontWeight: 800, color: '#C0392B', margin: 0, lineHeight: 1 }}>500</p>
        <h1 style={{ fontSize: '1.875rem', margin: '1.5rem 0 0', fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: '#9CA3AF', maxWidth: 420, marginTop: '0.75rem', lineHeight: 1.6 }}>
          An unexpected error occurred. Please try again in a moment.
        </p>
        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={() => reset()} style={{ ...btn, background: '#C0392B', color: '#fff', border: 'none' }}>
            Try again
          </button>
          <a href="/" style={{ ...btn, background: 'transparent', color: '#C0392B', border: '1px solid #C0392B' }}>
            Back to Home
          </a>
        </div>
      </body>
    </html>
  );
}

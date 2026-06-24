import Link from 'next/link';
import type { ReactNode } from 'react';

export interface StatusAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'outline';
}

/**
 * Brand-styled full-screen status/error layout shared by the 404, 500,
 * unauthorized, and maintenance pages. Presentational only (no hooks) so it can
 * be rendered from both server and client components.
 */
export default function StatusScreen({
  code,
  title,
  message,
  actions,
  children,
}: {
  code?: string;
  title: string;
  message: string;
  actions?: StatusAction[];
  children?: ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-black px-6 py-20 text-center">
      <Link href="/" className="mb-12 inline-flex items-center gap-2" aria-label="X7 Music Group">
        <span className="font-heading text-2xl font-bold tracking-tight text-white">X7</span>
        <span className="font-heading text-2xl font-bold text-brand-red">·</span>
        <span className="font-heading text-2xl font-bold text-white">Music Group</span>
      </Link>

      {code ? (
        <p className="font-heading text-7xl md:text-8xl font-black leading-none text-brand-red">{code}</p>
      ) : null}

      <h1 className="mt-6 font-heading text-3xl md:text-4xl font-bold text-white">{title}</h1>
      <p className="mt-4 max-w-md leading-relaxed text-brand-gray-muted">{message}</p>

      {children}

      {actions && actions.length > 0 ? (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {actions.map((a, i) =>
            a.href ? (
              <Link key={i} href={a.href} className={a.variant === 'outline' ? 'btn-outline' : 'btn-primary'}>
                {a.label}
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                onClick={a.onClick}
                className={a.variant === 'outline' ? 'btn-outline' : 'btn-primary'}
              >
                {a.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </main>
  );
}

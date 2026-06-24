'use client';

import { useEffect } from 'react';
import StatusScreen from '@/components/common/StatusScreen';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Segment-level error boundary (runtime errors below the root layout). Renders
 * inside the root layout, so i18n + brand styling are available.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code={t('status.error.code')}
      title={t('status.error.title')}
      message={t('status.error.message')}
      actions={[
        { label: t('status.tryAgain'), onClick: () => reset() },
        { label: t('status.backHome'), href: '/', variant: 'outline' },
      ]}
    />
  );
}

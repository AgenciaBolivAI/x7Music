'use client';

import StatusScreen from '@/components/common/StatusScreen';
import { useLanguage } from '@/context/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <StatusScreen
      code={t('status.notFound.code')}
      title={t('status.notFound.title')}
      message={t('status.notFound.message')}
      actions={[
        { label: t('status.backHome'), href: '/' },
        { label: t('status.contactSupport'), href: '/contact', variant: 'outline' },
      ]}
    />
  );
}

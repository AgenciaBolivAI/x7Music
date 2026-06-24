'use client';

import StatusScreen from '@/components/common/StatusScreen';
import { useLanguage } from '@/context/LanguageContext';

export default function MaintenancePage() {
  const { t } = useLanguage();
  return (
    <StatusScreen
      title={t('status.maintenance.title')}
      message={t('status.maintenance.message')}
      actions={[{ label: t('status.tryAgain'), href: '/' }]}
    />
  );
}

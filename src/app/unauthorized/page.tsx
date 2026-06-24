'use client';

import StatusScreen from '@/components/common/StatusScreen';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

export default function UnauthorizedPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  return (
    <StatusScreen
      code={t('status.unauthorized.code')}
      title={t('status.unauthorized.title')}
      message={t('status.unauthorized.message')}
      actions={
        isAuthenticated
          ? [
              { label: t('nav.myPortal'), href: '/portal' },
              { label: t('status.backHome'), href: '/', variant: 'outline' },
            ]
          : [
              { label: t('status.goToLogin'), href: '/login' },
              { label: t('status.backHome'), href: '/', variant: 'outline' },
            ]
      }
    />
  );
}

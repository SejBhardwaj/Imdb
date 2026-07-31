/**
 * Appearance Settings Page
 */

import { ThemeSettingsPage } from '@/components/theme/ThemeSettingsPage';

export const metadata = {
  title: 'Appearance Settings — IMDb',
  description: 'Customize how the application looks and feels',
};

export default function AppearancePage() {
  return <ThemeSettingsPage />;
}

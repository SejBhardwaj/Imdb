/**
 * Route Theme Provider
 * 
 * Applies route-specific theme overrides
 */

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useThemeEnhanced } from '@/lib/theme/ThemeContextEnhanced';
import { getRouteThemeOverride } from '@/lib/theme/routeOverrides';

export function RouteThemeProvider() {
  const pathname = usePathname();
  const { setTheme } = useThemeEnhanced();

  useEffect(() => {
    const override = getRouteThemeOverride(pathname);
    
    if (override && override.theme) {
      setTheme(override.theme);
    }
  }, [pathname, setTheme]);

  return null;
}

/**
 * Theme Repository
 * Database operations for user theme preferences
 */

import { prisma } from '@/lib/database/prisma';
import type { ThemeMode, AccentColor } from '@/lib/theme/types';

export interface UserThemePreferences {
  theme: ThemeMode;
  resolvedTheme?: string;
  accentColor: AccentColor;
  highContrastEnabled: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  strongFocusRings: boolean;
  fontScale: number;
  animations: boolean;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
  autoScheduleEnabled: boolean;
  autoScheduleSunrise?: string;
  autoScheduleSunset?: string;
  deviceId?: string;
  lastSyncedAt: Date;
  updatedAt: Date;
}

export class ThemeRepository {
  /**
   * Get user theme preferences
   */
  async getPreferences(userId: string): Promise<UserThemePreferences | null> {
    try {
      const prefs = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!prefs) return null;

      return {
        theme: prefs.theme as ThemeMode,
        resolvedTheme: prefs.resolvedTheme || undefined,
        accentColor: prefs.accentColor as AccentColor,
        highContrastEnabled: prefs.highContrastEnabled,
        reducedMotion: prefs.reducedMotion,
        largeText: prefs.largeText,
        strongFocusRings: prefs.strongFocusRings,
        fontScale: prefs.fontScale,
        animations: prefs.animations,
        borderRadius: prefs.borderRadius as any,
        density: prefs.density as any,
        autoScheduleEnabled: prefs.autoScheduleEnabled,
        autoScheduleSunrise: prefs.autoScheduleSunrise || undefined,
        autoScheduleSunset: prefs.autoScheduleSunset || undefined,
        deviceId: prefs.deviceId || undefined,
        lastSyncedAt: prefs.lastSyncedAt,
        updatedAt: prefs.updatedAt,
      };
    } catch (error) {
      console.error('Failed to get theme preferences:', error);
      return null;
    }
  }

  /**
   * Update user theme preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<UserThemePreferences>,
    deviceId?: string
  ): Promise<UserThemePreferences> {
    const data: any = {
      ...preferences,
      deviceId,
      lastSyncedAt: new Date(),
    };

    const updated = await prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return {
      theme: updated.theme as ThemeMode,
      resolvedTheme: updated.resolvedTheme || undefined,
      accentColor: updated.accentColor as AccentColor,
      highContrastEnabled: updated.highContrastEnabled,
      reducedMotion: updated.reducedMotion,
      largeText: updated.largeText,
      strongFocusRings: updated.strongFocusRings,
      fontScale: updated.fontScale,
      animations: updated.animations,
      borderRadius: updated.borderRadius as any,
      density: updated.density as any,
      autoScheduleEnabled: updated.autoScheduleEnabled,
      autoScheduleSunrise: updated.autoScheduleSunrise || undefined,
      autoScheduleSunset: updated.autoScheduleSunset || undefined,
      deviceId: updated.deviceId || undefined,
      lastSyncedAt: updated.lastSyncedAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete user preferences (on logout/account deletion)
   */
  async deletePreferences(userId: string): Promise<void> {
    try {
      await prisma.userPreferences.delete({
        where: { userId },
      });
    } catch (error) {
      // Preferences might not exist
      console.warn('Failed to delete preferences:', error);
    }
  }

  /**
   * Track theme analytics
   */
  async trackThemeSwitch(
    userId: string | null,
    from: string | null,
    to: string,
    deviceType?: string
  ): Promise<void> {
    try {
      await prisma.themeAnalytics.create({
        data: {
          userId: userId || undefined,
          theme: to,
          switchedFrom: from || undefined,
          switchedTo: to,
          deviceType,
        },
      });
    } catch (error) {
      // Analytics should not block
      console.warn('Failed to track theme switch:', error);
    }
  }

  /**
   * Get theme analytics for user
   */
  async getAnalytics(userId: string, limit: number = 50) {
    return prisma.themeAnalytics.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

export const themeRepository = new ThemeRepository();

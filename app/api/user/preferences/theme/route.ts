/**
 * Theme Preferences API
 * 
 * GET    /api/user/preferences/theme - Get current preferences
 * PATCH  /api/user/preferences/theme - Update preferences
 * DELETE /api/user/preferences/theme - Reset to defaults
 */

import { NextRequest, NextResponse } from 'next/server';
import { themeRepository } from '@/repositories/ThemeRepository';
import { cookies } from 'next/headers';
import { THEME_COOKIE_NAME } from '@/lib/theme/constants';

/**
 * Get user theme preferences
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from session/auth (mock for now)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const preferences = await themeRepository.getPreferences(userId);

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    console.error('GET /api/user/preferences/theme error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

/**
 * Update user theme preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get user ID from session/auth
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const deviceId = request.headers.get('x-device-id') || undefined;

    // Validate body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update preferences in database
    const updated = await themeRepository.updatePreferences(
      userId,
      body,
      deviceId
    );

    // Update cookie to match
    if (body.theme) {
      const cookieStore = cookies();
      cookieStore.set(THEME_COOKIE_NAME, body.theme, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    // Track analytics
    if (body.theme) {
      await themeRepository.trackThemeSwitch(
        userId,
        body.previousTheme || null,
        body.theme,
        request.headers.get('user-agent') || undefined
      );
    }

    // Broadcast to other devices (SSE)
    await broadcastThemeUpdate(userId, updated, deviceId);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('PATCH /api/user/preferences/theme error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

/**
 * Reset theme preferences to defaults
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await themeRepository.deletePreferences(userId);

    // Clear cookie
    const cookieStore = cookies();
    cookieStore.delete(THEME_COOKIE_NAME);

    return NextResponse.json({
      success: true,
      message: 'Preferences reset to defaults',
    });
  } catch (error: any) {
    console.error('DELETE /api/user/preferences/theme error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset preferences' },
      { status: 500 }
    );
  }
}

/**
 * Broadcast theme update to connected clients via SSE
 */
async function broadcastThemeUpdate(
  userId: string,
  preferences: any,
  deviceId?: string
) {
  try {
    // Import the broadcaster from SSE endpoint
    const { broadcastThemeUpdate: broadcaster } = await import('./sync/route');
    
    if (broadcaster) {
      broadcaster(userId, preferences, deviceId);
    }
  } catch (error) {
    console.error('Failed to broadcast theme update:', error);
  }
}

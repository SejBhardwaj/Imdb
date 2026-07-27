/**
 * Watchlist API Endpoint
 * 
 * GET: Fetch user's watchlist from Firestore
 * POST: Add movie to watchlist
 * DELETE: Remove movie from watchlist
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase/admin';

/**
 * GET /api/watchlist - Fetch watchlist
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'anonymous';
    
    if (!userId || userId === 'anonymous') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const admin = await initAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      );
    }
    
    const db = getFirestore();
    const watchlistDoc = await db.collection('watchlists').doc(userId).get();
    
    if (!watchlistDoc.exists) {
      return NextResponse.json({
        userId,
        movieIds: [],
        items: [],
        lastSynced: Date.now(),
      });
    }
    
    const data = watchlistDoc.data();
    
    return NextResponse.json({
      userId,
      movieIds: data?.movieIds || [],
      items: data?.items || [],
      lastSynced: data?.lastSynced || Date.now(),
    });
    
  } catch (error) {
    console.error('GET watchlist error:', error);
    return NextResponse.json(
      { error: 'Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/watchlist - Add movie
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'anonymous';
    
    if (!userId || userId === 'anonymous') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { movieId, timestamp, deviceId } = body;
    
    if (!movieId || !timestamp || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const admin = await initAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      );
    }
    
    const db = getFirestore();
    const watchlistRef = db.collection('watchlists').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const watchlistDoc = await transaction.get(watchlistRef);
      const data = watchlistDoc.data();
      
      const items = data?.items || [];
      const movieIds = data?.movieIds || [];
      
      // Check if already exists
      const exists = items.some((item: any) => item.movieId === movieId);
      
      if (!exists) {
        items.push({
          movieId,
          addedAt: timestamp,
          lastModified: timestamp,
          deviceId,
        });
        
        movieIds.push(movieId);
      }
      
      transaction.set(watchlistRef, {
        userId,
        movieIds,
        items,
        lastSynced: Date.now(),
      }, { merge: true });
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('POST watchlist error:', error);
    return NextResponse.json(
      { error: 'Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/watchlist - Remove movie
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'anonymous';
    
    if (!userId || userId === 'anonymous') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const movieId = parseInt(searchParams.get('movieId') || '0');
    
    if (!movieId) {
      return NextResponse.json(
        { error: 'Missing movieId' },
        { status: 400 }
      );
    }
    
    const admin = await initAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      );
    }
    
    const db = getFirestore();
    const watchlistRef = db.collection('watchlists').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const watchlistDoc = await transaction.get(watchlistRef);
      const data = watchlistDoc.data();
      
      const items = (data?.items || []).filter((item: any) => item.movieId !== movieId);
      const movieIds = (data?.movieIds || []).filter((id: number) => id !== movieId);
      
      transaction.set(watchlistRef, {
        userId,
        movieIds,
        items,
        lastSynced: Date.now(),
      }, { merge: true });
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('DELETE watchlist error:', error);
    return NextResponse.json(
      { error: 'Server Error' },
      { status: 500 }
    );
  }
}

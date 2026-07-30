/**
 * Batch Sync API Endpoint
 * 
 * Handles batch synchronization of watchlist operations
 * Implements Last-Write-Wins conflict resolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase/admin';
import { validateBatchSyncRequest, type SyncOperation } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate with Zod
    const validatedData = validateBatchSyncRequest(body);
    const { operations, deviceId } = validatedData;
    
    // Get user ID from auth (you'll need to implement auth middleware)
    // For now, we'll use a mock user ID
    const userId = request.headers.get('x-user-id') || 'anonymous';
    
    if (!userId || userId === 'anonymous') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Initialize Firebase Admin
    const admin = await initAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server Error', message: 'Firebase not configured' },
        { status: 500 }
      );
    }
    
    const db = getFirestore();
    const watchlistRef = db.collection('watchlists').doc(userId);
    
    const processed: string[] = [];
    const failed: string[] = [];
    const conflicts: Array<{ operationId: string; reason: string; serverTimestamp: number }> = [];
    
    // Process operations in transaction
    await db.runTransaction(async (transaction) => {
      // Get current watchlist
      const watchlistDoc = await transaction.get(watchlistRef);
      const currentData = watchlistDoc.data();
      
      // Initialize if doesn't exist
      let watchlistItems: Record<number, { movieId: number; addedAt: number; lastModified: number; deviceId: string }> = {};
      
      if (currentData?.items) {
        // Convert array to map for easier lookup
        currentData.items.forEach((item: any) => {
          watchlistItems[item.movieId] = item;
        });
      }
      
      // Process each operation
      for (const op of operations) {
        try {
          const existingItem = watchlistItems[op.movieId];
          
          if (op.action === 'add') {
            // Check for conflict
            if (existingItem) {
              // Last-Write-Wins: compare timestamps
              if (op.timestamp > existingItem.lastModified) {
                // Client wins - update
                watchlistItems[op.movieId] = {
                  movieId: op.movieId,
                  addedAt: existingItem.addedAt, // Keep original addedAt
                  lastModified: op.timestamp,
                  deviceId: op.deviceId,
                };
                processed.push(op.id);
              } else {
                // Server wins - report conflict
                conflicts.push({
                  operationId: op.id,
                  reason: 'Server has newer timestamp',
                  serverTimestamp: existingItem.lastModified,
                });
                failed.push(op.id);
              }
            } else {
              // No conflict - add new
              watchlistItems[op.movieId] = {
                movieId: op.movieId,
                addedAt: op.timestamp,
                lastModified: op.timestamp,
                deviceId: op.deviceId,
              };
              processed.push(op.id);
            }
          } else if (op.action === 'remove') {
            // Check for conflict
            if (existingItem) {
              // Last-Write-Wins: compare timestamps
              if (op.timestamp > existingItem.lastModified) {
                // Client wins - remove
                delete watchlistItems[op.movieId];
                processed.push(op.id);
              } else {
                // Server wins - report conflict
                conflicts.push({
                  operationId: op.id,
                  reason: 'Server has newer timestamp',
                  serverTimestamp: existingItem.lastModified,
                });
                failed.push(op.id);
              }
            } else {
              // Already removed - no conflict
              processed.push(op.id);
            }
          }
        } catch (error) {
          console.error(`Error processing operation ${op.id}:`, error);
          failed.push(op.id);
        }
      }
      
      // Convert map back to array
      const updatedItems = Object.values(watchlistItems);
      
      // Update Firestore
      transaction.set(watchlistRef, {
        userId,
        movieIds: updatedItems.map(item => item.movieId),
        items: updatedItems,
        lastSynced: Date.now(),
        lastModifiedBy: deviceId,
      }, { merge: true });
    });
    
    // Return response
    return NextResponse.json({
      success: true,
      processed: processed.length,
      failed,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    });
    
  } catch (error) {
    console.error('Batch sync error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation Error', message: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Server Error', message: 'Failed to sync watchlist' },
      { status: 500 }
    );
  }
}

/**
 * useReviewDraft Hook
 * 
 * Autosave draft management (like Google Docs)
 * Saves every 2 seconds, restores on mount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReviewRepository } from '@/repositories/ReviewRepository';
import type { ReviewDraft } from '@/types/review';

interface DraftData {
  rating: number;
  title: string;
  content: string;
}

interface UseReviewDraftOptions {
  userId: string;
  movieId: number;
  autoSaveInterval?: number; // milliseconds
  enabled?: boolean;
}

export function useReviewDraft({
  userId,
  movieId,
  autoSaveInterval = 2000, // 2 seconds
  enabled = true,
}: UseReviewDraftOptions) {
  const [draft, setDraft] = useState<DraftData>({
    rating: 5,
    title: '',
    content: '',
  });

  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const previousDraftRef = useRef<DraftData>(draft);

  /**
   * Load draft on mount
   */
  useEffect(() => {
    if (!enabled) return;

    const loadDraft = async () => {
      const result = await ReviewRepository.loadDraft(userId, movieId);
      
      if (result.success && result.data) {
        setDraft({
          rating: result.data.rating,
          title: result.data.title,
          content: result.data.content,
        });
        setLastSaved(result.data.savedAt);
        previousDraftRef.current = {
          rating: result.data.rating,
          title: result.data.title,
          content: result.data.content,
        };
        console.log('[Draft] Loaded existing draft');
      }
    };

    loadDraft();
  }, [userId, movieId, enabled]);

  /**
   * Save draft to IndexedDB
   */
  const saveDraft = useCallback(async () => {
    if (!enabled) return;

    // Check if draft has meaningful content
    if (!draft.title.trim() && !draft.content.trim()) {
      return; // Don't save empty drafts
    }

    // Check if draft actually changed
    const hasChanged = 
      draft.rating !== previousDraftRef.current.rating ||
      draft.title !== previousDraftRef.current.title ||
      draft.content !== previousDraftRef.current.content;

    if (!hasChanged) {
      return;
    }

    setDraftStatus('saving');

    const result = await ReviewRepository.saveDraft({
      movieId,
      userId,
      rating: draft.rating,
      title: draft.title,
      content: draft.content,
      syncStatus: 'pending',
    });

    if (result.success) {
      setDraftStatus('saved');
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);
      previousDraftRef.current = { ...draft };
      console.log('[Draft] Saved successfully');
    } else {
      setDraftStatus('error');
      console.error('[Draft] Failed to save:', result.error);
    }

    // Reset status after 2 seconds
    setTimeout(() => {
      setDraftStatus('idle');
    }, 2000);
  }, [draft, userId, movieId, enabled]);

  /**
   * Auto-save timer
   */
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [draft, hasUnsavedChanges, autoSaveInterval, saveDraft, enabled]);

  /**
   * Update draft and mark as unsaved
   */
  const updateDraft = useCallback((updates: Partial<DraftData>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Clear draft
   */
  const clearDraft = useCallback(async () => {
    await ReviewRepository.deleteDraft(userId, movieId);
    setDraft({ rating: 5, title: '', content: '' });
    setLastSaved(null);
    setHasUnsavedChanges(false);
    previousDraftRef.current = { rating: 5, title: '', content: '' };
    console.log('[Draft] Cleared');
  }, [userId, movieId]);

  /**
   * Force save (manual trigger)
   */
  const forceSave = useCallback(() => {
    return saveDraft();
  }, [saveDraft]);

  /**
   * Get save status text
   */
  const getSaveStatusText = useCallback(() => {
    if (draftStatus === 'saving') return 'Saving...';
    if (draftStatus === 'saved') return 'Saved';
    if (draftStatus === 'error') return 'Save failed';
    if (hasUnsavedChanges) return 'Unsaved changes';
    if (lastSaved) {
      const seconds = Math.floor((Date.now() - lastSaved) / 1000);
      if (seconds < 60) return `Saved ${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      return `Saved ${minutes}m ago`;
    }
    return 'No draft';
  }, [draftStatus, hasUnsavedChanges, lastSaved]);

  return {
    draft,
    updateDraft,
    clearDraft,
    forceSave,
    draftStatus,
    lastSaved,
    hasUnsavedChanges,
    saveStatusText: getSaveStatusText(),
  };
}

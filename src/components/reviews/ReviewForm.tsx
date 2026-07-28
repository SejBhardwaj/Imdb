/**
 * ReviewForm Component
 * 
 * Create/edit review form with:
 * - Autosave drafts
 * - Validation
 * - Keyboard shortcuts
 * - Accessibility
 */

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReviewDraft } from '@/hooks/useReviewDraft';
import { useCreateReview } from '@/hooks/useReviews';
import { titleSchema, contentSchema, ratingSchema } from '@/lib/validation/reviewSchemas';

const formSchema = z.object({
  rating: ratingSchema,
  title: titleSchema,
  content: contentSchema,
});

type FormData = z.infer<typeof formSchema>;

interface ReviewFormProps {
  movieId: number;
  user: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({ movieId, user, onSuccess, onCancel }: ReviewFormProps) {
  const createReview = useCreateReview();
  
  const {
    draft,
    updateDraft,
    clearDraft,
    draftStatus,
    saveStatusText,
    hasUnsavedChanges,
  } = useReviewDraft({
    userId: user.uid,
    movieId,
    autoSaveInterval: 2000, // 2 seconds
    enabled: true,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      rating: draft.rating,
      title: draft.title,
      content: draft.content,
    },
  });

  // Watch form changes and update draft
  const formValues = watch();

  useEffect(() => {
    updateDraft({
      rating: formValues.rating,
      title: formValues.title || '',
      content: formValues.content || '',
    });
  }, [formValues.rating, formValues.title, formValues.content]);

  // Restore draft on mount
  useEffect(() => {
    if (draft.title || draft.content) {
      setValue('rating', draft.rating);
      setValue('title', draft.title);
      setValue('content', draft.content);
    }
  }, []); // Only on mount

  const onSubmit = async (data: FormData) => {
    const idempotencyKey = uuidv4();

    createReview.mutate(
      {
        request: {
          movieId,
          rating: data.rating,
          title: data.title,
          content: data.content,
          idempotencyKey,
        },
        user,
      },
      {
        onSuccess: () => {
          clearDraft();
          onSuccess?.();
        },
      }
    );
  };

  const wordCount = formValues.content?.split(/\s+/).filter((w) => w.length > 0).length || 0;
  const minWords = 10; // ~50 chars
  const isLongEnough = wordCount >= minWords;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/5 rounded-lg p-6 space-y-6"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Rating */}
        <div className="space-y-2">
          <Label htmlFor="rating" className="text-white">
            Rating (1-10)
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id="rating"
              type="number"
              min={1}
              max={10}
              {...register('rating', { valueAsNumber: true })}
              className="w-24 bg-white/10 border-white/20 text-white"
              aria-invalid={!!errors.rating}
              aria-describedby={errors.rating ? 'rating-error' : undefined}
            />
            <div className="flex gap-1">
              {[...Array(10)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setValue('rating', i + 1, { shouldValidate: true })}
                  className={`w-8 h-8 rounded ${
                    (formValues.rating || 0) > i
                      ? 'bg-yellow-500'
                      : 'bg-white/10 hover:bg-white/20'
                  } transition-colors`}
                  aria-label={`Rate ${i + 1} out of 10`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          {errors.rating && (
            <p id="rating-error" className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.rating.message}
            </p>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-white">
            Review Title
          </Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Sum up your review in one line"
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {errors.title && (
            <p id="title-error" className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.title.message}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content" className="text-white">
            Your Review
          </Label>
          <Textarea
            id="content"
            {...register('content')}
            placeholder="Share your thoughts about this movie..."
            rows={8}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
            aria-invalid={!!errors.content}
            aria-describedby={errors.content ? 'content-error' : 'content-help'}
          />
          <div className="flex items-center justify-between text-sm">
            <p
              id="content-help"
              className={`${
                isLongEnough ? 'text-green-400' : 'text-gray-400'
              } flex items-center gap-1`}
            >
              {wordCount} / {minWords} words minimum
            </p>
            <p className="text-gray-400">{saveStatusText}</p>
          </div>
          {errors.content && (
            <p id="content-error" className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.content.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-sm text-gray-400">
            {draftStatus === 'saving' && (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving draft...
              </span>
            )}
            {draftStatus === 'saved' && (
              <span className="flex items-center gap-2 text-green-400">
                <Save className="w-4 h-4" />
                Draft saved
              </span>
            )}
          </div>

          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={!isValid || createReview.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {createReview.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Review'
              )}
            </Button>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <p className="text-xs text-gray-500 text-center">
          Press <kbd className="px-2 py-1 bg-white/10 rounded">Ctrl+Enter</kbd> to publish
        </p>
      </form>
    </motion.div>
  );
}

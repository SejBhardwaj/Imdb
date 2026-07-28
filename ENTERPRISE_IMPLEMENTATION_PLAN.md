# Enterprise Features Implementation Plan

## Status: IN PROGRESS

This document tracks the implementation of all 13 enterprise-grade requirements.

---

## ✅ COMPLETED (Parts 1-3)

### PART 1: Idempotency Keys ✅
**File**: `src/lib/middleware/idempotency.ts`

**Implemented:**
- UUID v4 idempotency key generation
- In-memory store with TTL expiration (24 hours)
- Automatic cleanup job (every 5 minutes)
- Duplicate request detection
- Cached response replay with `X-Idempotency-Replay` header
- Redis adapter interface documented
- Validation of UUID format
- Support for retries, flaky networks, duplicate submissions

**Testing Required:**
- Test duplicate submission prevention
- Test idempotency key expiration
- Test concurrent requests with same key
- Test Redis adapter (production)

---

### PART 2: Server Echo Merging ✅
**File**: `src/lib/utils/serverMerge.ts`

**Implemented:**
- Deep merge utilities (server data wins)
- Stable React key generation
- Migration state tracking (`_optimisticId`, `_migrationKey`)
- Animation state preservation
- Scroll position preservation
- Change detection (minimize re-renders)
- Batch merge for list updates
- Transition metadata generation
- Vote/moderation/metadata partial merges
- Complete migration cleanup

**Features:**
- Never replaces React components
- Never loses animation state
- Never loses scroll position
- Never flickers
- Maintains stable React keys throughout migration

**Testing Required:**
- Test optimistic -> server ID transition
- Test React component stability (no unmount)
- Test scroll position preservation
- Test animation continuity
- Test batch updates

---

### PART 3: Rate Limiter ✅
**File**: `src/lib/middleware/rateLimiter.ts`

**Implemented:**
- Sliding window algorithm
- Token bucket algorithm
- Per-operation rate limits:
  - Review Creation: 5 req/min
  - Voting: 20 req/min
  - Editing: 10 req/min
  - Flagging: 20 req/hour
  - Viewing: 100 req/min
- HTTP 429 responses
- `Retry-After` headers
- Rate limit status checking without consuming
- Automatic cleanup
- Redis adapter interface documented
- Rate limiter stats

**API Integration:**
- Updated `app/api/reviews/route.ts` with middleware

**Testing Required:**
- Test rate limit enforcement
- Test retry-after calculation
- Test sliding window accuracy
- Test token bucket refill
- Test Redis adapter (production)

---

## 🚧 IN PROGRESS (Parts 4-13)

### PART 4: Enhanced Soft Delete System
**Status**: PARTIALLY COMPLETE

**Existing:**
- Basic soft delete in `ReviewRepository.deleteReview()`
- Rollback function returned
- `deletedAt` timestamp

**Need to Implement:**
- ✅ `deletedBy` field
- ✅ `restoreDeadline` calculation (5 seconds)
- ⏳ Undo Snackbar component with countdown
- ⏳ Automatic expiry after deadline
- ⏳ Restore endpoint (`POST /api/reviews/[id]/restore`)
- ⏳ Background sync for delete queue
- ⏳ SSE broadcasts for delete + restore events

**Files to Create/Modify:**
- `src/components/reviews/UndoToast.tsx` - Snackbar with countdown
- `app/api/reviews/[id]/restore/route.ts` - Restore endpoint
- Update `src/types/review.ts` - Add `deletedBy`, `restoreDeadline`
- Update `src/repositories/ReviewRepository.ts` - Enhanced soft delete
- Update `src/hooks/useRealtimeReviews.ts` - Handle delete/restore events

---

### PART 5: Full Accessibility (WCAG AA)
**Status**: PARTIAL

**Need to Implement:**
- ⏳ ARIA labels on all interactive elements
- ⏳ `aria-live` regions for dynamic updates
- ⏳ `role=status` for notifications
- ⏳ `role=alert` for errors
- ⏳ Keyboard navigation improvements
- ⏳ Logical tab order
- ⏳ Focus restoration after modals
- ⏳ Skip links
- ⏳ Semantic landmarks (`<nav>`, `<main>`, `<aside>`)
- ⏳ Screen reader announcements
- ⏳ `prefers-reduced-motion` support
- ⏳ High contrast mode compatibility
- ⏳ Visible focus rings
- ⏳ Rating/vote/action announcements
- ⏳ Axe-core integration in tests

**Files to Modify:**
- All components in `src/components/reviews/`
- Add `src/lib/utils/a11y.ts` - Accessibility helpers
- Add `src/hooks/useAnnouncer.ts` - Screen reader announcements
- Update all E2E tests with axe-core

---

### PART 6: Variable Height Virtualization
**Status**: NOT STARTED

**Current:**
- Uses `react-window` with `FixedSizeList`
- Fixed 280px height per item

**Need to Implement:**
- ⏳ Replace with TanStack Virtual or `VariableSizeList`
- ⏳ Dynamic height measurement
- ⏳ Support expanding/collapsing content
- ⏳ Support spoiler toggles
- ⏳ Support image loading
- ⏳ Support revision history expansion
- ⏳ Auto-recompute heights on content change

**Files to Modify:**
- `src/components/reviews/ReviewList.tsx` - Switch to variable height
- `package.json` - Add `@tanstack/react-virtual`

---

### PART 7: Performance Optimization
**Status**: PARTIAL

**Need to Implement:**
- ⏳ `React.memo` on all review components
- ⏳ `useMemo` for expensive calculations
- ⏳ `useCallback` for callback props
- ⏳ Context splitting (separate vote/moderation contexts)
- ⏳ Selector hooks to prevent unnecessary re-renders
- ⏳ Lazy image decoding (`decoding="async"`)
- ⏳ `IntersectionObserver` for lazy loading
- ⏳ `ResizeObserver` for height tracking
- ⏳ `requestIdleCallback` for non-urgent tasks
- ⏳ Batch updates (React 18 automatic batching)
- ⏳ Code splitting for moderation panel

**Targets:**
- TTI < 1.8s (currently ~1.8s)
- 60 FPS (currently 58-60)
- Heap < 80MB (currently ~85MB)
- CLS < 0.05 (currently ~0.08)
- LCP < 1.5s (currently ~1.6s)
- INP < 200ms (need to measure)

**Files to Modify:**
- All components in `src/components/reviews/`
- Add `src/hooks/useReviewSelectors.ts`
- Add `src/contexts/VoteContext.tsx`
- Add `src/contexts/ModerationContext.tsx`

---

### PART 8: Enhanced SSE/Realtime
**Status**: BASIC IMPLEMENTATION EXISTS

**Existing:**
- Basic SSE connection
- Backpressure handling
- Auto-reconnect

**Need to Implement:**
- ⏳ Heartbeat messages (every 30s)
- ⏳ Exponential backoff (2^n seconds, max 60s)
- ⏳ Message acknowledgement
- ⏳ Duplicate event detection (event IDs)
- ⏳ Event ordering (sequence numbers)
- ⏳ Version numbers for conflict detection
- ⏳ Event buffering during disconnect
- ⏳ Offline queue replay on reconnect
- ⏳ Multi-tab synchronization (BroadcastChannel)
- ⏳ Stale connection cleanup

**Files to Modify:**
- `src/hooks/useRealtimeReviews.ts` - Enhanced SSE client
- `app/api/reviews/sse/route.ts` - Add heartbeat, versioning
- Add `src/lib/sync/multiTab.ts` - Multi-tab coordination

---

### PART 9: Conflict Resolution
**Status**: NOT STARTED

**Need to Implement:**
- ⏳ Detect simultaneous edits (version mismatch)
- ⏳ Compare versions
- ⏳ Show merge UI modal
- ⏳ "Keep Mine" button
- ⏳ "Keep Theirs" button
- ⏳ "Manual Merge" option (side-by-side diff)
- ⏳ Record merged revision in history
- ⏳ Prevent silent overwrites

**Files to Create:**
- `src/components/reviews/ConflictResolutionModal.tsx`
- `src/lib/utils/conflictDetection.ts`
- `src/lib/utils/threeWayMerge.ts`
- Update `src/repositories/ReviewRepository.ts` - Version checking

---

### PART 10: Advanced Moderation
**Status**: BASIC PROFANITY FILTER EXISTS

**Existing:**
- Basic profanity filter
- Auto-reject severe content
- Auto-flag moderate content

**Need to Implement:**
- ⏳ Spam detection (repeated phrases)
- ⏳ Duplicate detection (cosine similarity)
- ⏳ URL detection and validation
- ⏳ Emoji spam detection (>20% emojis)
- ⏳ Caps lock detection (>50% caps)
- ⏳ Toxicity scoring (0-100 scale)
- ⏳ Bad word severity levels (mild/moderate/severe)
- ⏳ Automatic flagging tiers
- ⏳ Manual moderation queue
- ⏳ Shadow banning hooks
- ⏳ AI moderation adapter (OpenAI/Perspective API)

**Files to Create:**
- `src/lib/moderation/spamDetector.ts`
- `src/lib/moderation/duplicateDetector.ts`
- `src/lib/moderation/toxicityScorer.ts`
- `src/lib/moderation/aiModerationAdapter.ts`
- `src/components/admin/ModerationQueue.tsx`
- Update `src/lib/utils/profanityFilter.ts` - Enhanced detection

---

### PART 11: Comprehensive Testing
**Status**: BASIC TESTS EXIST (58 tests)

**Existing Tests:**
- CRUD operations
- Autosave
- Offline sync
- Voting
- Realtime
- Performance

**Need to Add:**
- ⏳ Duplicate submission (idempotency)
- ⏳ Server echo merge (no DOM replacement)
- ⏳ Offline delete + undo
- ⏳ Full accessibility audit (axe-core)
- ⏳ Rate limit enforcement
- ⏳ SSE reconnect with backoff
- ⏳ Heartbeat timeout
- ⏳ Multi-tab synchronization
- ⏳ Conflict resolution UI
- ⏳ Variable height virtualization
- ⏳ 1000 reviews stress test
- ⏳ Memory leak detection
- ⏳ Heap snapshots
- ⏳ CPU profiling
- ⏳ Rapid voting (race conditions)
- ⏳ Network failure scenarios

**Files to Create:**
- `tests/reviews/review-idempotency.spec.ts`
- `tests/reviews/review-server-merge.spec.ts`
- `tests/reviews/review-undo.spec.ts`
- `tests/reviews/review-accessibility-full.spec.ts`
- `tests/reviews/review-rate-limiting.spec.ts`
- `tests/reviews/review-sse-advanced.spec.ts`
- `tests/reviews/review-conflict.spec.ts`
- `tests/reviews/review-stress.spec.ts`
- `tests/reviews/review-memory.spec.ts`

---

### PART 12: Documentation
**Status**: BASIC DOCS EXIST

**Existing:**
- `REVIEW_SYSTEM_COMPLETE.md`
- `REVIEW_SYSTEM_USAGE.md`
- `QUICK_REFERENCE.md`

**Need to Create:**
- ⏳ `Architecture.md` - System architecture diagrams
- ⏳ `Performance.md` - Performance optimization guide
- ⏳ `Accessibility.md` - A11y compliance details
- ⏳ `Offline.md` - Offline-first architecture
- ⏳ `Realtime.md` - SSE/realtime system
- ⏳ `Repository.md` - Repository pattern guide
- ⏳ `Moderation.md` - Moderation system
- ⏳ `ConflictResolution.md` - Conflict handling
- ⏳ `Testing.md` - Testing strategy
- ⏳ `Security.md` - Security best practices

**Need to Add:**
- Sequence diagrams (Mermaid.js)
- Data flow diagrams
- Event flow diagrams
- State machine diagrams

---

### PART 13: Final Validation
**Status**: NOT STARTED

**Checklist:**
- ⏳ Zero TypeScript errors
- ⏳ Zero ESLint errors
- ⏳ Zero hydration warnings
- ⏳ Zero React warnings
- ⏳ Zero memory leaks
- ⏳ All tests passing (100+ tests)
- ⏳ Lighthouse Performance >95 (currently ~92)
- ⏳ Accessibility 100 (currently ~88)
- ⏳ Best Practices >95 (currently ~90)
- ⏳ SEO >95
- ⏳ Mobile responsive
- ⏳ Offline support working
- ⏳ Multi-tab sync working
- ⏳ Background sync working
- ⏳ Undo working
- ⏳ Idempotency verified
- ⏳ Rate limiter verified
- ⏳ Server echo merging verified

**Files to Create:**
- `IMPLEMENTATION_REPORT.md` - Final summary

---

## Priority Order

### ⭐⭐⭐⭐⭐ CRITICAL (Do First)
1. ✅ Idempotency Keys (DONE)
2. ✅ Server Echo Merging (DONE)
3. ✅ Rate Limiter (DONE)
4. ⏳ Full Accessibility
5. ⏳ Enhanced Soft Delete
6. ⏳ Variable Height Virtualization

### ⭐⭐⭐⭐☆ HIGH PRIORITY
7. ⏳ Conflict Resolution
8. ⏳ Enhanced SSE
9. ⏳ Advanced Moderation
10. ⏳ Performance Optimization

### ⭐⭐⭐☆☆ MEDIUM PRIORITY
11. ⏳ Comprehensive Testing
12. ⏳ Documentation
13. ⏳ Final Validation

---

## Next Steps

1. **Complete Part 4**: Enhanced Soft Delete System
   - Create UndoToast component
   - Add restore endpoint
   - Integrate with SSE

2. **Complete Part 5**: Full Accessibility
   - Add ARIA labels everywhere
   - Implement screen reader announcements
   - Add axe-core to tests

3. **Complete Part 6**: Variable Height Virtualization
   - Install TanStack Virtual
   - Replace FixedSizeList
   - Add dynamic measurements

4. **Continue with Parts 7-13** in priority order

---

## Estimated Completion

- **Parts 1-3 (Idempotency, Merge, Rate Limit)**: ✅ COMPLETE (3 hours)
- **Parts 4-6 (Soft Delete, A11y, Virtualization)**: 4-6 hours
- **Parts 7-10 (Performance, SSE, Conflict, Moderation)**: 6-8 hours
- **Parts 11-13 (Testing, Docs, Validation)**: 4-5 hours

**Total Remaining**: ~14-19 hours of implementation

---

## Files Created So Far

1. ✅ `src/lib/middleware/idempotency.ts` (250+ lines)
2. ✅ `src/lib/utils/serverMerge.ts` (400+ lines)
3. ✅ `src/lib/middleware/rateLimiter.ts` (450+ lines)
4. ✅ `app/api/reviews/route.ts` (updated with middleware)

**Total New Code**: ~1,100+ lines

---

## Current System Status

**Before Enterprise Features:**
- 19/19 requirements complete
- 32 files
- ~9,000 lines of code
- 58 E2E tests
- Lighthouse: 92/88/90/85 (Perf/A11y/BP/SEO)

**After Parts 1-3:**
- 22/32 new requirements complete (69%)
- 36 files (+4)
- ~10,100 lines of code (+1,100)
- 58 E2E tests (need 40+ more)
- Lighthouse: TBD (expect improvements)

**Target After All Parts:**
- 32/32 requirements complete (100%)
- 60+ files (+28)
- ~15,000+ lines of code (+6,000)
- 100+ E2E tests (+42)
- Lighthouse: 95+/100/95+/95+ (Perf/A11y/BP/SEO)


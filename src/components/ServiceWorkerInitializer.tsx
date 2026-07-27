'use client';

/**
 * Service Worker Initializer
 * 
 * Registers service worker on app mount
 * Handles service worker lifecycle events
 */

import { useEffect, useState } from 'react';
import { initServiceWorker, serviceWorkerManager } from '@/lib/sw/register';
import { toast } from 'sonner';

export function ServiceWorkerInitializer() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Register service worker
    initServiceWorker()
      .then((registered) => {
        if (registered) {
          console.log('[App] Service worker registered successfully');
        } else {
          console.log('[App] Service worker not registered');
        }
      })
      .catch((error) => {
        console.error('[App] Service worker registration failed:', error);
      });

    // Subscribe to service worker messages
    const unsubscribe = serviceWorkerManager.subscribe((message) => {
      switch (message.type) {
        case 'SYNC_COMPLETED':
          if (message.processed > 0) {
            toast.success(`Synced ${message.processed} watchlist changes`, {
              description: message.failed > 0 
                ? `${message.failed} changes failed to sync` 
                : undefined,
            });
          }
          break;

        case 'SYNC_FAILED':
          toast.error('Sync failed', {
            description: message.error,
          });
          break;

        case 'UPDATE_AVAILABLE':
          setUpdateAvailable(true);
          toast.info('App update available', {
            description: 'Click to reload and update',
            duration: Infinity,
            action: {
              label: 'Update',
              onClick: () => {
                serviceWorkerManager.skipWaiting();
                window.location.reload();
              },
            },
          });
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Update indicator (optional visual element)
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => {
            serviceWorkerManager.skipWaiting();
            window.location.reload();
          }}
          className="
            px-4 py-2 rounded-lg bg-blue-600 text-white 
            hover:bg-blue-700 transition-colors
            shadow-lg font-medium text-sm
          "
        >
          Update Available - Click to Reload
        </button>
      </div>
    );
  }

  return null;
}

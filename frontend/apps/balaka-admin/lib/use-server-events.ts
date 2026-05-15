import { useEffect } from 'react';
import { useNotifications } from '@/ui/lib/notification-context';

/**
 * Singleton-based Server Events hook.
 * Connects to the centralized SSE stream managed by NotificationProvider.
 */
export function useServerEvents(
  onEvent: (event: string, data: Record<string, any> | string) => void
) {
  const { subscribeToEvents } = useNotifications();

  useEffect(() => {
    return subscribeToEvents(onEvent);
  }, [subscribeToEvents, onEvent]);
}

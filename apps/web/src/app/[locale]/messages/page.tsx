import { Suspense } from 'react';

import { MessagesInbox } from '@/components/messaging/messages-inbox';

export default function MessagesPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <MessagesInbox />
    </Suspense>
  );
}

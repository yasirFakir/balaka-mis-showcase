# 7. Real-Time UI Updates (SSE)

To provide a seamless, "app-like" experience without constant manual refreshing, Balaka MIS implements **Server-Sent Events (SSE)**. This allows the backend to push updates to the frontend immediately when data changes.

## 7.1 Architecture

We use a **Publish-Subscribe (Pub/Sub)** model:

1.  **Event Broadcaster (`backend/app/core/events.py`)**: A singleton class that manages active connections using `asyncio.Queue`. When an event occurs, it pushes a message to all connected queues.
2.  **SSE Endpoint (`backend/app/api/endpoints/events.py`)**: A dedicated endpoint `GET /api/v1/events/` that streams data to clients using `EventSourceResponse` (from `sse-starlette`).
3.  **Frontend Hook (`useServerEvents`)**: A custom React hook that connects to the SSE stream and listens for specific event types.

## 7.2 Supported Events

The system currently broadcasts the following events:

| Event Name | Trigger | Payload Data |
| :--- | :--- | :--- |
| `request_created` | Client submits a new application | `id`, `status`, `service_name`, `user_id` |
| `request_updated` | Admin changes status (Approve/Reject) | `id`, `status`, `rejection_reason` |
| `new_notification` | High-priority system alert created | `id`, `user_id`, `title`, `message`, `link` |
| `transaction_created` | Payment recorded or claimed | `id`, `service_request_id`, `amount`, `status`, `type` |
| `transaction_updated` | Payment verified or flagged | `id`, `service_request_id`, `status`, `action` |
| `ticket_created` | New support ticket opened | `id`, `subject`, `status`, `service_request_id` |
| `ticket_updated` | Ticket status changed | `id`, `status`, `priority` |
| `ticket_message_created`| New reply in ticket chat | `ticket_id`, `message_id`, `sender_id` |

## 7.3 Usage Guide

### Backend: Broadcasting an Event
To trigger an update from an API endpoint, inject `event_broadcaster` and call `broadcast()`:

```python
from app.core.events import event_broadcaster
import json

# ... inside your async endpoint ...
await event_broadcaster.broadcast(json.dumps({
    "event": "my_custom_event",
    "data": { "foo": "bar" }
}))
```

### Frontend: Listening for Events
Use the `useServerEvents` hook in your component. It automatically handles connection management.

```tsx
import { useServerEvents } from "@/lib/use-server-events";

export function MyComponent() {
  const reloadData = () => { /* fetch data */ };

  useServerEvents((event, data) => {
    if (event === "my_custom_event") {
      reloadData();
    }
  });

  // ...
}
```

## 7.4 Implementation Details
*   **Infrastructure**: We use `sse-starlette` for the backend streaming response.
*   **Connections**: The frontend opens a single connection per tab/window.
*   **Performance**: SSE is lightweight and uses a single long-lived HTTP connection, making it more efficient than polling.

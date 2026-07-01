const QUEUE_KEY = "tt_offline_queue";

export interface QueuedMutation {
  id: string;
  endpoint: string;
  method: string;
  body: unknown;
  timestamp: number;
  retries: number;
  label?: string;
}

export function getQueue(): QueuedMutation[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedMutation[];
  } catch {
    return [];
  }
}

export function enqueue(
  mutation: Pick<QueuedMutation, "endpoint" | "method" | "body" | "label">,
): void {
  const queue = getQueue();
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  queue.push({ ...mutation, id, timestamp: Date.now(), retries: 0 });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function clearItem(id: string): void {
  const queue = getQueue().filter((m) => m.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function bumpRetry(id: string): void {
  const queue = getQueue().map((m) =>
    m.id === id ? { ...m, retries: m.retries + 1 } : m,
  );
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function queueLength(): number {
  return getQueue().length;
}

export async function replayQueue(baseUrl: string): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;
  let succeeded = 0;
  for (const mutation of queue) {
    if (mutation.retries >= 5) {
      clearItem(mutation.id);
      continue;
    }
    try {
      const res = await fetch(`${baseUrl}${mutation.endpoint}`, {
        method: mutation.method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: mutation.method !== "GET" && mutation.method !== "DELETE"
          ? JSON.stringify(mutation.body)
          : undefined,
      });
      if (res.ok || res.status === 201 || res.status === 204) {
        clearItem(mutation.id);
        succeeded++;
      } else {
        bumpRetry(mutation.id);
      }
    } catch {
      bumpRetry(mutation.id);
    }
  }
  return succeeded;
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

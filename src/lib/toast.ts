/** Pure toast queue logic, independent of React and timers. */
export interface Toast {
  id: number;
  message: string;
  kind: "success" | "error";
}

const MAX_TOASTS = 3;

export function pushToast(queue: Toast[], message: string, kind: "success" | "error"): Toast[] {
  if (queue.length > 0 && queue[queue.length - 1].message === message) return queue;
  const nextId = queue.length ? Math.max(...queue.map(t => t.id)) + 1 : 1;
  const next = [...queue, { id: nextId, message, kind }];
  return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
}

const MAX_MESSAGE = 60;

/** Bound displayed text by Unicode code points so diacritics stay intact. */
export function formatToastMessage(message: string): string {
  const chars = Array.from(message);
  return chars.length <= MAX_MESSAGE ? message : `${chars.slice(0, MAX_MESSAGE - 1).join("")}…`;
}

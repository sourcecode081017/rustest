import type {
  ExecuteResult,
  HistoryEntry,
  RequestSpec,
  SavedRequest,
} from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function execute(request: RequestSpec): Promise<ExecuteResult> {
  const res = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handle<ExecuteResult>(res);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return handle<HistoryEntry[]>(await fetch("/api/history"));
}

export async function clearHistory(): Promise<void> {
  await handle<unknown>(await fetch("/api/history", { method: "DELETE" }));
}

export async function getCollections(): Promise<SavedRequest[]> {
  return handle<SavedRequest[]>(await fetch("/api/collections"));
}

export async function saveRequest(
  name: string,
  request: RequestSpec
): Promise<SavedRequest> {
  const res = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, request }),
  });
  return handle<SavedRequest>(res);
}

export async function deleteSaved(id: string): Promise<void> {
  await handle<unknown>(
    await fetch(`/api/collections/${id}`, { method: "DELETE" })
  );
}

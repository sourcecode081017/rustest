export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export type BodyKind = "none" | "json" | "text" | "form";
export interface BodySpec {
  kind: BodyKind;
  content: string;
}

export type AuthKind = "none" | "bearer" | "basic";
export interface AuthSpec {
  kind: AuthKind;
  token: string;
  username: string;
  password: string;
}

export interface RequestSpec {
  method: string;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: BodySpec;
  auth: AuthSpec;
}

export interface ResponseSpec {
  status: number;
  status_text: string;
  headers: KeyValue[];
  body: string;
  duration_ms: number;
  size_bytes: number;
  content_type: string | null;
  truncated: boolean;
}

export interface ExecuteResult {
  response: ResponseSpec;
  history_id: string;
}

export interface HistoryEntry {
  id: string;
  created_at: string;
  request: RequestSpec;
  status: number | null;
  duration_ms: number | null;
}

export interface SavedRequest {
  id: string;
  name: string;
  created_at: string;
  request: RequestSpec;
}

export const emptyRequest = (): RequestSpec => ({
  method: "GET",
  url: "",
  headers: [],
  params: [],
  body: { kind: "none", content: "" },
  auth: { kind: "none", token: "", username: "", password: "" },
});

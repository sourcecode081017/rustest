import { useCallback, useEffect, useState } from "react";
import * as api from "./api";
import type {
  AuthKind,
  BodyKind,
  HistoryEntry,
  RequestSpec,
  ResponseSpec,
  SavedRequest,
} from "./types";
import { emptyRequest } from "./types";
import KeyValueEditor from "./components/KeyValueEditor";
import ResponsePanel from "./components/ResponsePanel";
import Sidebar from "./components/Sidebar";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const BODY_KINDS: BodyKind[] = ["none", "json", "text", "form"];
const AUTH_KINDS: AuthKind[] = ["none", "bearer", "basic"];
type ReqTab = "params" | "headers" | "body" | "auth";

export default function App() {
  const [request, setRequest] = useState<RequestSpec>(emptyRequest);
  const [response, setResponse] = useState<ResponseSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reqTab, setReqTab] = useState<ReqTab>("params");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [collections, setCollections] = useState<SavedRequest[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [h, c] = await Promise.all([
        api.getHistory(),
        api.getCollections(),
      ]);
      setHistory(h);
      setCollections(c);
    } catch {
      /* backend may not be up yet */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const send = useCallback(async () => {
    if (!request.url.trim()) {
      setError("Enter a URL first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.execute(request);
      setResponse(result.response);
      refresh();
    } catch (e) {
      setResponse(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [request, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        send();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [send]);

  const loadRequest = (r: RequestSpec) => setRequest(r);

  const saveCurrent = async () => {
    const name = window.prompt("Save request as:", request.url || "Untitled");
    if (!name) return;
    try {
      await api.saveRequest(name, request);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" /> rustest
        </div>

        <div className="url-bar">
          <select
            className={`method-select method-${request.method}`}
            value={request.method}
            onChange={(e) =>
              setRequest({ ...request, method: e.target.value })
            }
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            className="url-input"
            placeholder="https://api.example.com/users"
            value={request.url}
            onChange={(e) => setRequest({ ...request, url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button className="send-btn" onClick={send} disabled={loading}>
            {loading ? "…" : "Send"}
          </button>
        </div>

        <div className="topbar-actions">
          <button className="ghost-btn" onClick={saveCurrent}>
            Save
          </button>
        </div>
      </header>

      <div className="body">
        <Sidebar
          history={history}
          collections={collections}
          onLoad={loadRequest}
          onClearHistory={async () => {
            await api.clearHistory();
            refresh();
          }}
          onDeleteSaved={async (id) => {
            await api.deleteSaved(id);
            refresh();
          }}
          onSaveCurrent={saveCurrent}
        />

        <main className="main">
          <section className="request-panel">
            <div className="tabs">
              {(["params", "headers", "body", "auth"] as ReqTab[]).map((t) => (
                <button
                  key={t}
                  className={reqTab === t ? "tab active" : "tab"}
                  onClick={() => setReqTab(t)}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                  {t === "params" && request.params.length > 0
                    ? ` (${request.params.length})`
                    : ""}
                  {t === "headers" && request.headers.length > 0
                    ? ` (${request.headers.length})`
                    : ""}
                </button>
              ))}
            </div>

            <div className="request-tab-content">
              {reqTab === "params" && (
                <KeyValueEditor
                  rows={request.params}
                  onChange={(params) => setRequest({ ...request, params })}
                  keyPlaceholder="param"
                />
              )}

              {reqTab === "headers" && (
                <KeyValueEditor
                  rows={request.headers}
                  onChange={(headers) => setRequest({ ...request, headers })}
                  keyPlaceholder="Header"
                />
              )}

              {reqTab === "body" && (
                <div className="body-editor">
                  <div className="body-kind">
                    {BODY_KINDS.map((k) => (
                      <button
                        key={k}
                        className={
                          request.body.kind === k
                            ? "chip active"
                            : "chip"
                        }
                        onClick={() =>
                          setRequest({
                            ...request,
                            body: { ...request.body, kind: k },
                          })
                        }
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  {request.body.kind !== "none" && (
                    <textarea
                      className="body-textarea"
                      placeholder={
                        request.body.kind === "form"
                          ? "key=value&other=value"
                          : '{\n  "hello": "world"\n}'
                      }
                      value={request.body.content}
                      onChange={(e) =>
                        setRequest({
                          ...request,
                          body: {
                            ...request.body,
                            content: e.target.value,
                          },
                        })
                      }
                    />
                  )}
                </div>
              )}

              {reqTab === "auth" && (
                <div className="auth-editor">
                  <div className="body-kind">
                    {AUTH_KINDS.map((k) => (
                      <button
                        key={k}
                        className={
                          request.auth.kind === k ? "chip active" : "chip"
                        }
                        onClick={() =>
                          setRequest({
                            ...request,
                            auth: { ...request.auth, kind: k },
                          })
                        }
                      >
                        {k}
                      </button>
                    ))}
                  </div>

                  {request.auth.kind === "bearer" && (
                    <input
                      className="field-input"
                      placeholder="Bearer token"
                      value={request.auth.token}
                      onChange={(e) =>
                        setRequest({
                          ...request,
                          auth: { ...request.auth, token: e.target.value },
                        })
                      }
                    />
                  )}

                  {request.auth.kind === "basic" && (
                    <div className="auth-basic">
                      <input
                        className="field-input"
                        placeholder="Username"
                        value={request.auth.username}
                        onChange={(e) =>
                          setRequest({
                            ...request,
                            auth: {
                              ...request.auth,
                              username: e.target.value,
                            },
                          })
                        }
                      />
                      <input
                        className="field-input"
                        type="password"
                        placeholder="Password"
                        value={request.auth.password}
                        onChange={(e) =>
                          setRequest({
                            ...request,
                            auth: {
                              ...request.auth,
                              password: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  )}

                  {request.auth.kind === "none" && (
                    <p className="auth-hint">
                      No authorization header will be sent.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <ResponsePanel
            response={response}
            error={error}
            loading={loading}
          />
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import type { HistoryEntry, RequestSpec, SavedRequest } from "../types";

interface Props {
  history: HistoryEntry[];
  collections: SavedRequest[];
  onLoad: (request: RequestSpec) => void;
  onClearHistory: () => void;
  onDeleteSaved: (id: string) => void;
  onSaveCurrent: () => void;
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname + u.search;
  } catch {
    return url;
  }
}

export default function Sidebar({
  history,
  collections,
  onLoad,
  onClearHistory,
  onDeleteSaved,
  onSaveCurrent,
}: Props) {
  const [tab, setTab] = useState<"history" | "saved">("history");

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={tab === "history" ? "sidebar-tab active" : "sidebar-tab"}
          onClick={() => setTab("history")}
        >
          History
        </button>
        <button
          className={tab === "saved" ? "sidebar-tab active" : "sidebar-tab"}
          onClick={() => setTab("saved")}
        >
          Saved
        </button>
      </div>

      {tab === "saved" && (
        <button className="save-btn" onClick={onSaveCurrent}>
          Save current request
        </button>
      )}

      <div className="sidebar-list">
        {tab === "history" &&
          (history.length === 0 ? (
            <p className="sidebar-empty">No requests yet.</p>
          ) : (
            <>
              <button className="clear-btn" onClick={onClearHistory}>
                Clear history
              </button>
              {history.map((h) => (
                <button
                  key={h.id}
                  className="list-item"
                  onClick={() => onLoad(h.request)}
                >
                  <div className="list-item-top">
                    <span className={`method method-${h.request.method}`}>
                      {h.request.method}
                    </span>
                    {h.status != null && (
                      <span className="list-status">{h.status}</span>
                    )}
                  </div>
                  <span className="list-url">{shortUrl(h.request.url)}</span>
                </button>
              ))}
            </>
          ))}

        {tab === "saved" &&
          (collections.length === 0 ? (
            <p className="sidebar-empty">No saved requests.</p>
          ) : (
            collections.map((s) => (
              <div key={s.id} className="list-item saved-item">
                <button
                  className="list-item-main"
                  onClick={() => onLoad(s.request)}
                >
                  <div className="list-item-top">
                    <span className={`method method-${s.request.method}`}>
                      {s.request.method}
                    </span>
                    <span className="list-name">{s.name}</span>
                  </div>
                  <span className="list-url">{shortUrl(s.request.url)}</span>
                </button>
                <button
                  className="icon-btn"
                  title="Delete"
                  onClick={() => onDeleteSaved(s.id)}
                >
                  ×
                </button>
              </div>
            ))
          ))}
      </div>
    </aside>
  );
}

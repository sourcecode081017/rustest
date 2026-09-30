use crate::models::{HistoryEntry, SavedRequest};
use std::path::{Path, PathBuf};
use std::sync::RwLock;

const MAX_HISTORY: usize = 200;

/// Tiny JSON-file backed store. Good enough for v1 and easy to swap for SQLite.
pub struct Store {
    history_path: PathBuf,
    saved_path: PathBuf,
    history: RwLock<Vec<HistoryEntry>>,
    saved: RwLock<Vec<SavedRequest>>,
}

impl Store {
    pub fn new(data_dir: impl AsRef<Path>) -> Self {
        let data_dir = data_dir.as_ref().to_path_buf();
        let _ = std::fs::create_dir_all(&data_dir);
        let history_path = data_dir.join("history.json");
        let saved_path = data_dir.join("collections.json");

        let history = read_json(&history_path).unwrap_or_default();
        let saved = read_json(&saved_path).unwrap_or_default();

        Store {
            history_path,
            saved_path,
            history: RwLock::new(history),
            saved: RwLock::new(saved),
        }
    }

    pub fn history(&self) -> Vec<HistoryEntry> {
        self.history.read().unwrap().clone()
    }

    pub fn add_history(&self, entry: HistoryEntry) {
        let mut h = self.history.write().unwrap();
        h.insert(0, entry);
        h.truncate(MAX_HISTORY);
        write_json(&self.history_path, &*h);
    }

    pub fn clear_history(&self) {
        let mut h = self.history.write().unwrap();
        h.clear();
        write_json(&self.history_path, &*h);
    }

    pub fn saved(&self) -> Vec<SavedRequest> {
        self.saved.read().unwrap().clone()
    }

    pub fn save_request(&self, req: SavedRequest) {
        let mut s = self.saved.write().unwrap();
        s.insert(0, req);
        write_json(&self.saved_path, &*s);
    }

    pub fn delete_saved(&self, id: &str) -> bool {
        let mut s = self.saved.write().unwrap();
        let before = s.len();
        s.retain(|r| r.id != id);
        let removed = s.len() != before;
        if removed {
            write_json(&self.saved_path, &*s);
        }
        removed
    }
}

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    let data = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

fn write_json<T: serde::Serialize>(path: &Path, value: &T) {
    if let Ok(data) = serde_json::to_string_pretty(value) {
        let tmp = path.with_extension("json.tmp");
        if std::fs::write(&tmp, data).is_ok() {
            let _ = std::fs::rename(&tmp, path);
        }
    }
}

CREATE TABLE IF NOT EXISTS patents (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 workflow TEXT NOT NULL CHECK(workflow IN ('pre','priority','utility')),
 stage INTEGER NOT NULL DEFAULT 0,
 owner TEXT NOT NULL DEFAULT '',
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patents_updated ON patents(updated_at DESC);
CREATE TABLE IF NOT EXISTS status_history (
 id TEXT PRIMARY KEY,
 patent_id TEXT NOT NULL,
 previous_workflow TEXT,
 next_workflow TEXT NOT NULL,
 previous_stage INTEGER,
 next_stage INTEGER NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 changed_at TEXT NOT NULL,
 FOREIGN KEY(patent_id) REFERENCES patents(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_history_patent ON status_history(patent_id,changed_at DESC);
CREATE TABLE IF NOT EXISTS login_attempts (
 ip_key TEXT PRIMARY KEY,
 count INTEGER NOT NULL DEFAULT 0,
 started_at INTEGER NOT NULL,
 locked_until INTEGER NOT NULL DEFAULT 0
);

-- Token yang terpakai per panggilan LLM. Sumber metrik efisiensi token di Staff Console.
CREATE TABLE llm_usage (
  id         INTEGER PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  at         INTEGER NOT NULL DEFAULT (unixepoch()),
  input      INTEGER NOT NULL,
  output     INTEGER NOT NULL,
  cached     INTEGER NOT NULL DEFAULT 0   -- bagian input yang kena cache provider (lebih murah)
);
CREATE INDEX llm_usage_at ON llm_usage(at);

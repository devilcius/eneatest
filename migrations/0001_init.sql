-- ENEATest initial schema (v1.1)

CREATE TABLE IF NOT EXISTS app_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_definition (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  scale_min INTEGER NOT NULL,
  scale_max INTEGER NOT NULL,
  scale_labels_json TEXT NOT NULL,
  source_pdf TEXT,
  version INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questionnaire (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_definition_id TEXT NOT NULL,
  test_definition_version INTEGER NOT NULL,
  eneatype INTEGER NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (test_definition_id, test_definition_version, eneatype),
  FOREIGN KEY (test_definition_id) REFERENCES test_definition(id)
);

CREATE TABLE IF NOT EXISTS item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  questionnaire_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (questionnaire_id, order_index),
  FOREIGN KEY (questionnaire_id) REFERENCES questionnaire(id)
);

CREATE TABLE IF NOT EXISTS test_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_definition_id TEXT NOT NULL,
  test_definition_version INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (test_definition_id) REFERENCES test_definition(id),
  FOREIGN KEY (user_id) REFERENCES app_user(id)
);

CREATE TABLE IF NOT EXISTS item_response (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  value INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (session_id, item_id),
  FOREIGN KEY (session_id) REFERENCES test_session(id),
  FOREIGN KEY (item_id) REFERENCES item(id)
);

CREATE TABLE IF NOT EXISTS session_result (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE,
  totals_json TEXT NOT NULL,
  ranking_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES test_session(id)
);

CREATE INDEX IF NOT EXISTS idx_test_definition_active ON test_definition(is_active);
CREATE INDEX IF NOT EXISTS idx_questionnaire_test_definition ON questionnaire(test_definition_id, test_definition_version);
CREATE INDEX IF NOT EXISTS idx_item_questionnaire ON item(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_session_user ON test_session(user_id);
CREATE INDEX IF NOT EXISTS idx_response_session ON item_response(session_id);

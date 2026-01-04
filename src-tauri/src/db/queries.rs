/// SQL queries for the Loom database
pub const CREATE_CONVERSATIONS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY NOT NULL,
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    name TEXT NOT NULL
)
"#;

pub const CREATE_MESSAGE_NODES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS message_nodes (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    parent_id TEXT,
    model_id TEXT,
    content TEXT,
    role TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
)
"#;

pub const CREATE_MESSAGE_NODES_INDEX: &str = r#"
CREATE INDEX IF NOT EXISTS idx_message_nodes_conversation 
ON message_nodes(conversation_id)
"#;

pub const SELECT_CONVERSATIONS_METADATA: &str =
    "SELECT id, created_at, modified_at, name FROM conversations ORDER BY modified_at DESC";

pub const SELECT_CONVERSATION_BY_ID: &str =
    "SELECT id, created_at, modified_at, name FROM conversations WHERE id = ?";

pub const SELECT_MESSAGE_NODES_BY_CONV_ID: &str =
    "SELECT id, conversation_id, created_at, parent_id, model_id, content, role FROM message_nodes WHERE conversation_id = ? ORDER BY created_at ASC";

pub const UPSERT_CONVERSATION: &str = r#"
INSERT INTO conversations (id, created_at, modified_at, name)
VALUES (?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    modified_at = excluded.modified_at,
    name = excluded.name
"#;

pub const SELECT_MESSAGE_NODE_IDS_BY_CONV_ID: &str =
    "SELECT id FROM message_nodes WHERE conversation_id = ?";

pub const DELETE_MESSAGE_NODE_BY_ID: &str = "DELETE FROM message_nodes WHERE id = ?";

pub const UPSERT_MESSAGE_NODE: &str = r#"
INSERT INTO message_nodes (id, conversation_id, created_at, parent_id, model_id, content, role)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    parent_id = excluded.parent_id,
    model_id = excluded.model_id,
    content = excluded.content,
    role = excluded.role
"#;

pub const DELETE_CONVERSATION: &str = "DELETE FROM conversations WHERE id = ?";

pub const SELECT_TABLE_NAMES: &str =
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name";

// Test specific queries
pub const INSERT_CONVERSATION: &str =
    "INSERT INTO conversations (id, created_at, modified_at, name) VALUES (?, ?, ?, ?)";

pub const INSERT_MESSAGE_NODE: &str =
    "INSERT INTO message_nodes (id, conversation_id, created_at, parent_id, content, role) VALUES (?, ?, ?, ?, ?, ?)";

pub const SELECT_CHILD_NODES: &str = "SELECT id FROM message_nodes WHERE parent_id = ?";

use serde::{Deserialize, Serialize};

/// Conversation metadata (for listing)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Conversation {
    pub id: String,
    pub created_at: i64,
    pub modified_at: i64,
    pub name: String,
}

/// Message node within a conversation
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MessageNode {
    pub id: String,
    pub conversation_id: String,
    pub created_at: i64,
    #[sqlx(default)]
    pub parent_id: Option<String>,
    #[sqlx(default)]
    pub model_id: Option<String>,
    #[sqlx(default)]
    pub content: Option<String>,
    #[sqlx(default)]
    pub role: Option<String>,
}

/// Full conversation data with nodes (for frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationWithNodes {
    pub id: String,
    pub created_at: i64,
    pub modified_at: i64,
    pub name: String,
    pub message_nodes: Vec<MessageNodeOutput>,
}

/// Message node output format (matches frontend expectations)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageNodeOutput {
    pub id: String,
    pub created_at: i64,
    pub parent_id: Option<String>,
    pub children_ids: Vec<String>,
    pub model_id: Option<String>,
    pub content: Option<String>,
    pub role: Option<String>,
}

/// Input for saving a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationInput {
    pub id: String,
    pub created_at: i64,
    pub modified_at: i64,
    pub name: String,
    pub message_nodes: std::collections::HashMap<String, MessageNodeInput>,
}

/// Input for a message node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageNodeInput {
    pub id: String,
    pub created_at: i64,
    pub parent_id: Option<String>,
    pub model_id: Option<String>,
    pub content: Option<String>,
    pub role: Option<String>,
}

use crate::db::{queries::*, DbPool};
use crate::models::{
    Conversation, ConversationInput, ConversationWithNodes, MessageNode, MessageNodeOutput,
};
use log::{error, info};
use sqlx::{Column, Row};
use std::collections::HashMap;
use tauri::State;

/// Get all conversations (metadata only)
#[tauri::command]
pub async fn get_conversations(db: State<'_, DbPool>) -> Result<Vec<Conversation>, String> {
    info!("get_conversations called");

    sqlx::query_as::<_, Conversation>(SELECT_CONVERSATIONS_METADATA)
        .fetch_all(db.inner())
        .await
        .map_err(|e| {
            error!("get_conversations error: {}", e);
            e.to_string()
        })
}

/// Get a single conversation with all its message nodes
#[tauri::command]
pub async fn get_conversation(
    db: State<'_, DbPool>,
    id: String,
) -> Result<Option<ConversationWithNodes>, String> {
    info!("get_conversation called for id: {}", id);

    // Get conversation metadata
    let conv = sqlx::query_as::<_, Conversation>(SELECT_CONVERSATION_BY_ID)
        .bind(&id)
        .fetch_optional(db.inner())
        .await
        .map_err(|e| {
            error!("get_conversation error (metadata): {}", e);
            e.to_string()
        })?;

    let conv = match conv {
        Some(c) => c,
        None => return Ok(None),
    };

    // Get all message nodes for this conversation
    let nodes = sqlx::query_as::<_, MessageNode>(SELECT_MESSAGE_NODES_BY_CONV_ID)
        .bind(&id)
        .fetch_all(db.inner())
        .await
        .map_err(|e| {
            error!("get_conversation error (nodes): {}", e);
            e.to_string()
        })?;

    // Build children map
    let mut children_map: HashMap<String, Vec<String>> = HashMap::new();
    for node in &nodes {
        if let Some(parent_id) = &node.parent_id {
            children_map
                .entry(parent_id.clone())
                .or_default()
                .push(node.id.clone());
        }
    }

    // Convert to output format
    let message_nodes: Vec<MessageNodeOutput> = nodes
        .into_iter()
        .map(|node| MessageNodeOutput {
            id: node.id.clone(),
            created_at: node.created_at,
            parent_id: node.parent_id,
            children_ids: children_map.get(&node.id).cloned().unwrap_or_default(),
            model_id: node.model_id,
            content: node.content,
            role: node.role,
        })
        .collect();

    Ok(Some(ConversationWithNodes {
        id: conv.id,
        created_at: conv.created_at,
        modified_at: conv.modified_at,
        name: conv.name,
        message_nodes,
    }))
}

/// Save a conversation (upsert)
#[tauri::command]
pub async fn save_conversation(
    db: State<'_, DbPool>,
    conversation: ConversationInput,
) -> Result<(), String> {
    info!("save_conversation called for id: {}", conversation.id);

    // Upsert conversation
    sqlx::query(UPSERT_CONVERSATION)
        .bind(&conversation.id)
        .bind(conversation.created_at)
        .bind(conversation.modified_at)
        .bind(&conversation.name)
        .execute(db.inner())
        .await
        .map_err(|e| {
            error!("save_conversation error (upsert conv): {}", e);
            e.to_string()
        })?;

    // Get existing node IDs
    let existing_ids: Vec<String> = sqlx::query_scalar(SELECT_MESSAGE_NODE_IDS_BY_CONV_ID)
        .bind(&conversation.id)
        .fetch_all(db.inner())
        .await
        .map_err(|e| {
            error!("save_conversation error (get existing): {}", e);
            e.to_string()
        })?;

    // Delete nodes that are no longer present
    let new_ids: std::collections::HashSet<&String> = conversation.message_nodes.keys().collect();

    for existing_id in existing_ids {
        if !new_ids.contains(&existing_id) {
            sqlx::query(DELETE_MESSAGE_NODE_BY_ID)
                .bind(&existing_id)
                .execute(db.inner())
                .await
                .map_err(|e| {
                    error!("save_conversation error (delete node): {}", e);
                    e.to_string()
                })?;
        }
    }

    // Upsert all message nodes
    for (node_id, node) in &conversation.message_nodes {
        sqlx::query(UPSERT_MESSAGE_NODE)
            .bind(node_id)
            .bind(&conversation.id)
            .bind(node.created_at)
            .bind(&node.parent_id)
            .bind(&node.model_id)
            .bind(&node.content)
            .bind(&node.role)
            .execute(db.inner())
            .await
            .map_err(|e| {
                error!("save_conversation error (upsert node {}): {}", node_id, e);
                e.to_string()
            })?;
    }

    info!("save_conversation completed successfully");
    Ok(())
}

/// Delete a conversation
#[tauri::command]
pub async fn delete_conversation(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    info!("delete_conversation called for id: {}", id);

    sqlx::query(DELETE_CONVERSATION)
        .bind(&id)
        .execute(db.inner())
        .await
        .map_err(|e| {
            error!("delete_conversation error: {}", e);
            e.to_string()
        })?;

    Ok(())
}

// ============================================================================
// Debug Commands
// ============================================================================

/// Get all table names in the database
#[tauri::command]
pub async fn get_table_names(db: State<'_, DbPool>) -> Result<Vec<String>, String> {
    info!("get_table_names called");

    let rows = sqlx::query(SELECT_TABLE_NAMES)
        .fetch_all(db.inner())
        .await
        .map_err(|e| {
            error!("get_table_names error: {}", e);
            e.to_string()
        })?;

    Ok(rows.iter().map(|r| r.get::<String, _>("name")).collect())
}

/// Get all rows from a table (for debugging)
#[tauri::command]
pub async fn get_table_rows(
    db: State<'_, DbPool>,
    table: String,
) -> Result<Vec<serde_json::Value>, String> {
    info!("get_table_rows called for table: {}", table);

    // Validate table name to prevent SQL injection
    let valid_tables = get_table_names(db.clone()).await?;
    if !valid_tables.contains(&table) {
        return Err(format!("Invalid table name: {}", table));
    }

    // Dynamic query - safe because we validated the table name
    let query = format!("SELECT * FROM {}", table);
    let rows = sqlx::query(&query)
        .fetch_all(db.inner())
        .await
        .map_err(|e| {
            error!("get_table_rows error: {}", e);
            e.to_string()
        })?;

    // Convert rows to JSON values
    let mut results = Vec::new();
    for row in rows {
        let mut obj = serde_json::Map::new();
        for col in row.columns() {
            let name = col.name();
            // Try to get value as different types
            if let Ok(v) = row.try_get::<String, _>(name) {
                obj.insert(name.to_string(), serde_json::Value::String(v));
            } else if let Ok(v) = row.try_get::<i64, _>(name) {
                obj.insert(name.to_string(), serde_json::Value::Number(v.into()));
            } else if let Ok(v) = row.try_get::<f64, _>(name) {
                if let Some(n) = serde_json::Number::from_f64(v) {
                    obj.insert(name.to_string(), serde_json::Value::Number(n));
                }
            } else {
                obj.insert(name.to_string(), serde_json::Value::Null);
            }
        }
        results.push(serde_json::Value::Object(obj));
    }

    Ok(results)
}

/// Get table schema info
#[tauri::command]
pub async fn get_table_info(
    db: State<'_, DbPool>,
    table: String,
) -> Result<Vec<serde_json::Value>, String> {
    info!("get_table_info called for table: {}", table);

    // Validate table name
    let valid_tables = get_table_names(db.clone()).await?;
    if !valid_tables.contains(&table) {
        return Err(format!("Invalid table name: {}", table));
    }

    let query = format!("PRAGMA table_info({})", table);
    let rows = sqlx::query(&query)
        .fetch_all(db.inner())
        .await
        .map_err(|e| {
            error!("get_table_info error: {}", e);
            e.to_string()
        })?;

    let mut results = Vec::new();
    for row in rows {
        let mut obj = serde_json::Map::new();
        obj.insert(
            "cid".to_string(),
            serde_json::json!(row.get::<i32, _>("cid")),
        );
        obj.insert(
            "name".to_string(),
            serde_json::json!(row.get::<String, _>("name")),
        );
        obj.insert(
            "type".to_string(),
            serde_json::json!(row.get::<String, _>("type")),
        );
        obj.insert(
            "notnull".to_string(),
            serde_json::json!(row.get::<i32, _>("notnull")),
        );
        obj.insert("pk".to_string(), serde_json::json!(row.get::<i32, _>("pk")));
        results.push(serde_json::Value::Object(obj));
    }

    Ok(results)
}

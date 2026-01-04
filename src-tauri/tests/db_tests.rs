use loom_tauri_lib::db::queries::*;
use sqlx::{Pool, Sqlite, SqlitePool};

/// Test helper to create an in-memory database with tables
async fn setup_test_db() -> Pool<Sqlite> {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();

    // Create tables
    sqlx::query(CREATE_CONVERSATIONS_TABLE)
        .execute(&pool)
        .await
        .unwrap();

    sqlx::query(CREATE_MESSAGE_NODES_TABLE)
        .execute(&pool)
        .await
        .unwrap();

    pool
}

#[tokio::test]
async fn test_insert_and_retrieve_conversation() {
    let pool = setup_test_db().await;

    // Insert a conversation
    let conv_id = "test-conv-1";
    let now = chrono::Utc::now().timestamp_millis();

    sqlx::query(INSERT_CONVERSATION)
        .bind(conv_id)
        .bind(now)
        .bind(now)
        .bind("Test Conversation")
        .execute(&pool)
        .await
        .unwrap();

    // Retrieve it
    let row: (String, i64, i64, String) = sqlx::query_as(SELECT_CONVERSATION_BY_ID)
        .bind(conv_id)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(row.0, conv_id);
    assert_eq!(row.3, "Test Conversation");
}

#[tokio::test]
async fn test_insert_message_node_with_parent() {
    let pool = setup_test_db().await;

    // Insert conversation first
    let conv_id = "test-conv-2";
    let now = chrono::Utc::now().timestamp_millis();

    sqlx::query(INSERT_CONVERSATION)
        .bind(conv_id)
        .bind(now)
        .bind(now)
        .bind("Test")
        .execute(&pool)
        .await
        .unwrap();

    // Insert root node
    let root_id = "node-root";
    sqlx::query(INSERT_MESSAGE_NODE)
        .bind(root_id)
        .bind(conv_id)
        .bind(now)
        .bind(None::<String>)
        .bind("Hello")
        .bind("user")
        .execute(&pool)
        .await
        .unwrap();

    // Insert child node
    let child_id = "node-child";
    sqlx::query(INSERT_MESSAGE_NODE)
        .bind(child_id)
        .bind(conv_id)
        .bind(now + 1)
        .bind(Some(root_id))
        .bind("Hi there!")
        .bind("assistant")
        .execute(&pool)
        .await
        .unwrap();

    // Verify parent-child relationship
    let children: Vec<(String,)> = sqlx::query_as(SELECT_CHILD_NODES)
        .bind(root_id)
        .fetch_all(&pool)
        .await
        .unwrap();

    assert_eq!(children.len(), 1);
    assert_eq!(children[0].0, child_id);
}

#[tokio::test]
async fn test_cascade_delete() {
    let pool = setup_test_db().await;

    let conv_id = "test-conv-3";
    let now = chrono::Utc::now().timestamp_millis();

    // Insert conversation
    sqlx::query(INSERT_CONVERSATION)
        .bind(conv_id)
        .bind(now)
        .bind(now)
        .bind("Delete Test")
        .execute(&pool)
        .await
        .unwrap();

    // Insert message node
    sqlx::query(INSERT_MESSAGE_NODE)
        .bind("node-delete-test")
        .bind(conv_id)
        .bind(now)
        .bind(None::<String>) // added bind for parent_id which was missing in original query but is in INSERT_MESSAGE_NODE
        .bind("Test content")
        .bind("user")
        .execute(&pool)
        .await
        .unwrap();

    // Delete conversation
    sqlx::query(DELETE_CONVERSATION)
        .bind(conv_id)
        .execute(&pool)
        .await
        .unwrap();

    // Verify message node was cascade deleted
    let nodes: Vec<(String,)> = sqlx::query_as(SELECT_MESSAGE_NODE_IDS_BY_CONV_ID)
        .bind(conv_id)
        .fetch_all(&pool)
        .await
        .unwrap();

    assert!(nodes.is_empty(), "Message nodes should be cascade deleted");
}

#[tokio::test]
async fn test_upsert_conversation() {
    let pool = setup_test_db().await;

    let conv_id = "test-conv-upsert";
    let now = chrono::Utc::now().timestamp_millis();

    // Insert initial
    sqlx::query(UPSERT_CONVERSATION)
        .bind(conv_id)
        .bind(now)
        .bind(now)
        .bind("Original Name")
        .execute(&pool)
        .await
        .unwrap();

    // Upsert with new name
    let new_time = now + 1000;
    sqlx::query(UPSERT_CONVERSATION)
        .bind(conv_id)
        .bind(now) // created_at should stay the same
        .bind(new_time)
        .bind("Updated Name")
        .execute(&pool)
        .await
        .unwrap();

    // Verify
    let row: (String, i64, i64, String) = sqlx::query_as(SELECT_CONVERSATION_BY_ID)
        .bind(conv_id)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(row.1, now, "created_at should not change");
    assert_eq!(row.2, new_time, "modified_at should be updated");
    assert_eq!(row.3, "Updated Name");
}

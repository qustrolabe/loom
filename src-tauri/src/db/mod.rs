use log::info;
use sqlx::{Pool, Sqlite, SqlitePool};
use std::path::PathBuf;
use tauri::Manager;

pub mod queries;
use queries::*;

pub type DbPool = Pool<Sqlite>;

/// Get the database path in the app data directory
fn get_db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let path = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("loom.db");

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    path
}

/// Initialize the database connection pool and create tables
pub async fn init_db(app_handle: &tauri::AppHandle) -> Result<DbPool, sqlx::Error> {
    let db_path = get_db_path(app_handle);
    info!("Initializing database at: {:?}", db_path);

    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
    let pool = SqlitePool::connect(&db_url).await?;

    // Create tables
    sqlx::query(CREATE_CONVERSATIONS_TABLE)
        .execute(&pool)
        .await?;

    sqlx::query(CREATE_MESSAGE_NODES_TABLE)
        .execute(&pool)
        .await?;

    // Create index for faster lookups
    sqlx::query(CREATE_MESSAGE_NODES_INDEX)
        .execute(&pool)
        .await?;

    info!("Database initialized successfully");
    Ok(pool)
}

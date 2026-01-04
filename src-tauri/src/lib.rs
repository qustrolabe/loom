mod commands;
pub mod db;
mod logging;
mod models;

use log::info;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize logging with the proper log directory from Tauri
            let log_dir = app.path().app_log_dir().ok();
            logging::init_logging(log_dir);
            info!("Starting Loom Tauri application");

            // Initialize database asynchronously
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match db::init_db(&handle).await {
                    Ok(pool) => {
                        info!("Database initialized successfully");
                        handle.manage(pool);
                    }
                    Err(e) => {
                        log::error!("Failed to initialize database: {}", e);
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_conversations,
            commands::get_conversation,
            commands::save_conversation,
            commands::delete_conversation,
            commands::get_table_names,
            commands::get_table_rows,
            commands::get_table_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

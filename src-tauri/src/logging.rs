use chrono::Local;
use log::LevelFilter;
use std::path::PathBuf;

/// Get the log file path with a session timestamp
fn get_log_path(log_dir: PathBuf) -> PathBuf {
    let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    log_dir.join(format!("loom_{}.log", timestamp))
}

/// Initialize logging to both console and file
pub fn init_logging(log_dir: Option<PathBuf>) {
    let log_path = if let Some(dir) = log_dir {
        get_log_path(dir)
    } else {
        let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
        PathBuf::from(format!("loom_{}.log", timestamp))
    };

    // Ensure parent directory exists
    if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let base_config = fern::Dispatch::new()
        .level(LevelFilter::Info)
        .level_for("sqlx", LevelFilter::Warn)
        .level_for("tao", LevelFilter::Warn)
        .format(|out, message, record| {
            out.finish(format_args!(
                "[{} {} {}] {}",
                Local::now().format("%Y-%m-%dT%H:%M:%S"),
                record.level(),
                record.target(),
                message
            ))
        });

    let stdout_config = fern::Dispatch::new().chain(std::io::stdout());

    let file_config =
        fern::Dispatch::new().chain(fern::log_file(&log_path).expect("failed to open log file"));

    base_config
        .chain(stdout_config)
        .chain(file_config)
        .apply()
        .expect("failed to initialize logging");

    log::info!("Logging initialized. Log file path: {:?}", log_path);
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn ensure_user_dirs(app: &tauri::AppHandle) {
    // User themes and plugins live in the app-data dir so people can add
    // their own without touching the install. Created on first launch.
    if let Ok(dir) = app.path().app_data_dir() {
        for sub in ["themes", "plugins"] {
            let p: PathBuf = dir.join(sub);
            if let Err(e) = fs::create_dir_all(&p) {
                eprintln!("could not create {}: {}", p.display(), e);
            }
        }
    }
}

#[tauri::command]
fn user_data_dir(app: tauri::AppHandle) -> String {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            ensure_user_dirs(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![user_data_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

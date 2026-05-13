use tauri::Manager;
use std::sync::Mutex;

// 拖动状态：记录鼠标按下时的窗口位置
struct DragState {
    window_x: f64,
    window_y: f64,
    mouse_x: f64,
    mouse_y: f64,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Mutex::new(DragState {
            window_x: 0.0,
            window_y: 0.0,
            mouse_x: 0.0,
            mouse_y: 0.0,
        }))
        .invoke_handler(tauri::generate_handler![
            set_cursor_passthrough,
            start_drag,
            drag_to
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // 设置窗口置顶
            window.set_always_on_top(true).unwrap();
            
            // 初始状态：不穿透，让窗口接收所有鼠标事件
            window.set_ignore_cursor_events(false).unwrap();
            
            // 显示窗口（防止闪烁黑框）
            window.show().unwrap();
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// 设置点击穿透（保留但不使用）
#[tauri::command]
fn set_cursor_passthrough(window: tauri::WebviewWindow, ignore: bool) {
    window.set_ignore_cursor_events(ignore).unwrap();
}

// 记录拖动起始状态
#[tauri::command]
fn start_drag(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Mutex<DragState>>,
    mouse_x: f64,
    mouse_y: f64,
) {
    if let Ok(pos) = window.outer_position() {
        if let Ok(mut s) = state.lock() {
            s.window_x = pos.x as f64;
            s.window_y = pos.y as f64;
            s.mouse_x = mouse_x;
            s.mouse_y = mouse_y;
        }
    }
}

// 移动窗口
#[tauri::command]
fn drag_to(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Mutex<DragState>>,
    mouse_x: f64,
    mouse_y: f64,
) {
    if let Ok(s) = state.lock() {
        let delta_x = mouse_x - s.mouse_x;
        let delta_y = mouse_y - s.mouse_y;
        let new_x = s.window_x + delta_x;
        let new_y = s.window_y + delta_y;
        drop(s);
        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
            x: new_x,
            y: new_y,
        }));
    }
}

use tauri::{
    Manager,
    menu::{MenuBuilder, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    image::Image,
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use std::sync::RwLock;

struct DragState {
    window_x: f64,
    window_y: f64,
    mouse_x: f64,
    mouse_y: f64,
}

struct AlphaMask {
    width: u32,
    height: u32,
    data: Vec<u8>,
}

impl AlphaMask {
    fn new() -> Self {
        Self {
            width: 0,
            height: 0,
            data: Vec::new(),
        }
    }

    fn update(&mut self, width: u32, height: u32, data: Vec<u8>) {
        self.width = width;
        self.height = height;
        self.data = data;
    }

    fn is_transparent(&self, x: u32, y: u32) -> bool {
        if self.width == 0 || self.height == 0 {
            return false;
        }
        if x >= self.width || y >= self.height {
            return true;
        }
        let index = (y * self.width + x) as usize;
        if index < self.data.len() {
            self.data[index] < 128
        } else {
            true
        }
    }
}

struct PixelMonitorState {
    running: AtomicBool,
    is_window_dragging: AtomicBool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let monitor_state = Arc::new(PixelMonitorState {
        running: AtomicBool::new(false),
        is_window_dragging: AtomicBool::new(false),
    });
    let alpha_mask = Arc::new(RwLock::new(AlphaMask::new()));

    let alpha_mask_clone = alpha_mask.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(std::sync::Mutex::new(DragState {
            window_x: 0.0,
            window_y: 0.0,
            mouse_x: 0.0,
            mouse_y: 0.0,
        }))
        .manage(monitor_state.clone())
        .manage(alpha_mask.clone())
        .invoke_handler(tauri::generate_handler![
            start_drag,
            drag_to,
            start_pixel_monitor,
            stop_pixel_monitor,
            update_alpha_mask,
            set_window_dragging
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();

            window.set_always_on_top(true).unwrap();
            window.set_ignore_cursor_events(false).unwrap();
            window.show().unwrap();

            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let separator_item = MenuItem::with_id(app, "sep1", "", true, None::<&str>)?;
            let feedback_item = MenuItem::with_id(app, "feedback", "意见反馈", true, None::<&str>)?;
            let update_item = MenuItem::with_id(app, "update", "检查更新", true, None::<&str>)?;
            let separator_item2 = MenuItem::with_id(app, "sep2", "", true, None::<&str>)?;
            let version_item = MenuItem::with_id(app, "version", "v1.0.0", false, None::<&str>)?;

            let menu = MenuBuilder::new(app).items(&[
                &quit_item,
                &separator_item,
                &feedback_item,
                &update_item,
                &separator_item2,
                &version_item,
            ]).build()?;

            let _tray = TrayIconBuilder::new()
                .icon(
                    app.default_window_icon().cloned().unwrap_or_else(|| {
                        Image::from_bytes(include_bytes!("../icons/fish.ico"))
                            .expect("failed to load tray icon")
                    })
                )
                .tooltip("牛马工资计算器")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    match event.id().0.as_str() {
                        "quit" => { app.exit(0); }
                        "feedback" => {}
                        "update" => {}
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    match &event {
                        TrayIconEvent::Click { button, .. } => {
                            if button == &tauri::tray::MouseButton::Left {
                                let app = tray.app_handle();
                                if let Some(w) = app.get_webview_window("main") {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            let window_clone = window.clone();
            let monitor_state_clone = monitor_state.clone();
            let alpha_mask_for_thread = alpha_mask_clone.clone();

            thread::spawn(move || {
                thread::sleep(Duration::from_millis(500));
                start_pixel_detection(window_clone, monitor_state_clone, alpha_mask_for_thread);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn start_pixel_detection(
    window: tauri::WebviewWindow,
    state: Arc<PixelMonitorState>,
    alpha_mask: Arc<RwLock<AlphaMask>>,
) {
    state.running.store(true, Ordering::Relaxed);

    let scale_factor = window.scale_factor().unwrap_or(1.0);

    while state.running.load(Ordering::Relaxed) {
        if state.is_window_dragging.load(Ordering::Relaxed) {
            let _ = window.set_ignore_cursor_events(false);
            thread::sleep(Duration::from_millis(30));
            continue;
        }

        let mouse_pos = match window.cursor_position() {
            Ok(pos) => pos,
            Err(_) => {
                thread::sleep(Duration::from_millis(30));
                continue;
            }
        };

        let window_pos = match window.outer_position() {
            Ok(pos) => pos,
            Err(_) => {
                thread::sleep(Duration::from_millis(30));
                continue;
            }
        };

        let rel_x = ((mouse_pos.x as f64) - (window_pos.x as f64)) / scale_factor;
        let rel_y = ((mouse_pos.y as f64) - (window_pos.y as f64)) / scale_factor;

        let size = match window.inner_size() {
            Ok(s) => s,
            Err(_) => {
                thread::sleep(Duration::from_millis(30));
                continue;
            }
        };

        let width = size.width as f64 / scale_factor;
        let height = size.height as f64 / scale_factor;

        if rel_x >= 0.0 && rel_x < width && rel_y >= 0.0 && rel_y < height {
            let is_transparent = {
                let mask = alpha_mask.read().unwrap();
                mask.is_transparent(rel_x as u32, rel_y as u32)
            };

            if is_transparent {
                let _ = window.set_ignore_cursor_events(true);
            } else {
                let _ = window.set_ignore_cursor_events(false);
            }
        } else {
            let _ = window.set_ignore_cursor_events(true);
        }

        thread::sleep(Duration::from_millis(30));
    }
}

#[tauri::command]
fn start_drag(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, std::sync::Mutex<DragState>>,
    mouse_x: f64,
    mouse_y: f64,
) {
    if let Ok(pos) = window.outer_position() {
        let scale_factor = window.scale_factor().unwrap_or(1.0);
        if let Ok(mut s) = state.lock() {
            s.window_x = pos.x as f64 / scale_factor;
            s.window_y = pos.y as f64 / scale_factor;
            s.mouse_x = mouse_x;
            s.mouse_y = mouse_y;
        }
    }
}

#[tauri::command]
fn drag_to(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, std::sync::Mutex<DragState>>,
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

#[tauri::command]
fn start_pixel_monitor() {}

#[tauri::command]
fn stop_pixel_monitor(state: tauri::State<'_, Arc<PixelMonitorState>>) {
    state.running.store(false, Ordering::Relaxed);
}

#[tauri::command]
fn update_alpha_mask(
    alpha_mask: tauri::State<'_, Arc<RwLock<AlphaMask>>>,
    width: u32,
    height: u32,
    data: Vec<u8>,
) {
    let mut mask = alpha_mask.write().unwrap();
    mask.update(width, height, data);
}

#[tauri::command]
fn set_window_dragging(state: tauri::State<'_, Arc<PixelMonitorState>>, dragging: bool) {
    state.is_window_dragging.store(dragging, Ordering::Relaxed);
}

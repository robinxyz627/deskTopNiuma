use tauri::Manager;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use std::sync::RwLock;

// 拖动状态
struct DragState {
    window_x: f64,
    window_y: f64,
    mouse_x: f64,
    mouse_y: f64,
}

// 透明遮罩缓存
struct AlphaMask {
    width: u32,
    height: u32,
    // 每个像素一个字节，存储 Alpha 值
    // 索引计算: y * width + x
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
            // Alpha < 128 视为透明
            self.data[index] < 128
        } else {
            true
        }
    }
}

// 像素检测状态
struct PixelMonitorState {
    running: AtomicBool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let monitor_state = Arc::new(PixelMonitorState {
        running: AtomicBool::new(false),
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
            update_alpha_mask
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();

            // 设置窗口置顶
            window.set_always_on_top(true).unwrap();

            // 初始状态：不穿透，让窗口接收事件
            window.set_ignore_cursor_events(false).unwrap();

            // 显示窗口
            window.show().unwrap();

            // 启动像素监控线程
            let window_clone = window.clone();
            let monitor_state_clone = monitor_state.clone();
            let alpha_mask_for_thread = alpha_mask_clone.clone();

            thread::spawn(move || {
                // 等待窗口完全初始化
                thread::sleep(Duration::from_millis(500));

                start_pixel_detection(window_clone, monitor_state_clone, alpha_mask_for_thread);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 启动像素检测线程
/// 持续监控鼠标位置，查表判断透明度
/// 采样频率：约 30ms (约 33 FPS)
fn start_pixel_detection(
    window: tauri::WebviewWindow,
    state: Arc<PixelMonitorState>,
    alpha_mask: Arc<RwLock<AlphaMask>>,
) {
    state.running.store(true, Ordering::Relaxed);

    // 获取窗口的 scale factor (DPI 缩放)
    let scale_factor = window.scale_factor().unwrap_or(1.0);

    while state.running.load(Ordering::Relaxed) {
        // 获取鼠标屏幕坐标
        let mouse_pos = match window.cursor_position() {
            Ok(pos) => pos,
            Err(_) => {
                thread::sleep(Duration::from_millis(30));
                continue;
            }
        };

        // 获取窗口位置
        let window_pos = match window.outer_position() {
            Ok(pos) => pos,
            Err(_) => {
                thread::sleep(Duration::from_millis(30));
                continue;
            }
        };

        // 计算鼠标相对于窗口的坐标（考虑 DPI 缩放）
        let rel_x = ((mouse_pos.x as f64) - (window_pos.x as f64)) / scale_factor;
        let rel_y = ((mouse_pos.y as f64) - (window_pos.y as f64)) / scale_factor;

        // 获取窗口大小
        let size = match window.inner_size() {
            Ok(s) => s,
            Err(_) => {
                thread::sleep(Duration::from_millis(30));
                continue;
            }
        };

        let width = size.width as f64 / scale_factor;
        let height = size.height as f64 / scale_factor;

        // 检查鼠标是否在窗口范围内
        if rel_x >= 0.0 && rel_x < width && rel_y >= 0.0 && rel_y < height {
            // 查表判断透明度
            let is_transparent = {
                let mask = alpha_mask.read().unwrap();
                mask.is_transparent(rel_x as u32, rel_y as u32)
            };

            // 根据透明度设置穿透状态
            if is_transparent {
                // 透明区域 -> 穿透
                let _ = window.set_ignore_cursor_events(true);
            } else {
                // 非透明区域 -> 可点击
                let _ = window.set_ignore_cursor_events(false);
            }
        } else {
            // 鼠标在窗口外 -> 穿透
            let _ = window.set_ignore_cursor_events(true);
        }

        // 采样间隔：30ms (约 33 FPS)
        thread::sleep(Duration::from_millis(30));
    }
}

// 记录拖动起始状态
#[tauri::command]
fn start_drag(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, std::sync::Mutex<DragState>>,
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

// 启动像素监控（命令接口，实际已在 setup 中启动）
#[tauri::command]
fn start_pixel_monitor() {
    // 监控线程已在 setup 中启动
}

// 停止像素监控
#[tauri::command]
fn stop_pixel_monitor(state: tauri::State<'_, Arc<PixelMonitorState>>) {
    state.running.store(false, Ordering::Relaxed);
}

// 更新透明遮罩缓存
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

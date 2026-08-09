// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // NOTE: This was added because the app will not work on X11 compositing settings.
    // Disabling the DMA buffer does mean that the app will use more CPU cycles,
    // but hey, at least it works...
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    streamer_lib::run()
}

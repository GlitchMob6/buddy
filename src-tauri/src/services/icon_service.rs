/// Icon extraction service — extracts application icons on Windows.
///
/// Uses Windows Shell API to pull the best available icon from exe files,
/// queries the actual bitmap dimensions via GetObject, then converts
/// to PNG and base64-encodes for frontend consumption.

#[cfg(target_os = "windows")]
pub fn extract_icon_base64(exe_path: &str) -> Option<String> {
    let wide_path: Vec<u16> = exe_path.encode_utf16().chain(std::iter::once(0)).collect();

    // Try progressively smaller sizes — pick the first one that succeeds
    for &target_size in &[48i32, 32i32] {
        if let Some(result) = unsafe { try_extract(target_size, &wide_path) } {
            return Some(result);
        }
    }

    return None;

    unsafe fn try_extract(target_size: i32, wide_path: &[u16]) -> Option<String> {
        use base64::Engine;
        use image::RgbaImage;
        use std::mem;
        use windows::Win32::Graphics::Gdi::{
            CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, GetObjectW,
            BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        };
        use windows::Win32::UI::WindowsAndMessaging::{
            DestroyIcon, GetIconInfo, HICON, ICONINFO, PrivateExtractIconsW,
        };

        let mut szfilename = [0u16; 260];
        let copy_len = wide_path.len().min(260);
        szfilename[..copy_len].copy_from_slice(&wide_path[..copy_len]);

        let mut icons: [HICON; 1] = [mem::zeroed()];
        let mut icon_id: u32 = 0;

        let count = PrivateExtractIconsW(
            &szfilename,
            0,
            target_size,
            target_size,
            Some(&mut icons),
            Some(&mut icon_id as *mut u32),
            0,
        );

        let icon = icons[0];

        if count == 0 || icon.0.is_null() {
            return None;
        }

        // Get the color bitmap from the icon
        let mut icon_info: ICONINFO = mem::zeroed();
        if GetIconInfo(icon, &mut icon_info).is_err() {
            DestroyIcon(icon).ok();
            return None;
        }

        // Query the ACTUAL bitmap dimensions instead of assuming target_size
        let mut bm: BITMAP = mem::zeroed();
        let got = GetObjectW(
            icon_info.hbmColor,
            mem::size_of::<BITMAP>() as i32,
            Some(&mut bm as *mut BITMAP as *mut _),
        );

        let (width, height) = if got > 0 && bm.bmWidth > 0 && bm.bmHeight > 0 {
            (bm.bmWidth, bm.bmHeight)
        } else {
            (target_size, target_size)
        };

        let hdc = CreateCompatibleDC(None);
        if hdc.is_invalid() {
            cleanup_icon_info(&icon_info);
            DestroyIcon(icon).ok();
            return None;
        }

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // negative = top-down
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0 as u32,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [mem::zeroed(); 1],
        };

        let buf_size = (width * height * 4) as usize;
        let mut bits: Vec<u8> = vec![0u8; buf_size];

        let lines = GetDIBits(
            hdc,
            icon_info.hbmColor,
            0,
            height as u32,
            Some(bits.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        // Cleanup GDI resources
        let _ = DeleteDC(hdc);
        cleanup_icon_info(&icon_info);
        let _ = DestroyIcon(icon);

        if lines == 0 {
            return None;
        }

        // Windows gives us BGRA — convert to RGBA
        for i in (0..bits.len()).step_by(4) {
            bits.swap(i, i + 2); // swap B ↔ R
        }

        // Encode as PNG
        let img = RgbaImage::from_raw(width as u32, height as u32, bits)?;
        let mut png_bytes: Vec<u8> = Vec::new();
        {
            use image::codecs::png::PngEncoder;
            use image::ImageEncoder;
            let encoder = PngEncoder::new(&mut png_bytes);
            encoder
                .write_image(
                    img.as_raw(),
                    width as u32,
                    height as u32,
                    image::ExtendedColorType::Rgba8,
                )
                .ok()?;
        }

        Some(base64::engine::general_purpose::STANDARD.encode(&png_bytes))
    }

    #[inline]
    unsafe fn cleanup_icon_info(info: &windows::Win32::UI::WindowsAndMessaging::ICONINFO) {
        use windows::Win32::Graphics::Gdi::DeleteObject;
        if !info.hbmColor.is_invalid() {
            let _ = DeleteObject(info.hbmColor);
        }
        if !info.hbmMask.is_invalid() {
            let _ = DeleteObject(info.hbmMask);
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn extract_icon_base64(_exe_path: &str) -> Option<String> {
    // Icon extraction not supported on this platform
    None
}

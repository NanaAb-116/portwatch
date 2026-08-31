use tauri::{PhysicalPosition, PhysicalRect, PhysicalSize};

const PANEL_GAP: i32 = 8;
const SCREEN_MARGIN: i32 = 8;

pub fn panel_position(
    tray: PhysicalRect<i32, u32>,
    panel: PhysicalSize<u32>,
    work_area: PhysicalRect<i32, u32>,
) -> PhysicalPosition<i32> {
    let work_top = work_area.position.y;
    let work_bottom = work_top.saturating_add(work_area.size.height as i32);
    let tray_center_x = tray.position.x.saturating_add((tray.size.width / 2) as i32);
    let tray_bottom = tray.position.y.saturating_add(tray.size.height as i32);
    let panel_width = panel.width as i32;
    let panel_height = panel.height as i32;

    let preferred_x = tray_center_x.saturating_sub(panel_width / 2);
    let room_below = work_bottom.saturating_sub(tray_bottom);
    let preferred_y = if room_below >= panel_height.saturating_add(PANEL_GAP) {
        tray_bottom.saturating_add(PANEL_GAP)
    } else {
        tray.position
            .y
            .saturating_sub(panel_height)
            .saturating_sub(PANEL_GAP)
    };

    clamp_to_work_area(
        PhysicalPosition::new(preferred_x, preferred_y),
        panel,
        work_area,
    )
}

pub fn fallback_position(
    panel: PhysicalSize<u32>,
    work_area: PhysicalRect<i32, u32>,
) -> PhysicalPosition<i32> {
    let preferred = PhysicalPosition::new(
        work_area
            .position
            .x
            .saturating_add(work_area.size.width as i32)
            .saturating_sub(panel.width as i32)
            .saturating_sub(SCREEN_MARGIN),
        work_area.position.y.saturating_add(SCREEN_MARGIN),
    );
    clamp_to_work_area(preferred, panel, work_area)
}

fn clamp_to_work_area(
    position: PhysicalPosition<i32>,
    panel: PhysicalSize<u32>,
    work_area: PhysicalRect<i32, u32>,
) -> PhysicalPosition<i32> {
    let min_x = work_area.position.x.saturating_add(SCREEN_MARGIN);
    let min_y = work_area.position.y.saturating_add(SCREEN_MARGIN);
    let max_x = work_area
        .position
        .x
        .saturating_add(work_area.size.width as i32)
        .saturating_sub(panel.width as i32)
        .saturating_sub(SCREEN_MARGIN)
        .max(min_x);
    let max_y = work_area
        .position
        .y
        .saturating_add(work_area.size.height as i32)
        .saturating_sub(panel.height as i32)
        .saturating_sub(SCREEN_MARGIN)
        .max(min_y);

    PhysicalPosition::new(
        position.x.clamp(min_x, max_x),
        position.y.clamp(min_y, max_y),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(x: i32, y: i32, width: u32, height: u32) -> PhysicalRect<i32, u32> {
        PhysicalRect {
            position: PhysicalPosition::new(x, y),
            size: PhysicalSize::new(width, height),
        }
    }

    #[test]
    fn positions_below_a_top_tray_and_centers_on_the_icon() {
        let position = panel_position(
            rect(900, 0, 24, 24),
            PhysicalSize::new(400, 560),
            rect(0, 0, 1920, 1080),
        );
        assert_eq!(position, PhysicalPosition::new(712, 32));
    }

    #[test]
    fn positions_above_a_bottom_tray() {
        let position = panel_position(
            rect(1800, 1040, 24, 24),
            PhysicalSize::new(400, 560),
            rect(0, 0, 1920, 1080),
        );
        assert_eq!(position.y, 472);
    }

    #[test]
    fn clamps_to_negative_origin_monitor_work_area() {
        let work_area = rect(-1920, 0, 1920, 1080);
        let position = panel_position(
            rect(-1918, 0, 20, 20),
            PhysicalSize::new(400, 560),
            work_area,
        );
        assert_eq!(position.x, -1912);
        assert!(position.y >= 8);
    }

    #[test]
    fn fallback_is_predictable_and_inside_the_monitor() {
        let position = fallback_position(PhysicalSize::new(400, 560), rect(1920, 120, 1280, 900));
        assert_eq!(position, PhysicalPosition::new(2792, 128));
    }
}

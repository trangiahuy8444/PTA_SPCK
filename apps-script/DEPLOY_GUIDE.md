# Hướng dẫn triển khai & cập nhật Google Apps Script (v3.0)

Hệ thống chạy trực tiếp trên Google Drive của thầy qua **Google Apps Script**:
- Học sinh chỉ cần **nhập Họ và tên** trên web là mở lại được toàn bộ nội dung đã làm và các tệp bài làm đã nộp.
- Mọi lần lưu hoặc nộp bài đều tạo **phiên bản mới (`v001`, `v002`, ...)** trong `versions/` và `Tuan_X_.../vNNN_.../` — **không bao giờ ghi đè phiên bản cũ**.

---

## Nếu bạn ĐÃ tạo project & chạy `setupProject()` trước đó (chỉ cập nhật code mới)
1. Mở tab **Apps Script Editor** hiện tại (`PTA_SPCK_Drive_API`).
2. Xóa toàn bộ code cũ trong `Code.gs`, dán toàn bộ nội dung mới từ [Code.gs](./Code.gs) vào và bấm **Lưu (`Cmd/Ctrl + S`)**.
3. **Không cần chạy lại `setupProject()`** (thư mục `PTA_SPCK_Submissions` và file `Tracking_Master` cũ được giữ nguyên; hai tab `HoSoHocSinh` và `LichSuPhienBan` sẽ tự động tạo thêm khi có học sinh đầu tiên lưu bài).
4. Để **giữ nguyên Web App URL cũ** đang gắn trong web:
   - Bấm **Triển khai (Deploy)** → **Quản lý các mục triển khai (Manage deployments)**.
   - Bấm biểu tượng **Chỉnh sửa (cây bút chì)** ở mục triển khai hiện có.
   - Ở ô **Phiên bản (Version)**, chọn **Phiên bản mới (New version)**.
   - Bấm **Triển khai (Deploy)**.

---

## Nếu tạo mới từ đầu
1. Vào [script.google.com](https://script.google.com) → **Dự án mới** → dán nội dung [Code.gs](./Code.gs) → Lưu.
2. Chọn hàm **`setupProject`** → bấm **Chạy (Run)** và cấp quyền Google Drive / Sheets.
3. Bấm **Triển khai (Deploy)** → **Tùy chọn triển khai mới** → chọn **Ứng dụng web (Web app)**:
   - **Thực thi dưới danh nghĩa:** `Tôi (Me)`
   - **Người có quyền truy cập:** `Bất kỳ ai (Anyone)`
4. Copy **Web app URL** và cập nhật vào `DEFAULT_CLOUD_API` trong `build/index.tpl.html` rồi chạy `python3 build/build.py`.

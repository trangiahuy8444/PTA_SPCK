# Hướng dẫn triển khai & cập nhật Google Apps Script (v3.1)

Hệ thống chạy trực tiếp trên Google Drive của giáo viên qua **Google Apps Script**:
- Học sinh chỉ cần **nhập Họ và tên** trên web (tự động chuẩn hóa viết thường, không dấu). Nếu chưa có hồ sơ thì hệ thống tự tạo mới; nếu đã có thì mở toàn bộ bài làm và tệp đã nộp ngay trên web với nút **Tải về**.
- **Không lộ đường dẫn Drive** cho học sinh.
- Mọi lần lưu hoặc nộp bài đều tạo **phiên bản mới (`v001`, `v002`, ...)** — **không bao giờ ghi đè phiên bản cũ**.

---

## Nếu bạn ĐÃ tạo project & chạy `setupProject()` trước đó (chỉ cập nhật code mới)
1. Mở tab **Apps Script Editor** hiện tại (`PTA_SPCK_Drive_API`).
2. Xóa toàn bộ code cũ trong `Code.gs`, dán toàn bộ nội dung mới từ [Code.gs](./Code.gs) vào và bấm **Lưu (`Cmd/Ctrl + S`)**.
3. **Không cần chạy lại `setupProject()`** (thư mục `PTA_SPCK_Submissions` và file `Tracking_Master` cũ được giữ nguyên).
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

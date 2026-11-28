# Hướng dẫn triển khai & cập nhật Google Apps Script (v3.2)

Hệ thống chạy trực tiếp trên Google Drive của giáo viên qua **Google Apps Script**:
- **Học sinh (`index.html`)**: Chỉ cần **nhập Họ và tên** (tự động chuẩn hóa viết thường, không dấu). Nếu chưa có hồ sơ thì hệ thống tự tạo mới; nếu đã có thì mở toàn bộ bài làm và tệp đã nộp ngay trên web với nút **Tải về**. Không lộ link Drive. Mọi lần lưu/nộp tạo phiên bản mới (`v001`, `v002`, ...), không ghi đè bản cũ.
- **Giáo viên (`gv.html`)**: Cổng riêng tại `https://trangiahuy8444.github.io/PTA_SPCK/gv.html`, khóa bằng `TEACHER_KEY` để xem tổng hợp tiến độ từng buổi, tùy chỉnh đánh giá từng học sinh, copy báo cáo gửi phụ huynh, lưu lên tab `BaoCaoPhuHuynh` trong `Tracking_Master` và xuất file `.txt` vào thư mục `PTA_SPCK_Submissions/BaoCao_PhuHuynh/`.

---

## Nếu bạn ĐÃ tạo project & chạy `setupProject()` trước đó (chỉ cập nhật code mới)
1. Mở tab **Apps Script Editor** hiện tại (`PTA_SPCK_Drive_API`).
2. Xóa toàn bộ code cũ trong `Code.gs`, dán toàn bộ nội dung mới từ [Code.gs](./Code.gs) vào và bấm **Lưu (`Cmd/Ctrl + S`)**.
3. Để xem lại mã đăng nhập trang Giáo viên (hoặc tạo mới nếu chưa có): chọn hàm **`xemHoacTaoMaGiaoVien`** → bấm **Chạy (Run)** → xem dòng `TEACHER_KEY=...` trong Nhật ký thực thi. *(Không cần chạy lại `setupProject()`, thư mục `PTA_SPCK_Submissions` và file `Tracking_Master` cũ được giữ nguyên.)*
4. Để **giữ nguyên Web App URL cũ** đang gắn trong web:
   - Bấm **Triển khai (Deploy)** → **Quản lý các mục triển khai (Manage deployments)**.
   - Bấm biểu tượng **Chỉnh sửa (cây bút chì)** ở mục triển khai hiện có.
   - Ở ô **Phiên bản (Version)**, chọn **Phiên bản mới (New version)**.
   - Bấm **Triển khai (Deploy)**.

---

## Cách dùng báo cáo phụ huynh trên Google Drive / Trang Giáo viên
1. **Cách 1 — Qua trang Giáo viên (`gv.html`)**: Mở `https://trangiahuy8444.github.io/PTA_SPCK/gv.html` → nhập `TEACHER_KEY` → chọn **Tuần khóa học** (VD `10`) và **Yêu cầu trên web** (VD `tuan-2`) → tùy chỉnh tên có dấu, tick bổ sung hoặc ghi chú cho từng học sinh → bấm **Sao chép gửi phụ huynh** hoặc **Lưu lên Google Sheet & Xuất file Drive (.txt)**.
2. **Cách 2 — Trực tiếp trên Google Sheet (`Tracking_Master`)**: Mở tab **`BaoCaoPhuHuynh`** để lấy sẵn cột `NoiDungGuiPhuHuynh` (tự động cập nhật khi học sinh lưu/nộp bài, hoặc chỉnh ô `B1`/`B2` rồi chạy hàm `capNhatBaoCaoPhuHuynh` trong Apps Script để làm mới toàn lớp và xuất file vào `PTA_SPCK_Submissions/BaoCao_PhuHuynh/`).

---

## Nếu tạo mới từ đầu
1. Vào [script.google.com](https://script.google.com) → **Dự án mới** → dán nội dung [Code.gs](./Code.gs) → Lưu.
2. Chọn hàm **`setupProject`** → bấm **Chạy (Run)** và cấp quyền Google Drive / Sheets.
3. Bấm **Triển khai (Deploy)** → **Tùy chọn triển khai mới** → chọn **Ứng dụng web (Web app)**:
   - **Thực thi dưới danh nghĩa:** `Tôi (Me)`
   - **Người có quyền truy cập:** `Bất kỳ ai (Anyone)`
4. Copy **Web app URL** và cập nhật vào `DEFAULT_CLOUD_API` trong `build/index.tpl.html` rồi chạy `python3 build/build.py`.

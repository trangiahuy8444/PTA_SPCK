# Hướng dẫn triển khai Google Drive & Google Sheets Backend (1 lần duy nhất)

Hệ thống dùng **Google Apps Script** chạy trực tiếp dưới tài khoản Google Drive của giáo viên. Học sinh **không cần đăng nhập Google OAuth**, chỉ cần nhập **Mã lớp + Mã học viên + PIN 4 số** để lưu bài và nộp file vào đúng thư mục trên Drive của thầy.

---

## Bước 1: Tạo dự án Apps Script
1. Truy cập [script.google.com](https://script.google.com) bằng tài khoản Google Drive dùng để thu bài lớp học.
2. Bấm **Dự án mới (New project)**, đặt tên là `PTA_SPCK_Drive_API`.
3. Xóa code mặc định trong file `Code.gs`, dán toàn bộ nội dung của file [Code.gs](./Code.gs) vào và bấm **Lưu (`Ctrl/Cmd + S`)**.

## Bước 2: Khởi tạo thư mục Drive & Google Sheet
1. Trên thanh công cụ của Apps Script Editor, chọn hàm **`setupProject`** và bấm **Chạy (Run)**.
2. Ở lần chạy đầu, Google yêu cầu cấp quyền truy cập Drive & Google Sheets → bấm **Review permissions** → chọn tài khoản của thầy → **Advanced** → **Go to PTA_SPCK_Drive_API (unsafe)** → **Allow**.
3. Mở **Nhật ký thực thi (Execution log)** để lấy 3 thông tin vừa sinh tự động:
   - `ROOT_FOLDER_URL`: Thư mục `PTA_SPCK_Submissions` trên Google Drive.
   - `SHEET_URL`: File Google Sheet `Tracking_Master` (gồm 3 tab: `TienDo`, `NopBaiLog`, `Deadlines`).
   - `TEACHER_KEY`: Mã khóa giáo viên (ví dụ `GV-A1B2C3D4`) dùng để đồng bộ ở tab **Dành cho giáo viên**.

## Bước 3: Cài đặt Hạn nộp BTVN (tuỳ chọn)
1. Mở file Google Sheet `Tracking_Master` → sang tab **`Deadlines`**.
2. Điền hạn nộp theo định dạng ISO có múi giờ Việt Nam (`2026-12-04T20:00:00+07:00`) cho các dòng `tuan-1`, `btvn-1`, `tuan-2`, `btvn-2`, ...
   - Nếu để trống, trạng thái nộp sẽ ghi là `Đã nộp`.
   - Nếu có hạn nộp, hệ thống tự phân loại **`Đúng hạn`** hoặc **`Nộp trễ`** theo giờ server Google.

## Bước 4: Deploy thành Web App
1. Ở góc trên phải Apps Script Editor, bấm **Triển khai (Deploy)** → **Tùy chọn triển khai mới (New deployment)**.
2. Chọn loại **Ứng dụng web (Web app)**:
   - **Thực thi dưới danh nghĩa (Execute as):** `Tôi (Me)`
   - **Người có quyền truy cập (Who has access):** `Bất kỳ ai (Anyone)`
3. Bấm **Triển khai (Deploy)** và sao chép đường dẫn **Web app URL** (`https://script.google.com/macros/s/.../exec`).

## Bước 5: Kết nối vào trang Web lớp học
1. Mở trang web `PTA_SPCK` → vào mục **Dành cho giáo viên**.
2. Dán **Web app URL**, **Teacher Key** (lấy ở Bước 2) và nhập **Mã lớp** (ví dụ `PTA01`).
3. Bấm **Kiểm tra kết nối** để xác nhận OK.
4. Bấm **Sao chép link lớp cho HS** — trang web tạo sẵn URL dạng:
   `https://trangiahuy8444.github.io/PTA_SPCK/?api=...&class=PTA01#tuan-1`
5. Gửi link này lên nhóm lớp (Zalo/Classroom). Học sinh mở link lên là đã nối sẵn vào đúng lớp và Drive của thầy.

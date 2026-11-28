# App Producer Advanced · Dự án cá nhân 4 tuần

Web hỗ trợ học sinh làm dự án cá nhân trong 4 tuần (Qt Designer + Python PyQt6), kết hợp Google Drive & Google Sheets để lưu tiến độ xuyên suốt các buổi học và tạo phiếu báo cáo phụ huynh.

| Tuần | Nội dung | Nộp |
|---|---|---|
| 1 | Lên ý tưởng AI, bảng màu và bản mẫu Uizard | Lab10 |
| 2 | Thiết kế 3 form Qt Designer (`login.ui`, `register.ui`, `home.ui`), kho Icon/Ảnh, QSS | Lab11 |
| 3 | Python: `auth.py`, `main.py`, chuyển 3 form, lưu tài khoản & bảng Debug | Lab12 |
| 4 | Kiểm thử chéo, chức năng riêng (3 mẫu mini), thuyết trình | SPCK_Final |

## Cấu trúc thư mục

```
site/                    # Phần được đăng lên GitHub Pages
├─ index.html            # Hub thống nhất Tuần 1–4, Hồ sơ nộp, Giáo viên (file build ra)
└─ week1.html            # Bản lưu trữ trang Tuần 1 cũ (đã gộp nội dung vào index.html)
build/                   # Nguồn của index.html
├─ index.tpl.html        # Mã trang (HTML + JS), có chỗ giữ chỗ /*CSS*/
├─ base.css              # CSS dùng chung
└─ build.py              # Ghép hai file trên thành site/index.html
apps-script/             # Backend Google Drive + Google Sheets (không cần server riêng)
├─ Code.gs               # Google Apps Script API (load_state, save_state, submit_week, teacher_sync)
└─ DEPLOY_GUIDE.md       # Hướng dẫn giáo viên deploy Web App trong 5 phút
tests/hub.test.js        # Kiểm thử giao diện, hàm thuần và cú pháp Code.gs bằng jsdom
examples/python-reference/   # Mã Python mẫu (Tuần 3) dùng để đối chiếu và chạy thử
```

## Làm việc

- Sửa `build/index.tpl.html` hoặc `build/base.css`, rồi `python3 build/build.py`. Không sửa tay `site/index.html`.
- Kiểm thử: `npm install` một lần, sau đó `npm test`.
- Hub tự di trú một lần dữ liệu cũ từ `localStorage` khóa `app_producer_advanced_week1_v2` và lưu tại `apa-hub-4-tuan-v1`, kèm đồng bộ lên Google Drive thông qua [Code.gs](./apps-script/Code.gs) (xem [DEPLOY_GUIDE.md](./apps-script/DEPLOY_GUIDE.md)).
- Mã mẫu Python dùng PyQt6: `pyuic6 login.ui -o ui_login.py` (hoặc `python -m PyQt6.uic.pyuic`). Chạy thử `t_main.py` cần `pip install PyQt6`.

## Ghi chú

- Các nút tải về (`.py`, `.txt`, `.csv`, `.html`, `.json`) dùng `Blob` chuẩn trình duyệt và có nút sao lưu/khôi phục tiến độ `.json`.
- PyQt6 không có `pyrcc6`: hình ảnh và icon được đặt trong `assets/icons/` và `assets/images/`, nạp qua đường dẫn tương đối `BASE_DIR`.
- Mật khẩu trong `auth.py` mẫu băm SHA-256 không muối: chỉ dùng cho bài học, không dùng mật khẩu thật.

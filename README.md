# App Producer Advanced · Dự án cá nhân 4 tuần

Web hỗ trợ học sinh làm dự án cá nhân trong 4 tuần (Qt Designer + Python PyQt6), kết nối trực tiếp Google Drive & Google Sheets để lưu hồ sơ theo tên học sinh theo từng phiên bản bất biến (không ghi đè).

| Tuần | Nội dung | Nộp |
|---|---|---|
| 1 | Lên ý tưởng AI, bảng màu và bản mẫu Uizard | Lab10 |
| 2 | Thiết kế 3 form Qt Designer (`login.ui`, `register.ui`, `home.ui`), kho Icon/Ảnh, QSS | Lab11 |
| 3 | Python: `auth.py`, `main.py`, chuyển 3 form, lưu tài khoản & bảng Debug | Lab12 |
| 4 | Kiểm thử chéo, chức năng riêng (3 mẫu mini), thuyết trình | SPCK_Final |

## Cấu trúc thư mục

```
site/                    # Phần được đăng lên GitHub Pages
├─ index.html            # Hub thống nhất Tuần 1–4 & Hồ sơ nộp (file build ra)
└─ week1.html            # Bản lưu trữ trang Tuần 1 cũ (đã gộp nội dung vào index.html)
build/                   # Nguồn của index.html
├─ index.tpl.html        # Mã trang (HTML + JS), có chỗ giữ chỗ /*CSS*/
├─ base.css              # CSS dùng chung
└─ build.py              # Ghép hai file trên thành site/index.html
apps-script/             # Backend Google Drive + Google Sheets (không ghi đè phiên bản)
├─ Code.gs               # Google Apps Script API v3.0 (load_student, save_version, submit_week, get_file, load_version)
└─ DEPLOY_GUIDE.md       # Hướng dẫn cập nhật/triển khai Web App
tests/hub.test.js        # Kiểm thử giao diện, hàm thuần và cú pháp Code.gs bằng jsdom
examples/python-reference/   # Mã Python mẫu (Tuần 3) dùng để đối chiếu và chạy thử
```

## Làm việc

- Sửa `build/index.tpl.html` hoặc `build/base.css`, rồi `python3 build/build.py`. Không sửa tay `site/index.html`.
- Kiểm thử: `npm install` một lần, sau đó `npm test`.
- Học sinh chỉ cần nhập **Họ và tên** ở đầu trang để tải lại toàn bộ nội dung, kho tệp bài làm và lịch sử các phiên bản đã nộp trên Google Drive.
- Mã mẫu Python dùng PyQt6: `pyuic6 login.ui -o ui_login.py` (hoặc `python -m PyQt6.uic.pyuic`). Chạy thử `t_main.py` cần `pip install PyQt6`.

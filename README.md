# App Producer Advanced · Dự án cá nhân 4 tuần

Web hỗ trợ học sinh làm dự án cá nhân trong 4 tuần (Qt Designer + Python) và giúp giáo viên theo dõi tiến độ, tạo phiếu báo cáo phụ huynh.

| Tuần | Nội dung | Nộp |
|---|---|---|
| 1 | Lên ý tưởng AI và bản mẫu Uizard (trang do giáo viên chốt) | Lab10 |
| 2 | Thiết kế 3 form Qt Designer: `login.ui`, `register.ui`, `home.ui` | Lab11 |
| 3 | Python: `auth.py`, `main.py`, chuyển 3 form, lưu tài khoản | Lab12 |
| 4 | Kiểm thử chéo, chức năng riêng, thuyết trình | SPCK_Final |

## Cấu trúc thư mục

```
site/                    # Phần được đăng lên web (hai file phải nằm cạnh nhau)
├─ index.html            # Hub Tuần 1–4, Hồ sơ nộp, Giáo viên (file build ra)
└─ week1.html            # Tuần 1 do giáo viên chốt, KHÔNG sửa
build/                   # Nguồn của index.html
├─ index.tpl.html        # Mã trang (HTML + JS), có chỗ giữ chỗ /*CSS*/
├─ base.css              # CSS dùng chung
└─ build.py              # Ghép hai file trên thành site/index.html
tests/hub.test.js        # Kiểm thử giao diện bằng jsdom
examples/python-reference/   # Mã Python mẫu (Tuần 3) dùng để đối chiếu và chạy thử
```

## Làm việc

- Sửa `build/index.tpl.html` hoặc `build/base.css`, rồi `python3 build/build.py`. Không sửa tay `site/index.html`.
- Kiểm thử: `npm install` một lần, sau đó `npm test`.
- `site/index.html` đọc dữ liệu Tuần 1 từ `localStorage` khóa `app_producer_advanced_week1_v2` (chỉ đọc), nên hai file phải cùng một nguồn (cùng origin).
- Mã mẫu Python dùng PyQt6: `pyuic6 login.ui -o ui_login.py` (hoặc `python -m PyQt6.uic.pyuic`). Chạy thử `t_main.py` cần `pip install PyQt6`.

## Giới hạn đã biết

- Hai nút trong `week1.html` (xuất PDF bằng `window.print`, tải `.html`) có thể bị chặn khi mở trong khung của claude.ai. Nút sao chép vẫn dùng được.
- Mật khẩu trong `auth.py` mẫu băm SHA-256 không muối: chỉ đủ cho bài học.
- Tiêu chí tự chấm (15/25/35/15/10) và phân bổ 5 phút thuyết trình là bản nháp, giáo viên quyết định.

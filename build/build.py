"""Ghép build/index.tpl.html + build/base.css thành site/index.html.

Chạy từ thư mục gốc dự án:  python build/build.py
site/week1.html là trang Tuần 1 do giáo viên chốt, KHÔNG sửa và không build lại.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
tpl = (ROOT / "build" / "index.tpl.html").read_text(encoding="utf-8")
css = (ROOT / "build" / "base.css").read_text(encoding="utf-8")
assert "/*CSS*/" in tpl, "Thiếu chỗ giữ chỗ /*CSS*/ trong index.tpl.html"
out = ROOT / "site" / "index.html"
out.write_text(tpl.replace("/*CSS*/", css, 1), encoding="utf-8")
print(f"Đã ghi {out.relative_to(ROOT)} ({out.stat().st_size} byte)")

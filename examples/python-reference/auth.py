import hashlib
import json
import os

DATA_FILE = "users.json"


def hash_password(password):
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


class User:
    def __init__(self, username, password_hash):
        self.username = username
        self.password_hash = password_hash

    def to_dict(self):
        return {"username": self.username, "password_hash": self.password_hash}


class AuthService:
    def __init__(self, path=DATA_FILE):
        self.path = path
        self.users = []  # danh sách các đối tượng User
        self.load()

    def load(self):
        if not os.path.exists(self.path):
            return
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    self.users.append(User(item["username"], item["password_hash"]))
        except (ValueError, KeyError):
            self.users = []  # file hỏng: bắt đầu lại với danh sách rỗng

    def save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump([u.to_dict() for u in self.users], f, ensure_ascii=False, indent=2)

    def find(self, username):
        for user in self.users:
            if user.username == username:
                return user
        return None

    def register(self, username, password, confirm):
        """Trả về (thành công, thông báo)."""
        username = username.strip()
        if not (3 <= len(username) <= 20 and username.isalnum()):
            return False, "Tên đăng nhập gồm 3-20 ký tự, chỉ chữ hoặc số"
        if len(password) < 6:
            return False, "Mật khẩu tối thiểu 6 ký tự"
        if password != confirm:
            return False, "Mật khẩu nhập lại không khớp"
        if self.find(username) is not None:
            return False, "Tên đăng nhập đã tồn tại"
        self.users.append(User(username, hash_password(password)))
        self.save()
        return True, "Đăng ký thành công"

    def login(self, username, password):
        """Trả về True nếu đúng tên đăng nhập và mật khẩu."""
        user = self.find(username.strip())
        return user is not None and user.password_hash == hash_password(password)
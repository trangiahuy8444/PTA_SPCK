import sys

from PyQt6.QtWidgets import QApplication, QMainWindow, QMessageBox

from auth import AuthService
from ui_home import Ui_MainWindow as Ui_Home
from ui_login import Ui_MainWindow as Ui_Login
from ui_register import Ui_MainWindow as Ui_Register


class HomeWindow(QMainWindow):
    def __init__(self, login_window, username):
        super().__init__()
        self.ui = Ui_Home()
        self.ui.setupUi(self)
        self.login_window = login_window
        self.ui.lblWelcome.setText(f"Xin chào, {username}!")
        self.ui.btnLogout.clicked.connect(self.handle_logout)

    def handle_logout(self):
        self.login_window.ui.txtLoginPass.clear()
        self.login_window.show()
        self.close()


class RegisterWindow(QMainWindow):
    def __init__(self, login_window, auth):
        super().__init__()
        self.ui = Ui_Register()
        self.ui.setupUi(self)
        self.login_window = login_window
        self.auth = auth
        self.ui.btnRegister.clicked.connect(self.handle_register)
        self.ui.btnToLogin.clicked.connect(self.back_to_login)

    def handle_register(self):
        ok, message = self.auth.register(
            self.ui.txtRegUser.text(),
            self.ui.txtRegPass.text(),
            self.ui.txtRegConfirm.text(),
        )
        if ok:
            QMessageBox.information(self, "Đăng ký", message)
            self.back_to_login()
        else:
            QMessageBox.warning(self, "Đăng ký", message)

    def back_to_login(self):
        self.login_window.show()
        self.close()


class LoginWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.ui = Ui_Login()
        self.ui.setupUi(self)
        self.auth = AuthService()
        self.register_window = None
        self.home_window = None
        self.ui.btnLogin.clicked.connect(self.handle_login)
        self.ui.btnToRegister.clicked.connect(self.open_register)

    def open_register(self):
        self.register_window = RegisterWindow(self, self.auth)
        self.register_window.show()
        self.hide()

    def handle_login(self):
        username = self.ui.txtLoginUser.text().strip()
        if self.auth.login(username, self.ui.txtLoginPass.text()):
            self.home_window = HomeWindow(self, username)
            self.home_window.show()
            self.hide()
        else:
            QMessageBox.warning(self, "Đăng nhập", "Sai tên đăng nhập hoặc mật khẩu")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = LoginWindow()
    window.show()
    sys.exit(app.exec())

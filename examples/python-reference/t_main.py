import os, sys
os.environ["QT_QPA_PLATFORM"] = "offscreen"
from PyQt6.QtWidgets import QApplication, QMessageBox
shown = []
QMessageBox.warning = staticmethod(lambda p, t, m: shown.append(("warn", m)))
QMessageBox.information = staticmethod(lambda p, t, m: shown.append(("info", m)))
import main
app = QApplication(sys.argv)
w = main.LoginWindow(); w.auth.path = "t_users.json"; w.show()
vis = lambda: [x.__class__.__name__ for x in (w, w.register_window, w.home_window) if x is not None and x.isVisible()]
print("1 start visible:", vis())
w.ui.btnToRegister.click(); print("2 after Register click:", vis())
r = w.register_window
r.ui.txtRegUser.setText("ab"); r.ui.txtRegPass.setText("123456"); r.ui.txtRegConfirm.setText("123456"); r.ui.btnRegister.click()
print("3 bad name ->", shown[-1], vis())
r.ui.txtRegUser.setText("minh"); r.ui.btnRegister.click()
print("4 good register ->", shown[-1], vis())
w.ui.txtLoginUser.setText("minh"); w.ui.txtLoginPass.setText("sai"); w.ui.btnLogin.click()
print("5 wrong pw ->", shown[-1], vis())
w.ui.txtLoginPass.setText("123456"); w.ui.btnLogin.click()
print("6 right pw ->", vis(), "| welcome:", w.home_window.ui.lblWelcome.text())
w.home_window.ui.btnLogout.click()
print("7 logout ->", vis(), "| pw cleared:", repr(w.ui.txtLoginPass.text()))
print("users saved:", open("t_users.json").read().count("minh"))

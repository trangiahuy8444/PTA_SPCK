// Kiểm thử giao diện hub, hàm thuần và Apps Script v3 bằng jsdom + vm.  Chạy: npm test
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'site', 'index.html'), 'utf8');

// 0. Kiểm tra bảo mật & Google Apps Script (apps-script/Code.gs) bất biến + không trả link Drive cho HS
const gsCode = fs.readFileSync(path.join(ROOT, 'apps-script', 'Code.gs'), 'utf8');
const gsCtx = vm.createContext({
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: (k) => (k === 'TEACHER_KEY' ? 'GV-TEST-1234' : '') })
  }
});
vm.runInContext(gsCode, gsCtx);
assert.ok(!gsCode.includes('.setContent('), 'Code.gs không dùng setContent để ghi đè file');
assert.ok(gsCode.includes('function normalizeStudentName_'), 'Code.gs có hàm chuẩn hóa tên không dấu viết thường');
assert.ok(!/^\s*(folderUrl|viewUrl)\s*:/m.test(gsCode), 'Code.gs không trả về folderUrl/viewUrl cho trình duyệt HS');
assert.ok(gsCode.includes('var initState = { f: { studentName: info.studentName } };'), 'Code.gs luôn tạo hồ sơ mới trống sạch');
['setupProject', 'doGet', 'doPost', 'handleLoadStudent_', 'handleLoadVersion_', 'handleSaveVersion_', 'handleSubmitWeek_', 'handleGetFile_', 'handleListStudents_', 'handleTeacherOverview_', 'handleTeacherSaveReport_', 'capNhatBaoCaoPhuHuynh', 'evaluateWeekProgress_', 'formatParentReport_'].forEach((fn) => {
  assert.ok(gsCode.includes('function ' + fn), 'Code.gs có hàm ' + fn);
});
assert.throws(() => gsCtx.requireTeacherKey_({ teacherKey: 'SAI' }), /không đúng/i, 'Code.gs chặn sai TEACHER_KEY');
assert.strictEqual(gsCtx.requireTeacherKey_({ teacherKey: 'GV-TEST-1234' }), true, 'Code.gs cho phép đúng TEACHER_KEY');

const evalBehind = gsCtx.evaluateWeekProgress_('tuan-2', { c: { w2a1: true, w2a2: true } }, {}, '');
assert.strictEqual(evalBehind.done, 1);
assert.strictEqual(evalBehind.onTrack, false);
const repBehind = gsCtx.formatParentReport_({
  displayName: 'Trần Gia Huy',
  courseWeek: 10,
  webWeek: 'tuan-2',
  onTrack: evalBehind.onTrack,
  missing: evalBehind.missing
});
assert.ok(repBehind.startsWith('Trần Gia Huy\nMục tiêu của tuần 10 (Tuần 2 trên web (Lab11)):'), 'Mẫu báo cáo đúng định dạng đầu');
assert.ok(repBehind.includes('Tiến độ hiện tại: Chưa đúng tiến độ.') && repBehind.includes('Những nhiệm vụ chưa hoàn thành:\n- '), 'Mẫu báo cáo có đúng phần Chưa đúng tiến độ & danh sách thiếu');

const evalDone = gsCtx.evaluateWeekProgress_('tuan-2', { c: { w2a1: true, w2a2: true, w2a3: true, w2a4: true, w2s1: true, w2s2: true, w2d1: true, w2d2: true, w2d3: true } }, {}, 'v003');
assert.strictEqual(evalDone.onTrack, true);
const repDone = gsCtx.formatParentReport_({
  displayName: 'Nguyễn Minh Khang',
  courseWeek: 10,
  webWeek: 'tuan-2',
  onTrack: evalDone.onTrack,
  missing: evalDone.missing
});
assert.ok(repDone.includes('Tiến độ hiện tại: Đúng tiến độ.') && repDone.includes('- Không có'), 'Mẫu báo cáo khi đạt đủ yêu cầu');

assert.ok(!html.includes('Mở Drive') && !html.includes('Mở thư mục Drive'), 'Không hiển thị link Drive trên giao diện học sinh');
assert.ok(!html.includes('gv.html') && !html.includes('teacher_overview') && !/GV-[A-F0-9]{8}/.test(html), 'Trang học sinh không chứa đường dẫn hay mã giáo viên');
assert.ok(!html.includes('window.scrollTo({ top: 0 })'), 'Không ép cuộn lên top: 0 khi bấm tab/nút');

// 1. Unit tests cho khối hàm /*PURE*/ ... /*ENDPURE*/
const pureMatch = html.match(/\/\*PURE\*\/([\s\S]*?)\/\*ENDPURE\*\//);
assert.ok(pureMatch, 'Tìm thấy khối /*PURE*/ trong site/index.html');
const pureCode = pureMatch[1]
  .replace(/\bconst\s+/g, 'var ')
  .replace(/\blet\s+/g, 'var ');
const ctx = vm.createContext({ URL, encodeURIComponent, decodeURIComponent });
vm.runInContext(pureCode, ctx);

// Kiểm tra validateName & nameIssues
assert.strictEqual(ctx.validateName('QLineEdit', 'txtLoginUser'), '');
assert.notStrictEqual(ctx.validateName('QLineEdit', 'LoginUser'), '');
assert.notStrictEqual(ctx.validateName('QLineEdit', 'txtlogin'), '');
assert.notStrictEqual(ctx.validateName('QLineEdit', ''), '');

ctx.S = ctx.def();
assert.deepStrictEqual(Object.values(ctx.nameIssues()).filter(Boolean), [], 'Tên mặc định không có lỗi');
ctx.S.names.loginPass = 'txtLoginUser';
assert.strictEqual(ctx.nameIssues().loginPass, 'Trùng tên trong cùng một form');
ctx.S = ctx.def();
ctx.S.names.regUser = 'txtLoginUser';
assert.strictEqual(ctx.nameIssues().regUser, '');

// Kiểm tra btnTextColor & buildQss
assert.strictEqual(ctx.btnTextColor('#FACC15'), '#111827', 'Nền vàng sáng dùng chữ tối');
assert.strictEqual(ctx.btnTextColor('#4F46E5'), '#FFFFFF', 'Nền chàm đậm dùng chữ trắng');
ctx.S = ctx.def();
ctx.S.f.pal_p = '#FACC15';
const qss = ctx.buildQss();
assert.ok(qss.includes('QMainWindow, QWidget#centralwidget'), 'QSS giới hạn vào #centralwidget');
assert.ok(!/QMainWindow,\s*QWidget\s*\{/.test(qss), 'Không còn selector QWidget quá rộng');
assert.ok(qss.includes('QFrame#frmCard'), 'Có style cho QFrame#frmCard');
assert.ok(qss.includes('color: #111827'), 'Nút màu sáng dùng chữ tối');

// Kiểm tra buildMainPy & buildAuthPy khớp examples/python-reference
ctx.S = ctx.def();
const refMain = fs.readFileSync(path.join(ROOT, 'examples', 'python-reference', 'main.py'), 'utf8').replace(/\r\n/g, '\n');
const refAuthFile = fs.readFileSync(path.join(ROOT, 'examples', 'python-reference', 'auth.py'), 'utf8').replace(/\r\n/g, '\n');
const refAuthMem = fs.readFileSync(path.join(ROOT, 'examples', 'python-reference', 'auth_mem.py'), 'utf8').replace(/\r\n/g, '\n');
assert.strictEqual(ctx.buildMainPy().trim(), refMain.trim(), 'buildMainPy mặc định khớp examples/main.py');
assert.strictEqual(ctx.buildAuthPy().trim(), refAuthFile.trim(), 'buildAuthPy (file) khớp examples/auth.py');
ctx.S.f.storage = 'mem';
assert.strictEqual(ctx.buildAuthPy().trim(), refAuthMem.trim(), 'buildAuthPy (mem) khớp examples/auth_mem.py');

ctx.S = ctx.def();
ctx.S.names.btnLogin = '';
const guardedMain = ctx.buildMainPy();
assert.ok(guardedMain.includes('__DAT_LAI_TEN_btnLogin__'), 'Tên rỗng sinh placeholder an toàn');
assert.ok(!guardedMain.includes('self.ui..clicked'), 'Không sinh cú pháp lỗi self.ui..');

// Phase 2 pure
ctx.S = ctx.def();
ctx.S.f.appName = 'StudyFlow';
ctx.S.f.custName = 'Pomodoro';
assert.ok(ctx.buildWeekAiPrompt(2).includes('StudyFlow') && ctx.buildWeekAiPrompt(2).includes('pyrcc6'));
assert.ok(ctx.buildWeekAiPrompt(3).includes('txtLoginUser'));
assert.ok(ctx.buildWeekAiPrompt(4).includes('Pomodoro'));

// QSS theo từng thành phần + code mẫu PTA (uic.loadUi) + AI Debugger
assert.ok(ctx.buildQssSnippet('sidebar').includes('QFrame#sidebar_frame') && ctx.buildQssSnippet('sidebar').includes('border: none;'));
assert.ok(ctx.buildQssSnippet('card').includes('QLabel') && ctx.buildQssSnippet('card').includes('border: none;'));
assert.ok(ctx.buildQssSnippet('category').includes('QToolButton'));
assert.ok(ctx.buildPtaReviewPy().includes('uic.loadUi("gui/login.ui", self)') && ctx.buildPtaReviewPy().includes('uic.loadUi("gui/dashboard.ui", self)'));
ctx.S = ctx.def();
assert.ok(ctx.buildMainUicPy().includes('uic.loadUi') && ctx.buildMainUicPy().includes('self.txtLoginUser'));
ctx.S.names.btnLogin = '';
assert.ok(ctx.buildMainUicPy().includes('__DAT_LAI_TEN_btnLogin__'), 'buildMainUicPy giữ placeholder an toàn khi tên rỗng');
ctx.S = ctx.def();
ctx.S.f.errTrace = "AttributeError: 'Login' object has no attribute 'btn_login'";
ctx.S.f.errCode = 'self.btn_login.clicked.connect(self.check_login)';
const aiW3 = ctx.buildWeekAiPrompt(3);
assert.ok(aiW3.includes("has no attribute 'btn_login'") && aiW3.includes('self.btn_login.clicked.connect'), 'Prompt AI Tuần 3 nhúng lỗi và code');

// Phase 3 pure (chuẩn hóa tên viết thường không dấu + formatBytes + buildSubmitPayload)
assert.strictEqual(ctx.DEFAULT_CLOUD_API, 'https://script.google.com/macros/s/AKfycbwTyXdfIQLlGBccyg5gJf06rHKNM-l3CwxnpT3FRZJLY6B28DNzWY6TFHtSUI8rbsy4KA/exec');
assert.strictEqual(ctx.normalizeStudentName('  Nguyễn  Minh Khang '), 'nguyen minh khang');
assert.strictEqual(ctx.normalizeStudentName('NGUYEN MINH KHANG'), 'nguyen minh khang');
assert.strictEqual(ctx.normalizeStudentName('Đặng Ánh Dương'), 'dang anh duong');
assert.strictEqual(ctx.studentKeyFromName('Nguyễn Minh Khang'), 'nguyen-minh-khang');
assert.strictEqual(ctx.studentKeyFromName('Đặng Ánh Dương'), 'dang-anh-duong');
assert.ok(ctx.validateStudentName('A').length > 0);
assert.strictEqual(ctx.validateStudentName('Nguyễn Minh Khang'), '');
assert.strictEqual(ctx.formatBytes(512), '512 B');
assert.strictEqual(ctx.formatBytes(2048), '2.0 KB');

ctx.S.f.aiAsk2 = 'Hỏi QSS';
const payload = ctx.buildSubmitPayload('tuan-2', { studentName: 'Nguyễn Minh Khang', files: [] });
assert.strictEqual(payload.action, 'submit_week');
assert.strictEqual(payload.studentName, 'nguyen minh khang');
assert.ok(payload.aiLog.includes('Hỏi QSS'));

// Kiểm tra simRegister
assert.strictEqual(ctx.simRegister('ab', '123456', '123456', false).ok, false);
assert.strictEqual(ctx.simRegister('minh', '12345', '12345', false).ok, false);
assert.strictEqual(ctx.simRegister('minh', '123456', '654321', false).ok, false);
assert.strictEqual(ctx.simRegister('minh', '123456', '123456', true).ok, false);
assert.strictEqual(ctx.simRegister('minh', '123456', '123456', false).ok, true);

// Kiểm tra migrateLegacyW1
const migState = ctx.def();
const migrated = ctx.migrateLegacyW1(migState, JSON.stringify({
  studentName: 'An',
  appName: 'AppCu',
  colorPrimary: '#10B981',
  colorBg: '#ECFDF5',
  colorText: '#064E3B',
  aiForm: { hexPrimary: '#5B7CFA', login: 'txtLoginUser', widgets: ['QLineEdit'] },
  checkboxes: [true, false, true, false, false]
}));
assert.strictEqual(migrated, true);
assert.strictEqual(migState.f.pal_p, '#10B981', 'Ưu tiên màu Bước 2 colorPrimary');
assert.strictEqual(migState.f.specLogin, 'txtLoginUser');
assert.strictEqual(migState.c.w1c1, true);
assert.strictEqual(migState.c.w1c2, false);

// 2. Kiểm thử DOM & Tương tác bằng jsdom (pre-seed phiên bản & file mẫu để kiểm tra hiển thị)
const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { if (!/scrollTo/.test(String(e.message))) errs.push(String(e.message)); });
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://example.test/index.html',
  virtualConsole: vc,
  pretendToBeVisual: true,
  beforeParse(win) {
    win.localStorage.setItem('apa-hub-4-tuan-v1', JSON.stringify({
      f: { studentName: 'Nguyễn Minh Khang' },
      versions: [{ id: 'ver1', fileName: 'v001_nhap.json', version: 'v001', tag: 'nhap', savedAt: '2026-11-28 16:50:00' }],
      filesByWeek: {
        'tuan-1': [{ id: 'file1', version: 'v001', name: 'uizard_login.jpg', size: 2048, uploadedAt: '2026-11-28 16:50:00' }],
        'tuan-2': [], 'tuan-3': [], 'tuan-4': []
      }
    }));
  }
});
const w = dom.window, d = w.document;

setTimeout(async () => {
  const navs = [...d.querySelectorAll('.navbtn')].map((b) => b.dataset.go);
  assert.deepStrictEqual(navs, ['tuan-1', 'tuan-2', 'tuan-3', 'tuan-4', 'ho-so'], 'đã bỏ tab giáo viên');
  assert.strictEqual(d.getElementById('p-giao-vien'), null, 'không còn panel giáo viên');
  assert.deepStrictEqual([...d.querySelectorAll('.panel.active')].map((p) => p.dataset.slug), ['tuan-1'], 'trang mặc định');
  assert.strictEqual(d.querySelectorAll('#p-tuan-1 iframe').length, 0, 'không còn iframe ở Tuần 1');

  // Không trùng ID trong toàn bộ DOM
  const ids = [...d.querySelectorAll('[id]')].map((el) => el.id);
  const dupIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  assert.deepStrictEqual(dupIds, [], 'không có ID trùng lặp trong DOM');

  ['studentName', 'studentClass', 'appName', 'appDesc', 'pal_p', 'pal_b', 'pal_t'].forEach((k) => assert.ok(d.getElementById('f_' + k), 'thiếu ô ' + k));
  assert.ok(d.querySelector('#p-tuan-1 #resetAll'), 'nút xóa dữ liệu nằm ở Tuần 1');

  // Cloud Bar chỉ có tên học sinh; nút Lưu phiên bản mới và trạng thái nằm trên topbar + cuối các subtab
  ['cloudStudentName', 'btnCloudLoad', 'btnCloudSave', 'saveStatePill'].forEach((id) => {
    assert.ok(d.getElementById(id), 'thiếu phần tử #' + id);
  });
  assert.ok(d.querySelector('header.topbar #btnCloudSave'), '#btnCloudSave nằm trên sticky topbar');
  assert.ok(d.querySelector('header.topbar #saveStatePill'), '#saveStatePill nằm trên sticky topbar');
  assert.strictEqual(d.querySelector('#cloudBar #btnCloudSave'), null, 'đã đưa #btnCloudSave ra khỏi #cloudBar');
  assert.ok(d.querySelectorAll('.btnrow [data-save-version="1"]').length >= 10, 'cuối các subtab và Hồ sơ có nút Lưu phiên bản mới');
  assert.strictEqual(d.getElementById('btnCloudSave').classList.contains('dirty'), false, 'ban đầu chưa có thay đổi chưa lưu');
  ['cloudPin', 'cloudClass', 'tApiUrl', 'tKey'].forEach((id) => {
    assert.strictEqual(d.getElementById(id), null, 'đã bỏ phần tử #' + id);
  });
  ['tuan-1', 'tuan-2', 'tuan-3', 'tuan-4'].forEach((tg) => {
    assert.ok(d.querySelector(`[data-submit-target="${tg}"]`), 'thiếu nút nộp Drive cho ' + tg);
    assert.ok(d.querySelector(`[data-outhtml="files_${tg}"]`), 'thiếu danh sách file cho ' + tg);
  });

  // Đồng bộ tên giữa #cloudStudentName và #f_studentName + render files/versions
  const cs = d.getElementById('cloudStudentName');
  cs.value = 'Nguyễn Minh Khang'; cs.dispatchEvent(new w.Event('input'));
  assert.strictEqual(d.getElementById('f_studentName').value, 'Nguyễn Minh Khang', 'tên đồng bộ sang form Tuần 1');
  assert.ok(d.querySelector('[data-outhtml="allFiles"]'), 'Hồ sơ có kho file');
  assert.ok(d.querySelector('[data-outhtml="versionHistory"]'), 'Hồ sơ có lịch sử phiên bản');
  assert.ok(d.querySelector('[data-outhtml="files_tuan-1"] [data-open-file="file1"]'), 'Hiển thị nút Tải về file Tuần 1');
  assert.strictEqual(d.querySelector('[data-outhtml="files_tuan-1"] [data-open-file="file1"]').textContent.trim(), 'Tải về', 'Nút file ghi Tải về');
  assert.ok(d.querySelector('[data-outhtml="allFiles"] [data-open-file="file1"]'), 'Hiển thị file trong Hồ sơ');
  assert.ok(d.querySelector('[data-outhtml="versionHistory"] [data-load-ver="ver1"]'), 'Hiển thị nút Xem phiên bản cũ');

  // Phase 2 DOM checks
  assert.ok(d.getElementById('p-tuan-2').innerHTML.includes('lucide.dev'), 'Tuần 2 có Lucide');
  assert.ok(d.getElementById('p-tuan-2').innerHTML.includes('undraw.co'), 'Tuần 2 có unDraw');
  assert.ok(d.getElementById('p-tuan-2').innerHTML.includes('pyrcc6'), 'Tuần 2 có cảnh báo pyrcc6');
  assert.ok(!d.getElementById('p-tuan-2').innerHTML.includes('Code mẫu nạp icon'), 'Đã bỏ mục code nạp icon/ảnh trong PyQt6');
  assert.strictEqual(d.querySelector('[data-out="assetsPy"]'), null, 'Không còn khối code assetsPy');
  assert.ok(d.getElementById('p-tuan-3').innerHTML.includes('AttributeError'), 'Tuần 3 có bảng Debug 5 lỗi');
  d.querySelector('[data-mini-tab="pomodoro"]').click();
  assert.ok(d.querySelector('[data-out="miniCode"]').textContent.includes('QTimer'), 'Chuyển mẫu mini Pomodoro hiện QTimer');
  d.querySelector('[data-mini-tab="flashcard"]').click();
  assert.ok(d.querySelector('[data-out="miniCode"]').textContent.includes('CARDS'), 'Chuyển mẫu mini Flashcard');

  [1, 2, 3, 4].forEach((wk) => {
    assert.ok(d.getElementById('f_aiAsk' + wk), 'thiếu Nhật ký AI tuần ' + wk);
  });

  // Mọi nút tải về đều hiển thị (không bị hidden)
  const dlBtns = [...d.querySelectorAll('[data-dl]')];
  assert.ok(dlBtns.length >= 6, 'có đủ các nút tải về');
  dlBtns.forEach((b) => assert.strictEqual(b.hidden, false, 'nút tải về không bị ẩn: ' + b.dataset.dl));

  // StudyFlow -> chuẩn 3 Main Window
  d.getElementById('fillStudyFlow').click();
  assert.strictEqual(d.getElementById('f_appName').value, 'StudyFlow');
  assert.ok(d.getElementById('f_specLogin').value.includes('txtLoginUser'), 'StudyFlow dùng txtLoginUser');
  assert.ok(!d.getElementById('f_specLogin').value.includes('QStackedWidget'), 'không còn QStackedWidget');
  assert.ok(d.querySelector('[data-outhtml="w1specs"]').textContent.includes('btnToRegister'), 'Tuần 2 nhận đặc tả từ Tuần 1');

  // Chuyển trang qua lại
  navs.forEach((s) => {
    d.querySelector(`.navbtn[data-go="${s}"]`).click();
    assert.deepStrictEqual([...d.querySelectorAll('.panel.active')].map((p) => p.dataset.slug), [s], 'chuyển trang ' + s);
  });
  assert.strictEqual(d.querySelector('[data-sub="tuan-2:a"] .btnrow [data-go]').dataset.go, 'tuan-1');

  const c = d.getElementById('f_studentClass'); c.value = '8A1'; c.dispatchEvent(new w.Event('input'));
  assert.ok(/8A1/.test(d.querySelector('[data-out="dossier"]').textContent), 'lớp đi vào hồ sơ');
  assert.ok(d.getElementById('btnCloudSave').classList.contains('dirty'), 'nút Lưu phiên bản mới đổi trạng thái nhắc lưu khi có chỉnh sửa');
  assert.ok(/chưa lưu/i.test(d.getElementById('saveStatePill').textContent), 'nhãn trạng thái báo có thay đổi chưa lưu');

  // Kiểm tra hành vi cuộn trang: bấm subtab / chip / nút không cuộn lên đầu trang; nút ở đáy .btnrow chỉ cuộn về mép panel nếu đã cuộn sâu
  const scrollCalls = [];
  w.scrollTo = (...args) => scrollCalls.push(args);
  d.querySelector('.navbtn[data-go="tuan-1"]').click();
  scrollCalls.length = 0;
  d.querySelector('.subtabs [data-tab="tuan-1:b"]').click();
  const firstChip = d.querySelector('[data-pal]');
  if (firstChip) firstChip.click();
  d.querySelector('[data-spec-tab="register"]').click();
  assert.strictEqual(scrollCalls.length, 0, 'bấm subtab trên .subtabs hoặc nút tương tác không cuộn trang');

  const p2 = d.getElementById('p-tuan-2');
  const tb = d.querySelector('.topbar');
  tb.getBoundingClientRect = () => ({ top: 0, height: 68 });
  p2.getBoundingClientRect = () => ({ top: 120, height: 400 });
  d.querySelector('.navbtn[data-go="tuan-2"]').click();
  assert.strictEqual(scrollCalls.length, 0, 'chuyển tuần khi đầu panel đang nhìn thấy không cuộn trang');

  Object.defineProperty(w, 'scrollY', { value: 700, configurable: true });
  p2.getBoundingClientRect = () => ({ top: -400, height: 800 });
  d.querySelector('.btnrow [data-tab="tuan-2:b"]').click();
  assert.strictEqual(scrollCalls.length, 1, 'bấm nút bước tiếp ở đáy .btnrow khi đã cuộn sâu sẽ cuộn về đầu panel');
  assert.strictEqual(scrollCalls[0][0].top, 220, 'cuộn về đúng mép trên panel dưới sticky topbar (không phải 0)');

  // Kiểm tra thư viện QSS theo khối (Tuần 2), ôn bài PTA + chuyển chế độ main.py (Tuần 3), và AI Debugger
  scrollCalls.length = 0;
  d.querySelector('[data-qss-tab="card"]').click();
  assert.ok(d.querySelector('[data-out="qssSnippet"]').textContent.includes('QFrame:hover'), 'Chuyển mẫu QSS sang Card');
  assert.ok(d.querySelector('[data-out="ptaReviewPy"]').textContent.includes('uic.loadUi("gui/login.ui", self)'), 'Tuần 3 có code ôn bài PTA uic.loadUi');
  assert.ok(d.querySelector('[data-out="mainPyActive"]').textContent.includes('uic.loadUi'), 'Mặc định main.py hiển thị cách 1 (uic.loadUi)');
  d.querySelector('[data-main-mode="pyuic"]').click();
  assert.ok(d.querySelector('[data-out="mainPyActive"]').textContent.includes('Ui_Login'), 'Chuyển main.py sang cách 2 (pyuic6)');
  d.querySelector('[data-main-mode="uic"]').click();
  assert.ok(d.querySelector('[data-out="mainPyActive"]').textContent.includes('uic.loadUi'), 'Chuyển lại main.py sang cách 1 (uic.loadUi)');
  assert.strictEqual(scrollCalls.length, 0, 'Bấm tab QSS / chế độ main.py không cuộn trang');
  const et = d.getElementById('f_errTrace');
  et.value = 'FileNotFoundError: gui/login.ui';
  et.dispatchEvent(new w.Event('input'));
  assert.ok(d.querySelector('[data-out="aiPromptW3"]').textContent.includes('FileNotFoundError: gui/login.ui'), 'Prompt AI Tuần 3 cập nhật theo lỗi vừa dán');

  // Regression test: đang mở hồ sơ cũ (StudyFlow + tick w2d1), gõ tên học sinh mới rồi bấm Mở / Tạo hồ sơ -> phải sạch hoàn toàn
  const w2d1 = d.querySelector('[data-c="w2d1"]');
  w2d1.checked = true;
  w2d1.dispatchEvent(new w.Event('change'));
  cs.value = 'tran gia huy 2';
  cs.dispatchEvent(new w.Event('input'));
  let sentLoadPayload = null;
  w.fetch = async (url, init) => {
    const req = JSON.parse((init && init.body) || '{}');
    if (req.action === 'load_student') {
      sentLoadPayload = req;
      return {
        text: async () => JSON.stringify({
          ok: true,
          created: true,
          studentKey: 'tran-gia-huy-2',
          studentName: 'tran gia huy 2',
          latestVersion: 'v001',
          updatedAt: '2026-11-28 17:20:00',
          state: { f: { studentName: 'tran gia huy 2' } },
          versions: [{ id: 'ver_new', fileName: 'v001_khoi-tao.json', version: 'v001', tag: 'khoi-tao', savedAt: '2026-11-28 17:20:00' }],
          filesByWeek: { 'tuan-1': [], 'tuan-2': [], 'tuan-3': [], 'tuan-4': [] }
        })
      };
    }
    return { text: async () => JSON.stringify({ ok: true, students: ['nguyen minh khang', 'tran gia huy 2'] }) };
  };
  d.getElementById('btnCloudLoad').click();
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(sentLoadPayload && sentLoadPayload.action === 'load_student', 'Đã gửi yêu cầu load_student');
  assert.deepStrictEqual(sentLoadPayload.initialState, { f: { studentName: 'tran gia huy 2' } }, 'initialState gửi lên chỉ chứa studentName mới, không mang dữ liệu hồ sơ cũ');
  assert.strictEqual(d.getElementById('f_appName').value, '', 'Tạo hồ sơ mới xóa sạch appName của học sinh trước');
  assert.strictEqual(d.getElementById('progressPct').textContent, '0%', 'Tạo hồ sơ mới có tiến độ 0%');
  assert.strictEqual(d.querySelector('[data-c="w2d1"]').checked, false, 'Tạo hồ sơ mới bỏ tick các checkbox cũ');
  assert.ok(d.querySelector('[data-outhtml="sub_tuan-2"]').textContent.includes('Chưa nộp mục tuan-2'), 'Hồ sơ mới chưa có bài nộp tuần 2');

  assert.deepStrictEqual(errs, [], 'lỗi script');

  // 3. Kiểm thử trang riêng Giáo viên (site/gv.html)
  const gvHtml = fs.readFileSync(path.join(ROOT, 'site', 'gv.html'), 'utf8');
  assert.ok(!/GV-[A-F0-9]{8}/.test(gvHtml), 'gv.html không chứa cứng TEACHER_KEY');
  const gvErrs = [];
  const gvVc = new VirtualConsole();
  gvVc.on('jsdomError', (e) => { if (!/scrollTo/.test(String(e.message))) gvErrs.push(String(e.message)); });
  const gvDom = new JSDOM(gvHtml, { runScripts: 'dangerously', url: 'https://example.test/gv.html', virtualConsole: gvVc, pretendToBeVisual: true });
  await new Promise((r) => setTimeout(r, 60));
  const gw = gvDom.window, gd = gw.document;
  const gvIds = [...gd.querySelectorAll('[id]')].map((el) => el.id);
  assert.deepStrictEqual(gvIds.filter((id, i) => gvIds.indexOf(id) !== i), [], 'gv.html không trùng ID');

  let savedTeacherReq = null;
  gw.fetch = async (url, init) => {
    const req = JSON.parse((init && init.body) || '{}');
    if (req.action === 'teacher_overview') {
      assert.strictEqual(req.teacherKey, 'GV-TEST-1234', 'Gửi đúng TEACHER_KEY khi đăng nhập giáo viên');
      return {
        text: async () => JSON.stringify({
          ok: true,
          courseWeek: 10,
          webWeek: 'tuan-2',
          weekSpecs: gsCtx.WEEK_SPECS,
          customGoals: gsCtx.WEEK_SPECS['tuan-2'].goals,
          sheetUrl: 'https://docs.google.com/spreadsheets/d/mock',
          reportFolderUrl: 'https://drive.google.com/drive/folders/mock',
          students: [{
            studentKey: 'tran-gia-huy',
            studentName: 'tran gia huy',
            displayName: 'Trần Gia Huy',
            appName: 'StudyFlow',
            latestVersion: 'v003',
            filesCount: 1,
            weekSubmitted: true,
            teacherDriveUrl: 'https://drive.google.com/drive/folders/st1',
            autoEval: {
              items: [
                { id: 't2_forms', label: 'Tạo đủ 3 form Main Window', done: true },
                { id: 't2_qss', label: 'Áp dụng StyleSheet (QSS)', done: false }
              ]
            },
            custom: {}
          }]
        })
      };
    }
    if (req.action === 'teacher_save_report') {
      savedTeacherReq = req;
      return {
        text: async () => JSON.stringify({
          ok: true,
          savedAt: '2026-11-28 18:30:00',
          savedCount: req.reports.length,
          onTrackCount: req.reports.filter((r) => r.onTrack).length,
          exportFileName: 'BaoCao_Tuan10_tuan-2_20261128_183000.txt',
          exportFileUrl: 'https://drive.google.com/file/d/export1'
        })
      };
    }
    throw new Error('Unexpected action ' + req.action);
  };

  gd.getElementById('gvKey').value = 'GV-TEST-1234';
  gd.getElementById('btnGvLogin').click();
  await new Promise((r) => setTimeout(r, 30));
  assert.strictEqual(gd.getElementById('gvApp').hidden, false, 'Đăng nhập xong mở giao diện giáo viên');
  const prevEl = gd.querySelector('[data-gv-card="tran-gia-huy"] [data-gv-preview]');
  assert.ok(prevEl.textContent.includes('Tiến độ hiện tại: Chưa đúng tiến độ.'), 'Ban đầu hiển thị Chưa đúng tiến độ');

  const taskCb = gd.querySelector('[data-gv-task="tran-gia-huy"][data-task-id="t2_qss"]');
  taskCb.checked = true;
  taskCb.dispatchEvent(new gw.Event('change', { bubbles: true }));
  assert.ok(prevEl.textContent.includes('Tiến độ hiện tại: Đúng tiến độ.'), 'Tick đủ nhiệm vụ chuyển sang Đúng tiến độ tức thì');

  const extraEl = gd.querySelector('[data-gv-extra="tran-gia-huy"]');
  extraEl.value = 'Cần bổ sung icon cho nút Home';
  extraEl.dispatchEvent(new gw.Event('input', { bubbles: true }));
  assert.ok(prevEl.textContent.includes('Chưa đúng tiến độ.') && prevEl.textContent.includes('- Cần bổ sung icon cho nút Home'), 'Thêm ghi chú tự cập nhật vào danh sách chưa hoàn thành');

  gd.getElementById('btnGvSaveAll').click();
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(savedTeacherReq && savedTeacherReq.exportToDrive === true, 'Bấm lưu cả lớp gửi yêu cầu xuất Drive');
  assert.strictEqual(savedTeacherReq.reports[0].displayName, 'Trần Gia Huy');
  assert.ok(gd.getElementById('gvExportNotice').textContent.includes('BaoCao_Tuan10_tuan-2_20261128_183000.txt'), 'Hiển thị link file báo cáo vừa tạo trên Drive');
  assert.deepStrictEqual(gvErrs, [], 'gv.html không lỗi script');
  gvDom.window.close();

  console.log('OK: student-only hub + immutable versioning tests');
  w.close(); process.exit(0);
}, 300);

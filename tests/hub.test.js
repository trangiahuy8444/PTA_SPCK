// Kiểm thử giao diện hub, hàm thuần và Apps Script v3 bằng jsdom + vm.  Chạy: npm test
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'site', 'index.html'), 'utf8');

// 0. Kiểm tra bảo mật & Google Apps Script (apps-script/Code.gs) bất biến (không ghi đè)
const gsCode = fs.readFileSync(path.join(ROOT, 'apps-script', 'Code.gs'), 'utf8');
new vm.Script(gsCode);
assert.ok(!gsCode.includes('.setContent('), 'Code.gs không dùng setContent để ghi đè file');
['setupProject', 'doGet', 'doPost', 'handleLoadStudent_', 'handleLoadVersion_', 'handleSaveVersion_', 'handleSubmitWeek_', 'handleGetFile_', 'handleListStudents_'].forEach((fn) => {
  assert.ok(gsCode.includes('function ' + fn), 'Code.gs có hàm ' + fn);
});

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
const assetsPy = ctx.buildAssetsPy();
assert.ok(assetsPy.includes('BASE_DIR') && assetsPy.includes('QIcon'), 'buildAssetsPy dùng đường dẫn tương đối BASE_DIR');
assert.ok(!assetsPy.includes('pyrcc6') && !assetsPy.includes('_rc'), 'buildAssetsPy không dùng pyrcc6');
ctx.S.f.appName = 'StudyFlow';
ctx.S.f.custName = 'Pomodoro';
assert.ok(ctx.buildWeekAiPrompt(2).includes('StudyFlow') && ctx.buildWeekAiPrompt(2).includes('pyrcc6'));
assert.ok(ctx.buildWeekAiPrompt(3).includes('txtLoginUser'));
assert.ok(ctx.buildWeekAiPrompt(4).includes('Pomodoro'));

// Phase 3 pure (tra cứu bằng tên học sinh + formatBytes + buildSubmitPayload)
assert.strictEqual(ctx.DEFAULT_CLOUD_API, 'https://script.google.com/macros/s/AKfycbwTyXdfIQLlGBccyg5gJf06rHKNM-l3CwxnpT3FRZJLY6B28DNzWY6TFHtSUI8rbsy4KA/exec');
assert.strictEqual(ctx.studentKeyFromName('Nguyễn Minh Khang'), 'nguyen-minh-khang');
assert.strictEqual(ctx.studentKeyFromName('Đặng Ánh Dương'), 'dang-anh-duong');
assert.ok(ctx.validateStudentName('A').length > 0);
assert.strictEqual(ctx.validateStudentName('Nguyễn Minh Khang'), '');
assert.strictEqual(ctx.formatBytes(512), '512 B');
assert.strictEqual(ctx.formatBytes(2048), '2.0 KB');

ctx.S.f.aiAsk2 = 'Hỏi QSS';
const payload = ctx.buildSubmitPayload('tuan-2', { studentName: 'Nguyễn Minh Khang', files: [] });
assert.strictEqual(payload.action, 'submit_week');
assert.strictEqual(payload.studentName, 'Nguyễn Minh Khang');
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

setTimeout(() => {
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

  // Cloud Bar chỉ có tên học sinh (không còn PIN, Mã lớp hay phần Giáo viên)
  ['cloudStudentName', 'btnCloudLoad', 'btnCloudSave'].forEach((id) => {
    assert.ok(d.getElementById(id), 'thiếu phần tử Cloud #' + id);
  });
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
  assert.ok(d.querySelector('[data-outhtml="files_tuan-1"] [data-open-file="file1"]'), 'Hiển thị nút Tải/Xem file Tuần 1');
  assert.ok(d.querySelector('[data-outhtml="allFiles"] [data-open-file="file1"]'), 'Hiển thị file trong Hồ sơ');
  assert.ok(d.querySelector('[data-outhtml="versionHistory"] [data-load-ver="ver1"]'), 'Hiển thị nút Xem phiên bản cũ');

  // Phase 2 DOM checks
  assert.ok(d.getElementById('p-tuan-2').innerHTML.includes('lucide.dev'), 'Tuần 2 có Lucide');
  assert.ok(d.getElementById('p-tuan-2').innerHTML.includes('undraw.co'), 'Tuần 2 có unDraw');
  assert.ok(d.getElementById('p-tuan-2').innerHTML.includes('pyrcc6'), 'Tuần 2 có cảnh báo pyrcc6');
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
  assert.deepStrictEqual(errs, [], 'lỗi script');
  console.log('OK: student-only hub + immutable versioning tests');
  w.close(); process.exit(0);
}, 300);

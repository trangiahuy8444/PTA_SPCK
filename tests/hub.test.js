// Kiểm thử giao diện hub, hàm thuần và Apps Script bằng jsdom + vm.  Chạy: npm test
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'site', 'index.html'), 'utf8');

// 0. Bảo mật & cú pháp Google Apps Script (apps-script/Code.gs)
assert.ok(!html.includes(['GV', 'A69B2C0F'].join('-')), 'Không lộ TEACHER_KEY vào mã web công khai');
const gsCode = fs.readFileSync(path.join(ROOT, 'apps-script', 'Code.gs'), 'utf8');
new vm.Script(gsCode);
['setupProject', 'doGet', 'doPost', 'handleLoadState_', 'handleSaveState_', 'handleSubmitWeek_', 'handleTeacherSync_'].forEach((fn) => {
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

// Phase 2 pure: buildAssetsPy & buildWeekAiPrompt
ctx.S = ctx.def();
const assetsPy = ctx.buildAssetsPy();
assert.ok(assetsPy.includes('BASE_DIR') && assetsPy.includes('QIcon'), 'buildAssetsPy dùng đường dẫn tương đối BASE_DIR');
assert.ok(!assetsPy.includes('pyrcc6') && !assetsPy.includes('_rc'), 'buildAssetsPy không dùng pyrcc6');
ctx.S.f.appName = 'StudyFlow';
ctx.S.f.custName = 'Pomodoro';
assert.ok(ctx.buildWeekAiPrompt(2).includes('StudyFlow') && ctx.buildWeekAiPrompt(2).includes('pyrcc6'));
assert.ok(ctx.buildWeekAiPrompt(3).includes('txtLoginUser'));
assert.ok(ctx.buildWeekAiPrompt(4).includes('Pomodoro'));

// Phase 3 pure: DEFAULT_CLOUD_API, hashPin, validateCloudIdentity, buildSubmitPayload, buildTeacherShareUrl
assert.strictEqual(ctx.DEFAULT_CLOUD_API, 'https://script.google.com/macros/s/AKfycbwTyXdfIQLlGBccyg5gJf06rHKNM-l3CwxnpT3FRZJLY6B28DNzWY6TFHtSUI8rbsy4KA/exec');
const h1 = ctx.hashPin('1234');
const h2 = ctx.hashPin('1234');
assert.strictEqual(h1, h2, 'hashPin deterministic');
assert.strictEqual(h1.length, 16, 'hashPin dài 16 ký tự hex');
assert.notStrictEqual(h1, '1234', 'hashPin không trả plaintext');
assert.ok(ctx.validateCloudIdentity('', 'khang', '1234').length > 0);
assert.ok(ctx.validateCloudIdentity('PTA01', 'khang', '12ab').length > 0);
assert.strictEqual(ctx.validateCloudIdentity('PTA01', 'khang', '1234'), '');

ctx.S.f.aiAsk2 = 'Hỏi QSS';
const payload = ctx.buildSubmitPayload('tuan-2', { classCode: 'pta01', studentId: 'khang', pinHash: h1, files: [] });
assert.strictEqual(payload.action, 'submit_week');
assert.strictEqual(payload.classCode, 'PTA01');
assert.strictEqual(payload.microCheck, '');
assert.ok(payload.aiLog.includes('Hỏi QSS'));
const shareUrl = ctx.buildTeacherShareUrl('https://trangiahuy8444.github.io/PTA_SPCK/#tuan-2', 'https://script.google.com/macros/s/abc/exec', 'pta01');
assert.strictEqual(shareUrl, 'https://trangiahuy8444.github.io/PTA_SPCK/?api=https%3A%2F%2Fscript.google.com%2Fmacros%2Fs%2Fabc%2Fexec&class=PTA01#tuan-1');

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

// Kiểm tra buildCsv & buildReport
ctx.S = ctx.def();
ctx.S.teacher.students = [{ id: 's1', name: 'Bình', project: 'StudyFlow', st: ['ok', 'help', '', ''] }];
ctx.S.teacher.sid = 's1';
ctx.S.teacher.n = 2;
assert.ok(ctx.buildCsv().includes('"Bình","StudyFlow","Đúng tiến độ","Cần hỗ trợ"'));
assert.ok(ctx.buildReport().includes('Học viên: Bình'));

// 2. Kiểm thử DOM & Tương tác bằng jsdom
const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { if (!/scrollTo/.test(String(e.message))) errs.push(String(e.message)); });
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/index.html', virtualConsole: vc, pretendToBeVisual: true });
const w = dom.window, d = w.document;

setTimeout(() => {
  const navs = [...d.querySelectorAll('.navbtn')].map((b) => b.dataset.go);
  assert.deepStrictEqual(navs, ['tuan-1', 'tuan-2', 'tuan-3', 'tuan-4', 'ho-so', 'giao-vien'], 'thanh bên');
  assert.deepStrictEqual([...d.querySelectorAll('.panel.active')].map((p) => p.dataset.slug), ['tuan-1'], 'trang mặc định');
  assert.strictEqual(d.querySelectorAll('#p-tuan-1 iframe').length, 0, 'không còn iframe ở Tuần 1');

  // Không trùng ID trong toàn bộ DOM
  const ids = [...d.querySelectorAll('[id]')].map((el) => el.id);
  const dupIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  assert.deepStrictEqual(dupIds, [], 'không có ID trùng lặp trong DOM');

  ['studentName', 'studentClass', 'appName', 'appDesc', 'pal_p', 'pal_b', 'pal_t'].forEach((k) => assert.ok(d.getElementById('f_' + k), 'thiếu ô ' + k));
  assert.ok(d.querySelector('#p-tuan-1 #resetAll'), 'nút xóa dữ liệu nằm ở Tuần 1');

  // Cloud Bar & Teacher Cloud UI + điền sẵn URL Apps Script
  ['cloudClass', 'cloudStudent', 'cloudPin', 'btnCloudLoad', 'btnCloudSave', 'tApiUrl', 'tKey', 'tCloudSync', 'tCopyClassLink'].forEach((id) => {
    assert.ok(d.getElementById(id), 'thiếu phần tử Cloud #' + id);
  });
  assert.strictEqual(d.getElementById('tApiUrl').value, ctx.DEFAULT_CLOUD_API, 'Điền sẵn Web App URL vào tab Giáo viên');
  ['tuan-1', 'tuan-2', 'tuan-3', 'tuan-4'].forEach((tg) => {
    assert.ok(d.querySelector(`[data-submit-target="${tg}"]`), 'thiếu nút nộp Drive cho ' + tg);
  });
  assert.strictEqual(d.querySelectorAll('[data-submit-target^="btvn-"]').length, 0, 'đã bỏ các khung nộp BTVN');

  // Phase 2 DOM checks: Kho Icon/Ảnh + pyrcc6 + Debug 5 + Mini templates + AI Log
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
  console.log('OK: hub + pure unit tests + apps-script syntax');
  w.close(); process.exit(0);
}, 300);

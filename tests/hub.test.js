// Kiểm thử giao diện hub bằng jsdom.  Chạy: npm test
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { if (!/scrollTo/.test(String(e.message))) errs.push(String(e.message)); });
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/index.html', virtualConsole: vc, pretendToBeVisual: true });
const w = dom.window, d = w.document;

setTimeout(() => {
  const navs = [...d.querySelectorAll('.navbtn')].map((b) => b.dataset.go);
  assert.deepStrictEqual(navs, ['tuan-1', 'tuan-2', 'tuan-3', 'tuan-4', 'ho-so', 'giao-vien'], 'thanh bên');
  assert.deepStrictEqual([...d.querySelectorAll('.panel.active')].map((p) => p.dataset.slug), ['tuan-1'], 'trang mặc định');
  assert.ok(!d.getElementById('p-tong-quan'), 'không còn tab Tổng quan');
  ['studentName', 'studentClass', 'appName', 'appDesc', 'pal_p', 'pal_b', 'pal_t'].forEach((k) => assert.ok(d.getElementById('f_' + k), 'thiếu ô ' + k));
  assert.ok(d.querySelector('#p-tuan-1 #resetAll'), 'nút xóa dữ liệu nằm ở Tuần 1');
  navs.forEach((s) => {
    d.querySelector(`.navbtn[data-go="${s}"]`).click();
    assert.deepStrictEqual([...d.querySelectorAll('.panel.active')].map((p) => p.dataset.slug), [s], 'chuyển trang ' + s);
  });
  assert.strictEqual(d.querySelector('[data-sub="tuan-2:a"] .btnrow [data-go]').dataset.go, 'tuan-1');
  const c = d.getElementById('f_studentClass'); c.value = '8A1'; c.dispatchEvent(new w.Event('input'));
  assert.ok(/8A1/.test(d.querySelector('[data-out="dossier"]').textContent), 'lớp đi vào hồ sơ');
  assert.deepStrictEqual(errs, [], 'lỗi script');
  console.log('OK: hub');
  w.close(); process.exit(0);
}, 300);

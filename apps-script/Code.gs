/**
 * PTA_SPCK Google Drive & Google Sheets Backend v3.2 (Google Apps Script)
 * - Học sinh: chuẩn hóa tên viết thường không dấu, tự tạo hồ sơ mới, lưu phiên bản bất biến, không lộ link Drive.
 * - Giáo viên: xác thực bằng TEACHER_KEY (ScriptProperties), trang riêng gv.html + tab BaoCaoPhuHuynh + thư mục BaoCao_PhuHuynh.
 */

var ROOT_FOLDER_NAME = 'PTA_SPCK_Submissions';
var REPORT_FOLDER_NAME = 'BaoCao_PhuHuynh';
var SHEET_NAME = 'Tracking_Master';
var REPORT_HEADER_ROW = 5;
var REPORT_FIRST_DATA_ROW = 6;

var HOSO_HEADERS = [
  'StudentKey', 'HoTen', 'TenApp', 'LatestVersion', 'LatestStateFileId',
  'FolderURL', 'Tuan1_Lab10', 'Tuan2_Lab11', 'Tuan3_Lab12', 'Tuan4_SPCK', 'UpdatedAt'
];

var HISTORY_HEADERS = [
  'Version', 'Timestamp', 'StudentKey', 'HoTen', 'MucNop',
  'Loai', 'SoFile', 'StateFileName', 'StateFileId', 'NhatKyAI', 'FileURLs'
];

var REPORT_HEADERS = [
  'StudentKey', 'TenHienThi', 'HoTenChuanHoa', 'TenApp', 'TuanKhoaHoc',
  'MucTieuWeb', 'TienDoPhanTram', 'DanhGia', 'SoMucChuaXong',
  'NoiDungGuiPhuHuynh', 'TuyChinhJSON', 'UpdatedAt'
];

var REPORT_HISTORY_HEADERS = [
  'Timestamp', 'TuanKhoaHoc', 'MucTieuWeb', 'SoHocSinh', 'DungTienDo', 'FileDriveName', 'FileDriveURL'
];

var TARGET_MAP = {
  'tuan-1': { dir: 'Tuan_1_Lab10', col: 7 },
  'tuan-2': { dir: 'Tuan_2_Lab11', col: 8 },
  'tuan-3': { dir: 'Tuan_3_Lab12', col: 9 },
  'tuan-4': { dir: 'Tuan_4_SPCK', col: 10 }
};

var WEEK_SPECS = {
  'tuan-1': {
    label: 'Tuần 1 trên web (Lab10)',
    shortTitle: 'Ý tưởng & Bản mẫu Uizard',
    goals: [
      'Chốt chủ đề, tên ứng dụng cá nhân và bảng màu Hex đồng bộ.',
      'Thiết kế đủ 3 bản mẫu màn hình (Đăng nhập, Đăng ký, Trang chủ) trên Uizard.',
      'Nộp Project Brief, Nhật ký AI và 3 ảnh Uizard (Lab10).'
    ],
    tasks: [
      { id: 't1_topic', label: 'Chốt tên ứng dụng & chủ đề cá nhân', check: function (st) { var f = (st && st.f) || {}; return !!((st && st.c && st.c.w1c1) || (String(f.appName || '').trim() && String(f.topic || '').trim())); } },
      { id: 't1_palette', label: 'Chọn bảng màu Hex đồng bộ (Chủ đạo, Nền, Chữ)', check: function (st) { var f = (st && st.f) || {}; return !!((st && st.c && st.c.w1c2) || /^#[0-9a-fA-F]{6}$/.test(String(f.pal_p || '').trim())); } },
      { id: 't1_mockups', label: 'Hoàn thành 3 bản mẫu Uizard (Đăng nhập, Đăng ký, Trang chủ)', check: function (st) { var c = (st && st.c) || {}; var m = (st && st.mockups) || {}; return !!(c.w1c3 && c.w1c4 && c.w1c5) || !!(m.login && m.register && m.home); } },
      { id: 't1_submit', label: 'Nộp bài Lab10 trên web', check: function (st, subOk) { return !!subOk; } }
    ]
  },
  'tuan-2': {
    label: 'Tuần 2 trên web (Lab11)',
    shortTitle: 'Thiết kế giao diện Qt Designer',
    goals: [
      'Chuyển 3 bản mẫu Uizard thành 3 file giao diện Qt Designer (login.ui, register.ui, home.ui) dùng Layout chuẩn.',
      'Chọn icon/hình ảnh vào thư mục assets/ và trang trí StyleSheet (QSS) đồng bộ bảng màu.',
      'Đặt objectName đúng quy ước tiền tố và nộp đủ 3 file .ui (Lab11).'
    ],
    tasks: [
      { id: 't2_forms', label: 'Tạo đủ 3 form Main Window bằng Layout chuẩn (không kéo thả tự do)', check: function (st) { var c = (st && st.c) || {}; return !!(c.w2a1 && c.w2a2); } },
      { id: 't2_inputs', label: 'Đặt echoMode = Password cho ô mật khẩu & kiểm tra Preview không vỡ bố cục', check: function (st) { var c = (st && st.c) || {}; return !!(c.w2a3 && c.w2a4); } },
      { id: 't2_qss', label: 'Áp dụng StyleSheet (QSS) đồng bộ màu sắc và font chữ cho cả 3 form', check: function (st) { var c = (st && st.c) || {}; return !!(c.w2s1 && c.w2s2); } },
      { id: 't2_submit', label: 'Hoàn thiện & nộp đủ 3 file login.ui, register.ui, home.ui (Lab11)', check: function (st, subOk) { var c = (st && st.c) || {}; return !!(c.w2d1 && c.w2d2 && c.w2d3) || !!subOk; } }
    ]
  },
  'tuan-3': {
    label: 'Tuần 3 trên web (Lab12)',
    shortTitle: 'Lập trình chức năng Python & PyQt6',
    goals: [
      'Mở và chuyển qua lại được 3 giao diện (Đăng nhập, Đăng ký, Trang chủ) bằng uic.loadUi hoặc pyuic6.',
      'Kết nối logic Đăng ký / Lưu tài khoản (auth.py) / Đăng nhập / Đăng xuất.',
      'Kiểm thử đủ 7 ca theo bảng kiểm tra và nộp mã nguồn Lab12.'
    ],
    tasks: [
      { id: 't3_nav', label: 'Chạy được form Đăng nhập và chuyển qua lại màn hình Đăng ký', check: function (st) { var c = (st && st.c) || {}; return !!(c.w3a3 && c.w3a4); } },
      { id: 't3_auth', label: 'Hoàn thành lưu tài khoản và chạy đúng 3 luồng đăng ký / đăng nhập đúng / sai', check: function (st) { var c = (st && st.c) || {}; return !!(c.w3d1 && c.w3d2); } },
      { id: 't3_tests', label: 'Kiểm thử đạt 7/7 ca kiểm tra lỗi nhập liệu & chuyển trang', check: function (st) { var c = (st && st.c) || {}; var n = 0; for (var i = 1; i <= 7; i++) if (c['w3t' + i]) n++; return n >= 7 || !!c.w3d3; } },
      { id: 't3_submit', label: 'Nộp mã nguồn Python & ảnh chạy chương trình (Lab12)', check: function (st, subOk) { return !!subOk; } }
    ]
  },
  'tuan-4': {
    label: 'Tuần 4 trên web (SPCK_Final)',
    shortTitle: 'Chức năng riêng, Kiểm thử & Thuyết trình',
    goals: [
      'Hoàn thiện ít nhất 1 chức năng riêng của ứng dụng cá nhân.',
      'Đổi máy kiểm thử chéo với bạn, sửa các lỗi ghi nhận được.',
      'Hoàn thành slide, video demo dự phòng và nộp bài cuối khóa (SPCK_Final).'
    ],
    tasks: [
      { id: 't4_custom', label: 'Hoàn thiện và chạy được ít nhất 1 chức năng riêng của sản phẩm', check: function (st) { var f = (st && st.f) || {}; var c = (st && st.c) || {}; return !!String(f.custName || '').trim() && !!c.w4d2; } },
      { id: 't4_cross', label: 'Thực hiện kiểm thử chéo và sửa lỗi cùng bạn', check: function (st) { var c = (st && st.c) || {}; var bugs = (st && Array.isArray(st.bugs)) ? st.bugs : []; return !!c.w4d1 || bugs.some(function (b) { return b && String(b.what || '').trim(); }); } },
      { id: 't4_demo', label: 'Chuẩn bị xong slide, tập nói 3–5 phút và quay video demo dự phòng', check: function (st) { var c = (st && st.c) || {}; var n = 0; for (var i = 1; i <= 4; i++) if (c['w4p' + i]) n++; return n >= 3 || !!c.w4d3; } },
      { id: 't4_submit', label: 'Nộp bài cuối khóa SPCK_Final trên web', check: function (st, subOk) { return !!subOk; } }
    ]
  }
};

function setupProject() {
  var props = PropertiesService.getScriptProperties();
  var rootFolder = findOrCreateFolder_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  findOrCreateFolder_(rootFolder, REPORT_FOLDER_NAME);

  var ss = null;
  var existingSheetId = props.getProperty('SHEET_ID');
  if (existingSheetId) {
    try { ss = SpreadsheetApp.openById(existingSheetId); } catch (e) { ss = null; }
  }
  if (!ss) {
    var files = rootFolder.getFilesByName(SHEET_NAME);
    if (files.hasNext()) {
      ss = SpreadsheetApp.openById(files.next().getId());
    } else {
      ss = SpreadsheetApp.create(SHEET_NAME);
      var sheetFile = DriveApp.getFileById(ss.getId());
      rootFolder.addFile(sheetFile);
      DriveApp.getRootFolder().removeFile(sheetFile);
    }
  }

  ensureSheets_(ss);
  var teacherKey = props.getProperty('TEACHER_KEY');
  if (!teacherKey) {
    teacherKey = 'GV-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  }
  props.setProperties({
    ROOT_FOLDER_ID: rootFolder.getId(),
    SHEET_ID: ss.getId(),
    TEACHER_KEY: teacherKey
  });

  Logger.log('ROOT_FOLDER_ID=' + rootFolder.getId());
  Logger.log('ROOT_FOLDER_URL=' + rootFolder.getUrl());
  Logger.log('SHEET_ID=' + ss.getId());
  Logger.log('SHEET_URL=' + ss.getUrl());
  Logger.log('TEACHER_KEY=' + teacherKey);
  return { rootFolderId: rootFolder.getId(), sheetId: ss.getId(), sheetUrl: ss.getUrl(), teacherKey: teacherKey };
}

function xemHoacTaoMaGiaoVien() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('TEACHER_KEY');
  if (!key) {
    key = 'GV-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    props.setProperty('TEACHER_KEY', key);
  }
  Logger.log('TEACHER_KEY=' + key);
  return key;
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : 'ping';
  if (action === 'ping') {
    return jsonOut_({ ok: true, service: 'PTA_SPCK_Drive_API', version: '3.2' });
  }
  return jsonOut_({ ok: false, error: 'Unsupported GET action' });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data = JSON.parse(raw);
    var action = String(data.action || '');

    if (action === 'load_student') return jsonOut_(handleLoadStudent_(data));
    if (action === 'load_version') return jsonOut_(handleLoadVersion_(data));
    if (action === 'save_version') return jsonOut_(handleSaveVersion_(data));
    if (action === 'submit_week') return jsonOut_(handleSubmitWeek_(data));
    if (action === 'get_file') return jsonOut_(handleGetFile_(data));
    if (action === 'list_students') return jsonOut_(handleListStudents_());
    if (action === 'teacher_overview') return jsonOut_(handleTeacherOverview_(data));
    if (action === 'teacher_save_report') return jsonOut_(handleTeacherSaveReport_(data));

    return jsonOut_({ ok: false, error: 'Action không hợp lệ: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function handleListStudents_() {
  var cfg = getConfig_();
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheets = ensureSheets_(ss);
  var rows = sheets.hoSo.getDataRange().getValues();
  var seen = {};
  var names = [];
  for (var i = 1; i < rows.length; i++) {
    var nm = normalizeStudentName_(rows[i][1] || '');
    if (nm && !seen[nm]) {
      seen[nm] = true;
      names.push(nm);
    }
  }
  return { ok: true, students: names };
}

function handleLoadStudent_(data) {
  var cfg = getConfig_();
  var info = parseStudentName_(data.studentName);
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheets = ensureSheets_(ss);
  var found = findStudentRow_(sheets.hoSo, info.studentKey);
  var studentFolder = findExistingStudentFolder_(cfg.rootFolder, info.studentKey);

  // Tự động tạo hồ sơ mới nếu chưa có trong cơ sở dữ liệu
  if (!found && !studentFolder) {
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      found = findStudentRow_(sheets.hoSo, info.studentKey);
      studentFolder = findExistingStudentFolder_(cfg.rootFolder, info.studentKey);
      if (!found && !studentFolder) {
        studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, info.studentKey);
        var versionsFolder = findOrCreateFolder_(studentFolder, 'versions');
        var verTag = nextVersionTag_(versionsFolder);
        var now = new Date();
        var stamp = formatStamp_(now);
        var nowIso = formatNow_(now);
        var initState = { f: { studentName: info.studentName } };

        var initFileName = verTag + '_' + stamp + '_khoi-tao.json';
        var initFile = versionsFolder.createFile(initFileName, JSON.stringify(initState, null, 2), MimeType.PLAIN_TEXT);

        upsertStudentRow_(sheets.hoSo, null, {
          studentKey: info.studentKey,
          studentName: info.studentName,
          appName: String((initState.f && initState.f.appName) || '').trim(),
          latestVersion: verTag,
          latestStateFileId: initFile.getId(),
          driveFolderLink: studentFolder.getUrl(),
          updatedAt: nowIso
        });

        sheets.history.appendRow([
          verTag, nowIso, info.studentKey, info.studentName,
          'khoi-tao', 'Tự tạo hồ sơ mới', 0, initFileName, initFile.getId(), '', initFile.getUrl()
        ]);

        return {
          ok: true,
          created: true,
          studentKey: info.studentKey,
          studentName: info.studentName,
          latestVersion: verTag,
          updatedAt: nowIso,
          state: initState,
          versions: listVersionFiles_(studentFolder),
          filesByWeek: listFilesByWeek_(studentFolder)
        };
      }
    } finally {
      lock.releaseLock();
    }
  }

  if (!studentFolder) {
    studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, info.studentKey);
  }

  var versions = listVersionFiles_(studentFolder);
  var filesByWeek = listFilesByWeek_(studentFolder);
  var state = null;
  var stateFileId = found && found.latestStateFileId ? found.latestStateFileId : (versions.length ? versions[0].id : '');
  if (stateFileId) {
    try {
      state = JSON.parse(DriveApp.getFileById(stateFileId).getBlob().getDataAsString('UTF-8'));
    } catch (e) {
      state = null;
    }
  }

  return {
    ok: true,
    created: false,
    studentKey: info.studentKey,
    studentName: info.studentName,
    latestVersion: (found && found.latestVersion) || (versions.length ? versions[0].version : ''),
    updatedAt: (found && found.updatedAt) || '',
    state: state,
    versions: versions,
    filesByWeek: filesByWeek
  };
}

function handleLoadVersion_(data) {
  var cfg = getConfig_();
  var info = parseStudentName_(data.studentName);
  var fileId = String(data.fileId || '').trim();
  if (!fileId) return { ok: false, error: 'Thiếu fileId phiên bản.' };

  var studentFolder = findExistingStudentFolder_(cfg.rootFolder, info.studentKey);
  if (!studentFolder) return { ok: false, error: 'Không tìm thấy thư mục học sinh.' };

  var file = DriveApp.getFileById(fileId);
  if (!isDescendantOf_(file, studentFolder)) {
    return { ok: false, error: 'Tệp không thuộc hồ sơ của học sinh này.' };
  }
  var parsed = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  return { ok: true, fileName: file.getName(), state: parsed };
}

function handleSaveVersion_(data) {
  var cfg = getConfig_();
  var info = parseStudentName_(data.studentName);
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheets = ensureSheets_(ss);

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, info.studentKey);
    var versionsFolder = findOrCreateFolder_(studentFolder, 'versions');
    var verTag = nextVersionTag_(versionsFolder);
    var now = new Date();
    var stamp = formatStamp_(now);
    var nowIso = formatNow_(now);
    var stateFileName = verTag + '_' + stamp + '_nhap.json';
    var statePayload = data.state || {};
    statePayload.f = statePayload.f || {};
    statePayload.f.studentName = info.studentName;
    var stateFile = versionsFolder.createFile(stateFileName, JSON.stringify(statePayload, null, 2), MimeType.PLAIN_TEXT);

    var found = findStudentRow_(sheets.hoSo, info.studentKey);
    upsertStudentRow_(sheets.hoSo, found, {
      studentKey: info.studentKey,
      studentName: info.studentName,
      appName: String(data.appName || '').trim(),
      latestVersion: verTag,
      latestStateFileId: stateFile.getId(),
      driveFolderLink: studentFolder.getUrl(),
      updatedAt: nowIso
    });

    sheets.history.appendRow([
      verTag, nowIso, info.studentKey, info.studentName,
      'luu-nhap', 'Lưu phiên bản nháp', 0, stateFileName, stateFile.getId(), '', stateFile.getUrl()
    ]);
    var filesByWeek = listFilesByWeek_(studentFolder);
    try {
      syncStudentReportRow_(sheets, ss, info.studentKey, info.studentName, String(data.appName || '').trim(), statePayload, filesByWeek, found ? found : null, nowIso);
    } catch (re) {}

    return {
      ok: true,
      version: verTag,
      studentName: info.studentName,
      savedAt: nowIso,
      versions: listVersionFiles_(studentFolder),
      filesByWeek: filesByWeek
    };
  } finally {
    lock.releaseLock();
  }
}

function handleSubmitWeek_(data) {
  var cfg = getConfig_();
  var info = parseStudentName_(data.studentName);
  var target = String(data.target || '');
  var spec = TARGET_MAP[target];
  if (!spec) return { ok: false, error: 'Mục nộp không hợp lệ: ' + target };

  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheets = ensureSheets_(ss);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, info.studentKey);
    var versionsFolder = findOrCreateFolder_(studentFolder, 'versions');
    var verTag = nextVersionTag_(versionsFolder);
    var now = new Date();
    var stamp = formatStamp_(now);
    var nowIso = formatNow_(now);

    var stateFileName = verTag + '_' + stamp + '_' + target + '.json';
    var statePayload = data.state || {};
    statePayload.f = statePayload.f || {};
    statePayload.f.studentName = info.studentName;
    var stateFile = versionsFolder.createFile(stateFileName, JSON.stringify(statePayload, null, 2), MimeType.PLAIN_TEXT);

    var weekFolder = findOrCreateFolder_(studentFolder, spec.dir);
    var verFolder = weekFolder.createFolder(verTag + '_' + stamp);
    var fileUrls = [];
    var files = Array.isArray(data.files) ? data.files : [];
    for (var i = 0; i < files.length; i++) {
      var item = files[i];
      if (!item || !item.base64 || !item.name) continue;
      var safeName = sanitizePart_(item.name, true);
      var bytes = Utilities.base64Decode(item.base64);
      var blob = Utilities.newBlob(bytes, item.mimeType || 'application/octet-stream', safeName);
      var created = verFolder.createFile(blob);
      fileUrls.push(created.getUrl());
    }

    var linksText = String(data.links || '').trim();
    if (linksText) {
      var lf = verFolder.createFile('links.txt', linksText, MimeType.PLAIN_TEXT);
      fileUrls.push(lf.getUrl());
    }

    var found = findStudentRow_(sheets.hoSo, info.studentKey);
    var rowIndex = upsertStudentRow_(sheets.hoSo, found, {
      studentKey: info.studentKey,
      studentName: info.studentName,
      appName: String(data.appName || '').trim(),
      latestVersion: verTag,
      latestStateFileId: stateFile.getId(),
      driveFolderLink: studentFolder.getUrl(),
      updatedAt: nowIso
    });
    sheets.hoSo.getRange(rowIndex, spec.col).setValue(verTag + ' (' + nowIso + ')');

    sheets.history.appendRow([
      verTag, nowIso, info.studentKey, info.studentName,
      target, 'Nộp bài ' + target, fileUrls.length, stateFileName, stateFile.getId(),
      String(data.aiLog || ''), fileUrls.join('\n')
    ]);
    var filesByWeek = listFilesByWeek_(studentFolder);
    try {
      syncStudentReportRow_(sheets, ss, info.studentKey, info.studentName, String(data.appName || '').trim(), statePayload, filesByWeek, null, nowIso, target, verTag);
    } catch (re) {}

    return {
      ok: true,
      version: verTag,
      studentName: info.studentName,
      status: 'Đã lưu ' + verTag,
      submittedAt: nowIso,
      filesCount: fileUrls.length,
      versions: listVersionFiles_(studentFolder),
      filesByWeek: filesByWeek
    };
  } finally {
    lock.releaseLock();
  }
}

function handleGetFile_(data) {
  var cfg = getConfig_();
  var info = parseStudentName_(data.studentName);
  var fileId = String(data.fileId || '').trim();
  if (!fileId) return { ok: false, error: 'Thiếu fileId.' };

  var studentFolder = findExistingStudentFolder_(cfg.rootFolder, info.studentKey);
  if (!studentFolder) return { ok: false, error: 'Không tìm thấy thư mục học sinh.' };

  var file = DriveApp.getFileById(fileId);
  if (!isDescendantOf_(file, studentFolder)) {
    return { ok: false, error: 'Không có quyền đọc tệp ngoài hồ sơ học sinh.' };
  }
  if (file.getSize() > 15 * 1024 * 1024) {
    return { ok: false, error: 'Tệp quá lớn để tải qua web (>15 MB).' };
  }
  var blob = file.getBlob();
  return {
    ok: true,
    name: file.getName(),
    mimeType: blob.getContentType() || 'application/octet-stream',
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty('ROOT_FOLDER_ID');
  var sheetId = props.getProperty('SHEET_ID');
  if (!rootId || !sheetId) {
    throw new Error('Chưa chạy setupProject() trong Apps Script.');
  }
  return { rootFolder: DriveApp.getFolderById(rootId), sheetId: sheetId };
}

function ensureSheets_(ss) {
  var hoSo = ensureTab_(ss, 'HoSoHocSinh', HOSO_HEADERS);
  var history = ensureTab_(ss, 'LichSuPhienBan', HISTORY_HEADERS);
  var baoCao = ensureReportTab_(ss);
  var baoCaoHistory = ensureTab_(ss, 'LichSuBaoCao', REPORT_HISTORY_HEADERS);
  var def1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (def1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(def1); } catch (e) {}
  }
  return { hoSo: hoSo, history: history, baoCao: baoCao, baoCaoHistory: baoCaoHistory };
}

function ensureReportTab_(ss) {
  var sh = ss.getSheetByName('BaoCaoPhuHuynh');
  if (!sh) sh = ss.insertSheet('BaoCaoPhuHuynh');
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 4, 2).setValues([
      ['Tuần khóa học', 10],
      ['Mục tiêu trên web', 'tuan-2'],
      ['Cập nhật lúc', ''],
      ['Hướng dẫn', 'Copy cột "NoiDungGuiPhuHuynh" để gửi phụ huynh, hoặc mở trang gv.html để tùy chỉnh riêng từng học sinh.']
    ]);
    sh.getRange(1, 1, 4, 1).setFontWeight('bold');
    sh.getRange(REPORT_HEADER_ROW, 1, 1, REPORT_HEADERS.length).setValues([REPORT_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(REPORT_HEADER_ROW);
    sh.getRange(REPORT_FIRST_DATA_ROW, 10, 200, 1).setWrap(true);
    try { sh.setColumnWidth(10, 440); } catch (e) {}
  }
  return sh;
}

function ensureTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

function normalizeStudentName_(rawName) {
  return String(rawName || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseStudentName_(rawName) {
  var studentName = normalizeStudentName_(rawName);
  var key = studentName.replace(/\s+/g, '-');
  if (!studentName || studentName.length < 2 || !key) {
    throw new Error('Hãy nhập Họ và tên đầy đủ của em (tối thiểu 2 ký tự).');
  }
  return { studentName: studentName, studentKey: key };
}

function studentSlug_(s) {
  return normalizeStudentName_(s).replace(/\s+/g, '-');
}

function sanitizePart_(s, keepDot) {
  var re = keepDot ? /[^A-Za-z0-9._-]/g : /[^A-Za-z0-9_-]/g;
  return String(s || '').trim().replace(/\s+/g, '_').replace(re, '') || 'file';
}

function findOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function findExistingStudentFolder_(rootFolder, studentKey) {
  var it = rootFolder.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    var nm = f.getName();
    if (nm === studentKey || nm.indexOf(studentKey + '_') === 0) {
      return f;
    }
  }
  return null;
}

function getOrCreateStudentFolder_(rootFolder, studentKey) {
  var existing = findExistingStudentFolder_(rootFolder, studentKey);
  if (existing) return existing;
  return rootFolder.createFolder(studentKey);
}

function nextVersionTag_(versionsFolder) {
  var maxVer = 0;
  var it = versionsFolder.getFiles();
  while (it.hasNext()) {
    var m = /^v(\d+)/i.exec(it.next().getName());
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > maxVer) maxVer = n;
    }
  }
  return 'v' + ('000' + (maxVer + 1)).slice(-3);
}

function listVersionFiles_(studentFolder) {
  var vIt = studentFolder.getFoldersByName('versions');
  if (!vIt.hasNext()) return [];
  var vf = vIt.next();
  var out = [];
  var it = vf.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    var nm = f.getName();
    var m = /^(v\d+)_(\d{8}_\d{6})_([^.]+)\.json$/i.exec(nm);
    out.push({
      id: f.getId(),
      fileName: nm,
      version: m ? m[1] : nm,
      tag: m ? m[3] : 'saved',
      savedAt: formatNow_(f.getDateCreated())
    });
  }
  out.sort(function (a, b) {
    return a.fileName < b.fileName ? 1 : (a.fileName > b.fileName ? -1 : 0);
  });
  return out;
}

function listFilesByWeek_(studentFolder) {
  var out = { 'tuan-1': [], 'tuan-2': [], 'tuan-3': [], 'tuan-4': [] };
  var keys = Object.keys(TARGET_MAP);
  for (var i = 0; i < keys.length; i++) {
    var wk = keys[i];
    var wkIt = studentFolder.getFoldersByName(TARGET_MAP[wk].dir);
    if (!wkIt.hasNext()) continue;
    var wkFolder = wkIt.next();

    var directFiles = wkFolder.getFiles();
    while (directFiles.hasNext()) {
      out[wk].push(fileMeta_(directFiles.next(), 'gốc'));
    }
    var subFolders = wkFolder.getFolders();
    while (subFolders.hasNext()) {
      var sf = subFolders.next();
      var verName = sf.getName().split('_')[0] || sf.getName();
      var fit = sf.getFiles();
      while (fit.hasNext()) {
        out[wk].push(fileMeta_(fit.next(), verName));
      }
    }
    out[wk].sort(function (a, b) {
      return a.uploadedAt < b.uploadedAt ? 1 : (a.uploadedAt > b.uploadedAt ? -1 : 0);
    });
  }
  return out;
}

function fileMeta_(f, versionLabel) {
  return {
    id: f.getId(),
    version: versionLabel,
    name: f.getName(),
    size: f.getSize(),
    mimeType: f.getMimeType(),
    uploadedAt: formatNow_(f.getDateCreated())
  };
}

function isDescendantOf_(file, ancestorFolder) {
  var targetId = ancestorFolder.getId();
  var queue = [];
  var p = file.getParents();
  while (p.hasNext()) queue.push(p.next());
  var hops = 0;
  while (queue.length && hops < 40) {
    hops++;
    var cur = queue.shift();
    if (cur.getId() === targetId) return true;
    var gp = cur.getParents();
    while (gp.hasNext()) queue.push(gp.next());
  }
  return false;
}

function findStudentRow_(sheet, studentKey) {
  var vals = sheet.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (studentSlug_(vals[i][0]) === studentKey || studentSlug_(vals[i][1]) === studentKey) {
      return {
        row: i + 1,
        name: String(vals[i][1] || ''),
        latestVersion: String(vals[i][3] || ''),
        latestStateFileId: String(vals[i][4] || ''),
        updatedAt: String(vals[i][10] || '')
      };
    }
  }
  return null;
}

function upsertStudentRow_(sheet, found, info) {
  if (found) {
    sheet.getRange(found.row, 2, 1, 5).setValues([[
      info.studentName, info.appName, info.latestVersion, info.latestStateFileId, info.driveFolderLink
    ]]);
    sheet.getRange(found.row, 11).setValue(info.updatedAt);
    return found.row;
  }
  sheet.appendRow([
    info.studentKey, info.studentName, info.appName, info.latestVersion,
    info.latestStateFileId, info.driveFolderLink, '', '', '', '', info.updatedAt
  ]);
  return sheet.getLastRow();
}

function formatStamp_(dateObj) {
  return Utilities.formatDate(dateObj || new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss');
}

function formatNow_(dateObj) {
  return Utilities.formatDate(dateObj || new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Đánh giá tiến độ & Báo cáo phụ huynh (cho phép kiểm thử trong Node vm) ---------- */

function requireTeacherKey_(data) {
  var expected = PropertiesService.getScriptProperties().getProperty('TEACHER_KEY');
  if (!expected) {
    throw new Error('Chưa có TEACHER_KEY. Hãy chạy hàm setupProject() hoặc xemHoacTaoMaGiaoVien() trong Apps Script.');
  }
  var given = String((data && data.teacherKey) || '').trim();
  if (!given || given !== expected) {
    throw new Error('Mã giáo viên không đúng hoặc không có quyền truy cập.');
  }
  return true;
}

function titleCaseName_(raw) {
  return String(raw || '').trim().split(/\s+/).filter(Boolean).map(function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function normalizeWeekKey_(w) {
  var s = String(w || '').trim().toLowerCase();
  if (WEEK_SPECS[s]) return s;
  if (/^[1-4]$/.test(s)) return 'tuan-' + s;
  return 'tuan-2';
}

function isWeekSubmitted_(weekKey, state, filesByWeek, hoSoWeekCell) {
  var subs = (state && state.submissions) ? state.submissions : {};
  var fw = (filesByWeek && filesByWeek[weekKey]) ? filesByWeek[weekKey] : [];
  return !!(subs[weekKey] || fw.length > 0 || String(hoSoWeekCell || '').trim());
}

function evaluateWeekProgress_(weekKey, state, filesByWeek, hoSoWeekCell) {
  var wk = normalizeWeekKey_(weekKey);
  var spec = WEEK_SPECS[wk];
  var subOk = isWeekSubmitted_(wk, state, filesByWeek, hoSoWeekCell);
  var items = [];
  var missing = [];
  var done = 0;
  for (var i = 0; i < spec.tasks.length; i++) {
    var t = spec.tasks[i];
    var ok = !!t.check(state || {}, subOk);
    if (ok) done++; else missing.push(t.label);
    items.push({ id: t.id, label: t.label, done: ok });
  }
  var total = spec.tasks.length;
  var percent = total ? Math.round((done / total) * 100) : 0;
  return {
    webWeek: wk,
    shortTitle: spec.shortTitle,
    goals: spec.goals.slice(),
    total: total,
    done: done,
    percent: percent,
    onTrack: done === total,
    items: items,
    missing: missing
  };
}

function buildEffectiveEvaluation_(evalObj, custom) {
  custom = custom || {};
  var overrides = (custom.taskOverrides && typeof custom.taskOverrides === 'object') ? custom.taskOverrides : {};
  var missing = [];
  var done = 0;
  var items = [];
  for (var i = 0; i < evalObj.items.length; i++) {
    var it = evalObj.items[i];
    var isDone = (typeof overrides[it.id] === 'boolean') ? overrides[it.id] : !!it.done;
    if (isDone) done++; else missing.push(it.label);
    items.push({ id: it.id, label: it.label, done: isDone });
  }
  var extraLines = String(custom.extraMissing || '').split(/\r?\n/).map(function (s) {
    return s.replace(/^[-*•]\s*/, '').trim();
  }).filter(Boolean);
  for (var j = 0; j < extraLines.length; j++) missing.push(extraLines[j]);

  var total = items.length;
  var percent = total ? Math.round((done / total) * 100) : 0;
  var statusMode = custom.overrideStatus || 'auto';
  var onTrack = statusMode === 'on_track' ? true : (statusMode === 'behind' ? false : (done === total && extraLines.length === 0));
  return {
    webWeek: evalObj.webWeek,
    shortTitle: evalObj.shortTitle,
    total: total,
    done: done,
    percent: percent,
    onTrack: onTrack,
    items: items,
    missing: missing
  };
}

function formatParentReport_(opts) {
  opts = opts || {};
  var wk = normalizeWeekKey_(opts.webWeek);
  var spec = WEEK_SPECS[wk];
  var courseWeek = String(opts.courseWeek || '').trim();
  var headerWeek = courseWeek ? ('tuần ' + courseWeek + ' (' + spec.label + ')') : spec.label;
  var goals = (Array.isArray(opts.goals) && opts.goals.length) ? opts.goals : spec.goals;
  var missing = Array.isArray(opts.missing) ? opts.missing.filter(Boolean) : [];
  var statusLabel = opts.onTrack ? 'Đúng tiến độ.' : 'Chưa đúng tiến độ.';

  var lines = [
    String(opts.displayName || 'Học viên'),
    'Mục tiêu của ' + headerWeek + ':'
  ];
  for (var i = 0; i < goals.length; i++) {
    lines.push('- ' + goals[i]);
  }
  lines.push('Tiến độ hiện tại: ' + statusLabel);
  lines.push('Những nhiệm vụ chưa hoàn thành:');
  if (!missing.length) {
    lines.push('- Không có (học viên đã hoàn thành đầy đủ yêu cầu của tuần này).');
  } else {
    for (var j = 0; j < missing.length; j++) {
      lines.push('- ' + missing[j]);
    }
  }
  return lines.join('\n');
}

function loadGoalsByWeek_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('TEACHER_GOALS_JSON');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function readReportMap_(baoCaoSheet) {
  var map = {};
  var lastRow = baoCaoSheet.getLastRow();
  if (lastRow < REPORT_FIRST_DATA_ROW) return map;
  var rows = baoCaoSheet.getRange(REPORT_FIRST_DATA_ROW, 1, lastRow - REPORT_FIRST_DATA_ROW + 1, REPORT_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    var key = studentSlug_(rows[i][0] || rows[i][2] || '');
    if (!key) continue;
    var custom = {};
    try { custom = rows[i][10] ? JSON.parse(String(rows[i][10])) : {}; } catch (e) { custom = {}; }
    map[key] = {
      row: REPORT_FIRST_DATA_ROW + i,
      displayName: String(rows[i][1] || ''),
      custom: custom,
      reportText: String(rows[i][9] || '')
    };
  }
  return map;
}

function upsertReportRow_(baoCaoSheet, existingRow, vals) {
  if (existingRow) {
    baoCaoSheet.getRange(existingRow, 1, 1, REPORT_HEADERS.length).setValues([vals]);
    return existingRow;
  }
  var nextRow = Math.max(REPORT_FIRST_DATA_ROW, baoCaoSheet.getLastRow() + 1);
  baoCaoSheet.getRange(nextRow, 1, 1, REPORT_HEADERS.length).setValues([vals]);
  return nextRow;
}

function syncStudentReportRow_(sheets, ss, studentKey, studentName, appName, statePayload, filesByWeek, hoSoFound, nowIso, submittedTarget, verTag) {
  var baoCao = sheets.baoCao || ensureReportTab_(ss);
  var courseWeek = Number(baoCao.getRange(1, 2).getValue()) || 10;
  var webWeek = normalizeWeekKey_(baoCao.getRange(2, 2).getValue() || 'tuan-2');
  var goalsMap = loadGoalsByWeek_();
  var customGoals = Array.isArray(goalsMap[webWeek]) && goalsMap[webWeek].length ? goalsMap[webWeek] : WEEK_SPECS[webWeek].goals;

  var hoSoWeekCell = '';
  if (submittedTarget === webWeek) {
    hoSoWeekCell = verTag || 'submitted';
  } else {
    var foundRow = findStudentRow_(sheets.hoSo, studentKey);
    if (foundRow && TARGET_MAP[webWeek]) {
      hoSoWeekCell = String(sheets.hoSo.getRange(foundRow.row, TARGET_MAP[webWeek].col).getValue() || '');
    }
  }

  var existingMap = readReportMap_(baoCao);
  var prev = existingMap[studentKey] || {};
  var displayName = prev.displayName || titleCaseName_(studentName);
  var custom = prev.custom || {};
  var rawEval = evaluateWeekProgress_(webWeek, statePayload || {}, filesByWeek || {}, hoSoWeekCell);
  var effEval = buildEffectiveEvaluation_(rawEval, custom);
  var reportText = formatParentReport_({
    displayName: displayName,
    courseWeek: courseWeek,
    webWeek: webWeek,
    goals: customGoals,
    onTrack: effEval.onTrack,
    missing: effEval.missing
  });

  upsertReportRow_(baoCao, prev.row || null, [
    studentKey,
    displayName,
    studentName,
    appName,
    courseWeek,
    webWeek,
    effEval.percent,
    effEval.onTrack ? 'Đúng tiến độ' : 'Chưa đúng tiến độ',
    effEval.missing.length,
    reportText,
    JSON.stringify(custom),
    nowIso
  ]);
  baoCao.getRange(3, 2).setValue(nowIso);
}

function collectStudentSnapshots_(cfg, ss, sheets, courseWeek, webWeek) {
  var reportMap = readReportMap_(sheets.baoCao);
  var goalsMap = loadGoalsByWeek_();
  var customGoals = Array.isArray(goalsMap[webWeek]) && goalsMap[webWeek].length ? goalsMap[webWeek] : WEEK_SPECS[webWeek].goals;
  var rows = sheets.hoSo.getDataRange().getValues();
  var colIdx = TARGET_MAP[webWeek] ? (TARGET_MAP[webWeek].col - 1) : 7;
  var students = [];

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var studentKey = studentSlug_(r[0] || r[1] || '');
    if (!studentKey) continue;
    var studentName = normalizeStudentName_(r[1] || studentKey.replace(/-/g, ' '));
    var appName = String(r[2] || '').trim();
    var latestVersion = String(r[3] || '');
    var latestStateFileId = String(r[4] || '');
    var driveUrl = String(r[5] || '');
    var hoSoWeekCell = String(r[colIdx] || '');
    var updatedAt = String(r[10] || '');

    var studentFolder = findExistingStudentFolder_(cfg.rootFolder, studentKey);
    var filesByWeek = studentFolder ? listFilesByWeek_(studentFolder) : { 'tuan-1': [], 'tuan-2': [], 'tuan-3': [], 'tuan-4': [] };
    if (!driveUrl && studentFolder) driveUrl = studentFolder.getUrl();

    var state = {};
    if (latestStateFileId) {
      try { state = JSON.parse(DriveApp.getFileById(latestStateFileId).getBlob().getDataAsString('UTF-8')); } catch (e) { state = {}; }
    }

    var savedRep = reportMap[studentKey] || {};
    var displayName = savedRep.displayName || titleCaseName_(studentName);
    var custom = savedRep.custom || {};
    var autoEval = evaluateWeekProgress_(webWeek, state, filesByWeek, hoSoWeekCell);
    var effEval = buildEffectiveEvaluation_(autoEval, custom);
    var filesCount = 0;
    var fKeys = ['tuan-1', 'tuan-2', 'tuan-3', 'tuan-4'];
    for (var fi = 0; fi < fKeys.length; fi++) filesCount += (filesByWeek[fKeys[fi]] || []).length;

    students.push({
      studentKey: studentKey,
      studentName: studentName,
      displayName: displayName,
      appName: appName,
      latestVersion: latestVersion,
      updatedAt: updatedAt,
      teacherDriveUrl: driveUrl,
      filesCount: filesCount,
      weekSubmitted: isWeekSubmitted_(webWeek, state, filesByWeek, hoSoWeekCell),
      weekFiles: filesByWeek[webWeek] || [],
      autoEval: autoEval,
      evalResult: effEval,
      custom: custom,
      reportText: formatParentReport_({
        displayName: displayName,
        courseWeek: courseWeek,
        webWeek: webWeek,
        goals: customGoals,
        onTrack: effEval.onTrack,
        missing: effEval.missing
      })
    });
  }

  students.sort(function (a, b) {
    return a.studentKey < b.studentKey ? -1 : (a.studentKey > b.studentKey ? 1 : 0);
  });
  return { students: students, customGoals: customGoals, reportMap: reportMap };
}

function handleTeacherOverview_(data) {
  requireTeacherKey_(data);
  var cfg = getConfig_();
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheets = ensureSheets_(ss);
  var reportFolder = findOrCreateFolder_(cfg.rootFolder, REPORT_FOLDER_NAME);

  var courseWeek = Number(data && data.courseWeek) || Number(sheets.baoCao.getRange(1, 2).getValue()) || 10;
  var webWeek = normalizeWeekKey_((data && data.webWeek) || sheets.baoCao.getRange(2, 2).getValue() || 'tuan-2');
  var snap = collectStudentSnapshots_(cfg, ss, sheets, courseWeek, webWeek);

  return {
    ok: true,
    courseWeek: courseWeek,
    webWeek: webWeek,
    weekSpecs: WEEK_SPECS,
    customGoals: snap.customGoals,
    sheetUrl: ss.getUrl(),
    reportFolderUrl: reportFolder.getUrl(),
    students: snap.students
  };
}

function handleTeacherSaveReport_(data) {
  requireTeacherKey_(data);
  var cfg = getConfig_();
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheets = ensureSheets_(ss);
  var reportFolder = findOrCreateFolder_(cfg.rootFolder, REPORT_FOLDER_NAME);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var courseWeek = Number(data && data.courseWeek) || Number(sheets.baoCao.getRange(1, 2).getValue()) || 10;
    var webWeek = normalizeWeekKey_((data && data.webWeek) || sheets.baoCao.getRange(2, 2).getValue() || 'tuan-2');
    var now = new Date();
    var nowIso = formatNow_(now);
    var stamp = formatStamp_(now);

    if (Array.isArray(data.customGoals)) {
      var cleanGoals = data.customGoals.map(function (s) { return String(s || '').trim(); }).filter(Boolean);
      var gm = loadGoalsByWeek_();
      if (cleanGoals.length) gm[webWeek] = cleanGoals; else delete gm[webWeek];
      PropertiesService.getScriptProperties().setProperty('TEACHER_GOALS_JSON', JSON.stringify(gm));
    }

    sheets.baoCao.getRange(1, 2).setValue(courseWeek);
    sheets.baoCao.getRange(2, 2).setValue(webWeek);
    sheets.baoCao.getRange(3, 2).setValue(nowIso);

    var existingMap = readReportMap_(sheets.baoCao);
    var incoming = Array.isArray(data.reports) ? data.reports : [];
    var textBlocks = [];
    var onTrackCount = 0;

    for (var i = 0; i < incoming.length; i++) {
      var rep = incoming[i];
      if (!rep || !rep.studentKey) continue;
      var key = studentSlug_(rep.studentKey);
      var prev = existingMap[key];
      var displayName = String(rep.displayName || '').trim() || titleCaseName_(rep.studentName || key);
      var onTrack = !!rep.onTrack;
      if (onTrack) onTrackCount++;
      var reportText = String(rep.reportText || '').trim();
      var customJson = JSON.stringify(rep.custom || {});

      var savedRow = upsertReportRow_(sheets.baoCao, prev ? prev.row : null, [
        key,
        displayName,
        String(rep.studentName || key.replace(/-/g, ' ')),
        String(rep.appName || ''),
        courseWeek,
        webWeek,
        Number(rep.percent || 0),
        onTrack ? 'Đúng tiến độ' : 'Chưa đúng tiến độ',
        Number(rep.missingCount || 0),
        reportText,
        customJson,
        nowIso
      ]);
      existingMap[key] = { row: savedRow, displayName: displayName, custom: rep.custom || {}, reportText: reportText };
      if (reportText) textBlocks.push(reportText);
    }

    var exportFileName = '';
    var exportFileUrl = '';
    if (data.exportToDrive && textBlocks.length) {
      exportFileName = 'BaoCao_Tuan' + courseWeek + '_' + webWeek + '_' + stamp + '.txt';
      var content = 'BÁO CÁO TIẾN ĐỘ PHỤ HUYNH — TUẦN KHÓA HỌC ' + courseWeek + ' (' + WEEK_SPECS[webWeek].label + ')\n' +
        'Xuất lúc: ' + nowIso + '\n' +
        '============================================================\n\n' +
        textBlocks.join('\n\n------------------------------------------------------------\n\n') + '\n';
      var file = reportFolder.createFile(exportFileName, content, MimeType.PLAIN_TEXT);
      exportFileUrl = file.getUrl();
      sheets.baoCaoHistory.appendRow([
        nowIso, courseWeek, webWeek, incoming.length, onTrackCount, exportFileName, exportFileUrl
      ]);
    }

    return {
      ok: true,
      savedAt: nowIso,
      savedCount: incoming.length,
      onTrackCount: onTrackCount,
      exportFileName: exportFileName,
      exportFileUrl: exportFileUrl,
      sheetUrl: ss.getUrl(),
      reportFolderUrl: reportFolder.getUrl()
    };
  } finally {
    lock.releaseLock();
  }
}

function capNhatBaoCaoPhuHuynh() {
  var cfg = getConfig_();
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheets = ensureSheets_(ss);
  var reportFolder = findOrCreateFolder_(cfg.rootFolder, REPORT_FOLDER_NAME);
  var courseWeek = Number(sheets.baoCao.getRange(1, 2).getValue()) || 10;
  var webWeek = normalizeWeekKey_(sheets.baoCao.getRange(2, 2).getValue() || 'tuan-2');
  var snap = collectStudentSnapshots_(cfg, ss, sheets, courseWeek, webWeek);

  var teacherKey = PropertiesService.getScriptProperties().getProperty('TEACHER_KEY');
  var payload = {
    teacherKey: teacherKey,
    courseWeek: courseWeek,
    webWeek: webWeek,
    exportToDrive: true,
    reports: snap.students.map(function (st) {
      return {
        studentKey: st.studentKey,
        studentName: st.studentName,
        displayName: st.displayName,
        appName: st.appName,
        percent: st.evalResult.percent,
        onTrack: st.evalResult.onTrack,
        missingCount: st.evalResult.missing.length,
        reportText: st.reportText,
        custom: st.custom
      };
    })
  };
  var res = handleTeacherSaveReport_(payload);
  Logger.log('SHEET_URL=' + ss.getUrl());
  Logger.log('REPORT_FOLDER_URL=' + reportFolder.getUrl());
  Logger.log('EXPORT_FILE_URL=' + res.exportFileUrl);
  return res;
}

/**
 * PTA_SPCK Google Drive & Google Sheets Backend (Google Apps Script)
 * Chạy hàm setupProject() 1 lần duy nhất trong Apps Script Editor để khởi tạo
 * thư mục Drive PTA_SPCK_Submissions, Google Sheet Tracking_Master và TEACHER_KEY.
 */

var ROOT_FOLDER_NAME = 'PTA_SPCK_Submissions';
var SHEET_NAME = 'Tracking_Master';

var TIENDO_HEADERS = [
  'MaLop', 'MaHS', 'HoTen', 'TenApp', 'PIN_Hash', 'FolderURL',
  'Tuan1_Lab10', 'BTVN1', 'Tuan2_Lab11', 'BTVN2',
  'Tuan3_Lab12', 'BTVN3', 'Tuan4_SPCK', 'BTVN4', 'UpdatedAt'
];

var LOG_HEADERS = [
  'Timestamp', 'MaLop', 'MaHS', 'HoTen', 'MucNop',
  'TrangThai', 'SoFile', 'MicroCheck', 'NhatKyAI', 'FileURLs'
];

var DEADLINE_HEADERS = ['MucNop', 'HanNop_ISO'];

var TARGET_MAP = {
  'tuan-1': { dir: ['Tuan_1_Lab10'], col: 7 },
  'btvn-1': { dir: ['BTVN', 'btvn_tuan1'], col: 8 },
  'tuan-2': { dir: ['Tuan_2_Lab11'], col: 9 },
  'btvn-2': { dir: ['BTVN', 'btvn_tuan2'], col: 10 },
  'tuan-3': { dir: ['Tuan_3_Lab12'], col: 11 },
  'btvn-3': { dir: ['BTVN', 'btvn_tuan3'], col: 12 },
  'tuan-4': { dir: ['Tuan_4_SPCK'], col: 13 },
  'btvn-4': { dir: ['BTVN', 'btvn_tuan4'], col: 14 }
};

function setupProject() {
  var props = PropertiesService.getScriptProperties();
  var rootFolder = findOrCreateFolder_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);

  var ss = null;
  var existingSheetId = props.getProperty('SHEET_ID');
  if (existingSheetId) {
    try {
      ss = SpreadsheetApp.openById(existingSheetId);
    } catch (e) {
      ss = null;
    }
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

  ensureSheetTab_(ss, 'TienDo', TIENDO_HEADERS);
  ensureSheetTab_(ss, 'NopBaiLog', LOG_HEADERS);
  var dlSheet = ensureSheetTab_(ss, 'Deadlines', DEADLINE_HEADERS);
  if (dlSheet.getLastRow() <= 1) {
    var seeds = ['tuan-1', 'btvn-1', 'tuan-2', 'btvn-2', 'tuan-3', 'btvn-3', 'tuan-4', 'btvn-4'];
    for (var i = 0; i < seeds.length; i++) {
      dlSheet.appendRow([seeds[i], '']);
    }
  }
  var defaultTab = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (defaultTab && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultTab);
  }

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
  return {
    rootFolderId: rootFolder.getId(),
    sheetId: ss.getId(),
    sheetUrl: ss.getUrl(),
    teacherKey: teacherKey
  };
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : 'ping';
  if (action === 'ping') {
    return jsonOut_({ ok: true, service: 'PTA_SPCK_Drive_API', version: '2.0' });
  }
  return jsonOut_({ ok: false, error: 'Unsupported GET action' });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data = JSON.parse(raw);
    var action = String(data.action || '');

    if (action === 'load_state') return jsonOut_(handleLoadState_(data));
    if (action === 'save_state') return jsonOut_(handleSaveState_(data));
    if (action === 'submit_week') return jsonOut_(handleSubmitWeek_(data));
    if (action === 'teacher_sync') return jsonOut_(handleTeacherSync_(data));

    return jsonOut_({ ok: false, error: 'Action không hợp lệ: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function handleLoadState_(data) {
  var cfg = getConfig_();
  var idInfo = parseIdentity_(data);
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheet = ss.getSheetByName('TienDo');
  var found = findStudentRow_(sheet, idInfo.classCode, idInfo.studentId);

  if (!found) {
    return { ok: true, isNew: true };
  }
  if (found.pinHash && found.pinHash !== idInfo.pinHash) {
    return { ok: false, error: 'Sai mã PIN 4 số cho tài khoản học viên này.' };
  }

  var studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, idInfo.classCode, idInfo.studentId, found.name);
  var state = readStateJson_(studentFolder);
  return {
    ok: true,
    isNew: false,
    state: state,
    folderUrl: studentFolder.getUrl(),
    updatedAt: found.updatedAt
  };
}

function handleSaveState_(data) {
  var cfg = getConfig_();
  var idInfo = parseIdentity_(data);
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheet = ss.getSheetByName('TienDo');
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var found = findStudentRow_(sheet, idInfo.classCode, idInfo.studentId);
    if (found && found.pinHash && found.pinHash !== idInfo.pinHash) {
      return { ok: false, error: 'Sai mã PIN 4 số.' };
    }
    var studentName = String(data.studentName || (found ? found.name : '') || idInfo.studentId).trim();
    var appName = String(data.appName || '').trim();
    var studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, idInfo.classCode, idInfo.studentId, studentName);
    writeStateJson_(studentFolder, data.state || {});
    var nowIso = formatNow_();
    upsertStudentRow_(sheet, found, {
      classCode: idInfo.classCode,
      studentId: idInfo.studentId,
      studentName: studentName,
      appName: appName,
      pinHash: idInfo.pinHash,
      folderUrl: studentFolder.getUrl(),
      updatedAt: nowIso
    });
    return { ok: true, savedAt: nowIso, folderUrl: studentFolder.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

function handleSubmitWeek_(data) {
  var cfg = getConfig_();
  var idInfo = parseIdentity_(data);
  var target = String(data.target || '');
  var spec = TARGET_MAP[target];
  if (!spec) return { ok: false, error: 'Mục nộp không hợp lệ: ' + target };

  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheet = ss.getSheetByName('TienDo');
  var logSheet = ss.getSheetByName('NopBaiLog');
  var dlSheet = ss.getSheetByName('Deadlines');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var found = findStudentRow_(sheet, idInfo.classCode, idInfo.studentId);
    if (found && found.pinHash && found.pinHash !== idInfo.pinHash) {
      return { ok: false, error: 'Sai mã PIN 4 số.' };
    }

    var studentName = String(data.studentName || (found ? found.name : '') || idInfo.studentId).trim();
    var appName = String(data.appName || '').trim();
    var studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, idInfo.classCode, idInfo.studentId, studentName);
    if (data.state) {
      writeStateJson_(studentFolder, data.state);
    }

    var targetFolder = studentFolder;
    for (var i = 0; i < spec.dir.length; i++) {
      targetFolder = findOrCreateFolder_(targetFolder, spec.dir[i]);
    }

    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss');
    var fileUrls = [];
    var files = Array.isArray(data.files) ? data.files : [];
    for (var f = 0; f < files.length; f++) {
      var item = files[f];
      if (!item || !item.base64 || !item.name) continue;
      var safeFileName = stamp + '_' + sanitizePart_(item.name, true);
      var bytes = Utilities.base64Decode(item.base64);
      var blob = Utilities.newBlob(bytes, item.mimeType || 'application/octet-stream', safeFileName);
      var created = targetFolder.createFile(blob);
      fileUrls.push(created.getUrl());
    }

    var linksText = String(data.links || '').trim();
    if (linksText) {
      var linkFile = targetFolder.createFile(stamp + '_links.txt', linksText, MimeType.PLAIN_TEXT);
      fileUrls.push(linkFile.getUrl());
    }

    var now = new Date();
    var nowIso = formatNow_(now);
    var status = computeDeadlineStatus_(dlSheet, target, now);
    var cellSummary = status + ' (' + nowIso + ')';

    var rowIndex = upsertStudentRow_(sheet, found, {
      classCode: idInfo.classCode,
      studentId: idInfo.studentId,
      studentName: studentName,
      appName: appName,
      pinHash: idInfo.pinHash,
      folderUrl: studentFolder.getUrl(),
      updatedAt: nowIso
    });
    sheet.getRange(rowIndex, spec.col).setValue(cellSummary);

    logSheet.appendRow([
      nowIso,
      idInfo.classCode,
      idInfo.studentId,
      studentName,
      target,
      status,
      fileUrls.length,
      String(data.microCheck || ''),
      String(data.aiLog || ''),
      fileUrls.join('\n')
    ]);

    return {
      ok: true,
      status: status,
      submittedAt: nowIso,
      filesCount: fileUrls.length,
      folderUrl: targetFolder.getUrl(),
      fileUrls: fileUrls
    };
  } finally {
    lock.releaseLock();
  }
}

function handleTeacherSync_(data) {
  var cfg = getConfig_();
  var key = String(data.teacherKey || '').trim();
  if (!key || key !== cfg.teacherKey) {
    return { ok: false, error: 'Sai Teacher Key.' };
  }
  var classFilter = normalizeCode_(data.classCode || '');
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var td = ss.getSheetByName('TienDo').getDataRange().getValues();
  var logsRaw = ss.getSheetByName('NopBaiLog').getDataRange().getValues();

  var students = [];
  for (var i = 1; i < td.length; i++) {
    var row = td[i];
    if (!row[1]) continue;
    if (classFilter && normalizeCode_(row[0]) !== classFilter) continue;
    students.push({
      classCode: String(row[0] || ''),
      studentId: String(row[1] || ''),
      name: String(row[2] || ''),
      project: String(row[3] || ''),
      folderUrl: String(row[5] || ''),
      tuan1: String(row[6] || ''),
      btvn1: String(row[7] || ''),
      tuan2: String(row[8] || ''),
      btvn2: String(row[9] || ''),
      tuan3: String(row[10] || ''),
      btvn3: String(row[11] || ''),
      tuan4: String(row[12] || ''),
      btvn4: String(row[13] || ''),
      updatedAt: String(row[14] || '')
    });
  }

  var logs = [];
  for (var j = logsRaw.length - 1; j >= 1 && logs.length < 60; j--) {
    var l = logsRaw[j];
    if (classFilter && normalizeCode_(l[1]) !== classFilter) continue;
    logs.push({
      timestamp: String(l[0] || ''),
      classCode: String(l[1] || ''),
      studentId: String(l[2] || ''),
      name: String(l[3] || ''),
      target: String(l[4] || ''),
      status: String(l[5] || ''),
      filesCount: Number(l[6] || 0),
      microCheck: String(l[7] || ''),
      aiLog: String(l[8] || ''),
      fileUrls: String(l[9] || '')
    });
  }

  return {
    ok: true,
    students: students,
    logs: logs,
    sheetUrl: ss.getUrl(),
    folderUrl: cfg.rootFolder.getUrl()
  };
}

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty('ROOT_FOLDER_ID');
  var sheetId = props.getProperty('SHEET_ID');
  var teacherKey = props.getProperty('TEACHER_KEY');
  if (!rootId || !sheetId) {
    throw new Error('Chưa chạy setupProject() trong Apps Script.');
  }
  return {
    rootFolder: DriveApp.getFolderById(rootId),
    sheetId: sheetId,
    teacherKey: teacherKey || ''
  };
}

function parseIdentity_(data) {
  var classCode = normalizeCode_(data.classCode);
  var studentId = sanitizePart_(data.studentId, false);
  var pinHash = String(data.pinHash || '').trim();
  if (!classCode || !studentId || !pinHash) {
    throw new Error('Thiếu Mã lớp, Mã học viên hoặc Mã PIN.');
  }
  return { classCode: classCode, studentId: studentId, pinHash: pinHash };
}

function normalizeCode_(s) {
  return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function sanitizePart_(s, keepDot) {
  var re = keepDot ? /[^A-Za-z0-9._-]/g : /[^A-Za-z0-9_-]/g;
  return String(s || '').trim().replace(/\s+/g, '_').replace(re, '') || 'file';
}

function findOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function getOrCreateStudentFolder_(rootFolder, classCode, studentId, studentName) {
  var classFolder = findOrCreateFolder_(rootFolder, classCode);
  var cleanName = sanitizePart_(studentName || '', false);
  var prefix = studentId + '_';
  var it = classFolder.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName() === studentId || f.getName().indexOf(prefix) === 0) {
      return f;
    }
  }
  var folderName = cleanName && cleanName !== studentId ? (studentId + '_' + cleanName) : studentId;
  return classFolder.createFolder(folderName);
}

function readStateJson_(folder) {
  var it = folder.getFilesByName('state.json');
  if (!it.hasNext()) return null;
  return JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
}

function writeStateJson_(folder, stateObj) {
  var content = JSON.stringify(stateObj, null, 2);
  var it = folder.getFilesByName('state.json');
  if (it.hasNext()) {
    it.next().setContent(content);
  } else {
    folder.createFile('state.json', content, MimeType.PLAIN_TEXT);
  }
}

function ensureSheetTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

function findStudentRow_(sheet, classCode, studentId) {
  var vals = sheet.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (normalizeCode_(vals[i][0]) === classCode && String(vals[i][1] || '') === studentId) {
      return {
        row: i + 1,
        name: String(vals[i][2] || ''),
        project: String(vals[i][3] || ''),
        pinHash: String(vals[i][4] || ''),
        folderUrl: String(vals[i][5] || ''),
        updatedAt: String(vals[i][14] || '')
      };
    }
  }
  return null;
}

function upsertStudentRow_(sheet, found, info) {
  if (found) {
    sheet.getRange(found.row, 3, 1, 4).setValues([[
      info.studentName, info.appName, info.pinHash, info.folderUrl
    ]]);
    sheet.getRange(found.row, 15).setValue(info.updatedAt);
    return found.row;
  }
  sheet.appendRow([
    info.classCode, info.studentId, info.studentName, info.appName,
    info.pinHash, info.folderUrl, '', '', '', '', '', '', '', '', info.updatedAt
  ]);
  return sheet.getLastRow();
}

function computeDeadlineStatus_(dlSheet, target, now) {
  if (!dlSheet) return 'Đã nộp';
  var vals = dlSheet.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim() === target) {
      var raw = String(vals[i][1] || '').trim();
      if (!raw) return 'Đã nộp';
      var dl = new Date(raw);
      if (isNaN(dl.getTime())) return 'Đã nộp';
      return now.getTime() <= dl.getTime() ? 'Đúng hạn' : 'Nộp trễ';
    }
  }
  return 'Đã nộp';
}

function formatNow_(dateObj) {
  var d = dateObj || new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

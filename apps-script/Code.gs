/**
 * PTA_SPCK Google Drive & Google Sheets Backend v3.0 (Google Apps Script)
 * - Tra cứu hồ sơ & toàn bộ file bài làm chỉ bằng Họ và tên học sinh.
 * - Lưu phiên bản bất biến (append-only): KHÔNG BAO GIỜ ghi đè dữ liệu hay file cũ.
 * - Giữ nguyên ROOT_FOLDER_ID & SHEET_ID đã tạo từ setupProject().
 */

var ROOT_FOLDER_NAME = 'PTA_SPCK_Submissions';
var SHEET_NAME = 'Tracking_Master';

var HOSO_HEADERS = [
  'StudentKey', 'HoTen', 'TenApp', 'LatestVersion', 'LatestStateFileId',
  'FolderURL', 'Tuan1_Lab10', 'Tuan2_Lab11', 'Tuan3_Lab12', 'Tuan4_SPCK', 'UpdatedAt'
];

var HISTORY_HEADERS = [
  'Version', 'Timestamp', 'StudentKey', 'HoTen', 'MucNop',
  'Loai', 'SoFile', 'StateFileName', 'StateFileId', 'NhatKyAI', 'FileURLs'
];

var TARGET_MAP = {
  'tuan-1': { dir: 'Tuan_1_Lab10', col: 7 },
  'tuan-2': { dir: 'Tuan_2_Lab11', col: 8 },
  'tuan-3': { dir: 'Tuan_3_Lab12', col: 9 },
  'tuan-4': { dir: 'Tuan_4_SPCK', col: 10 }
};

function setupProject() {
  var props = PropertiesService.getScriptProperties();
  var rootFolder = findOrCreateFolder_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);

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
  props.setProperties({
    ROOT_FOLDER_ID: rootFolder.getId(),
    SHEET_ID: ss.getId()
  });

  Logger.log('ROOT_FOLDER_ID=' + rootFolder.getId());
  Logger.log('ROOT_FOLDER_URL=' + rootFolder.getUrl());
  Logger.log('SHEET_ID=' + ss.getId());
  Logger.log('SHEET_URL=' + ss.getUrl());
  return { rootFolderId: rootFolder.getId(), sheetId: ss.getId(), sheetUrl: ss.getUrl() };
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : 'ping';
  if (action === 'ping') {
    return jsonOut_({ ok: true, service: 'PTA_SPCK_Drive_API', version: '3.0' });
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
  var names = [];
  for (var i = 1; i < rows.length; i++) {
    var nm = String(rows[i][1] || '').trim();
    if (nm) names.push(nm);
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

  if (!found && !studentFolder) {
    return { ok: true, isNew: true, studentKey: info.studentKey, studentName: info.studentName };
  }
  if (!studentFolder) {
    studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, info.studentKey, info.studentName);
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
    isNew: false,
    studentKey: info.studentKey,
    studentName: (found && found.name) || info.studentName,
    latestVersion: (found && found.latestVersion) || (versions.length ? versions[0].version : ''),
    updatedAt: (found && found.updatedAt) || '',
    folderUrl: studentFolder.getUrl(),
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
    var studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, info.studentKey, info.studentName);
    var versionsFolder = findOrCreateFolder_(studentFolder, 'versions');
    var verTag = nextVersionTag_(versionsFolder);
    var now = new Date();
    var stamp = formatStamp_(now);
    var nowIso = formatNow_(now);
    var stateFileName = verTag + '_' + stamp + '_nhap.json';
    var stateFile = versionsFolder.createFile(stateFileName, JSON.stringify(data.state || {}, null, 2), MimeType.PLAIN_TEXT);

    var found = findStudentRow_(sheets.hoSo, info.studentKey);
    upsertStudentRow_(sheets.hoSo, found, {
      studentKey: info.studentKey,
      studentName: info.studentName,
      appName: String(data.appName || '').trim(),
      latestVersion: verTag,
      latestStateFileId: stateFile.getId(),
      folderUrl: studentFolder.getUrl(),
      updatedAt: nowIso
    });

    sheets.history.appendRow([
      verTag, nowIso, info.studentKey, info.studentName,
      'luu-nhap', 'Lưu phiên bản nháp', 0, stateFileName, stateFile.getId(), '', stateFile.getUrl()
    ]);

    return {
      ok: true,
      version: verTag,
      savedAt: nowIso,
      folderUrl: studentFolder.getUrl(),
      versions: listVersionFiles_(studentFolder),
      filesByWeek: listFilesByWeek_(studentFolder)
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
    var studentFolder = getOrCreateStudentFolder_(cfg.rootFolder, info.studentKey, info.studentName);
    var versionsFolder = findOrCreateFolder_(studentFolder, 'versions');
    var verTag = nextVersionTag_(versionsFolder);
    var now = new Date();
    var stamp = formatStamp_(now);
    var nowIso = formatNow_(now);

    var stateFileName = verTag + '_' + stamp + '_' + target + '.json';
    var stateFile = versionsFolder.createFile(stateFileName, JSON.stringify(data.state || {}, null, 2), MimeType.PLAIN_TEXT);

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
      folderUrl: studentFolder.getUrl(),
      updatedAt: nowIso
    });
    sheets.hoSo.getRange(rowIndex, spec.col).setValue(verTag + ' (' + nowIso + ')');

    sheets.history.appendRow([
      verTag, nowIso, info.studentKey, info.studentName,
      target, 'Nộp bài ' + target, fileUrls.length, stateFileName, stateFile.getId(),
      String(data.aiLog || ''), fileUrls.join('\n')
    ]);

    return {
      ok: true,
      version: verTag,
      status: 'Đã lưu ' + verTag,
      submittedAt: nowIso,
      filesCount: fileUrls.length,
      folderUrl: verFolder.getUrl(),
      versions: listVersionFiles_(studentFolder),
      filesByWeek: listFilesByWeek_(studentFolder)
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
  var def1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (def1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(def1); } catch (e) {}
  }
  return { hoSo: hoSo, history: history };
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

function parseStudentName_(rawName) {
  var studentName = String(rawName || '').trim().replace(/\s+/g, ' ');
  var key = studentSlug_(studentName);
  if (!studentName || studentName.length < 2 || !key) {
    throw new Error('Hãy nhập Họ và tên đầy đủ của em (tối thiểu 2 ký tự).');
  }
  return { studentName: studentName, studentKey: key };
}

function studentSlug_(s) {
  return String(s || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function getOrCreateStudentFolder_(rootFolder, studentKey, studentName) {
  var existing = findExistingStudentFolder_(rootFolder, studentKey);
  if (existing) return existing;
  return rootFolder.createFolder(studentKey + '_' + sanitizePart_(studentName, false));
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
      savedAt: formatNow_(f.getDateCreated()),
      url: f.getUrl()
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
      var df = directFiles.next();
      out[wk].push(fileMeta_(df, 'gốc'));
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
    uploadedAt: formatNow_(f.getDateCreated()),
    viewUrl: f.getUrl()
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
    if (String(vals[i][0] || '') === studentKey) {
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
      info.studentName, info.appName, info.latestVersion, info.latestStateFileId, info.folderUrl
    ]]);
    sheet.getRange(found.row, 11).setValue(info.updatedAt);
    return found.row;
  }
  sheet.appendRow([
    info.studentKey, info.studentName, info.appName, info.latestVersion,
    info.latestStateFileId, info.folderUrl, '', '', '', '', info.updatedAt
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

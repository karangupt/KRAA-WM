/**
 * Workspace Backend — Google Apps Script
 * ------------------------------------------------------------
 * Turns a Google Sheet into a free JSON database for the Workspace app,
 * protected by a password that never gets committed to GitHub.
 *
 * SETUP:
 * 1. Open (or create) a Google Sheet.
 * 2. Extensions > Apps Script, delete starter code, paste this file.
 * 3. Set your password (ONE TIME):
 *      a. In setAppPassword() below, temporarily replace 'CHANGE_ME'
 *         with the password you want.
 *      b. Select setAppPassword from the function dropdown at the
 *         top and click Run (▶). Approve the permissions Google asks for.
 *      c. Check the execution log — it prints "Password set" to confirm.
 *      d. IMPORTANT: change the password text back to 'CHANGE_ME' (or
 *         anything) and save, so your real password never sits in code
 *         that could later be shared or committed anywhere. The actual
 *         password is now stored only in this project's Script
 *         Properties, not in the code itself.
 * 4. Deploy > New deployment > Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Copy the deployment URL into js/sheets-api.js (SHEETS_WEB_APP_URL).
 *
 * Every request from the app must now include a matching token (a
 * SHA-256 hash of the password, computed in the browser) or it is
 * rejected — so even though SHEETS_WEB_APP_URL is visible in your
 * public GitHub repo, nobody can read or write your data without
 * the password.
 */

const PASSWORD_PROPERTY = 'APP_PASSWORD_HASH';
const STOCK_API_KEY_PROPERTY = 'STOCK_API_KEY';

// ---- Run this once manually from the Apps Script editor. ----
function setAppPassword() {
  const password = 'CHANGE_ME'; // <-- put your real password here, run once, then change back
  const hash = sha256(password);
  PropertiesService.getScriptProperties().setProperty(PASSWORD_PROPERTY, hash);
  Logger.log('Password set. Hash stored: ' + hash);
}

// ---- Run this once to enable live stock prices (free key from twelvedata.com). ----
function setStockApiKey() {
  const apiKey = 'PASTE_YOUR_TWELVE_DATA_KEY_HERE'; // <-- sign up free at twelvedata.com, paste key, run once
  PropertiesService.getScriptProperties().setProperty(STOCK_API_KEY_PROPERTY, apiKey);
  Logger.log('Stock API key saved.');
}

function sha256(text) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return raw.map(b => ((b < 0 ? b + 256 : b).toString(16).padStart(2, '0'))).join('');
}

function isAuthorized(token) {
  const stored = PropertiesService.getScriptProperties().getProperty(PASSWORD_PROPERTY);
  if (!stored) return false; // no password configured yet — deny by default
  return token && token === stored;
}

function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token || '';

  if (!isAuthorized(token)) {
    return jsonResponse({ ok: false, error: 'Unauthorized' });
  }

  if (action === 'ping') {
    return jsonResponse({ ok: true, message: 'Workspace backend is alive' });
  }
  if (action === 'pullAll') {
    return jsonResponse({ ok: true, data: pullAllCollections() });
  }
  if (action === 'stockPrice') {
    return jsonResponse(fetchStockPrice(e.parameter.symbol));
  }
  if (action === 'fxRate') {
    return jsonResponse(fetchFxRate(e.parameter.from, e.parameter.to));
  }
  return jsonResponse({ ok: false, error: 'Unknown action' });
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const token = body.token || '';

  if (!isAuthorized(token)) {
    return jsonResponse({ ok: false, error: 'Unauthorized' });
  }

  if (body.action === 'pushCollection') {
    pushCollection(body.collection, body.records);
    return jsonResponse({ ok: true });
  }
  if (body.action === 'backupToDrive') {
    return jsonResponse(saveBackupToDrive(body.data));
  }
  return jsonResponse({ ok: false, error: 'Unknown action' });
}

function fetchStockPrice(symbol) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(STOCK_API_KEY_PROPERTY);
  if (!apiKey) return { ok: false, error: 'Stock API key not configured — run setStockApiKey() first.' };
  if (!symbol) return { ok: false, error: 'No symbol given' };

  try {
    const url = 'https://api.twelvedata.com/price?symbol=' + encodeURIComponent(symbol) + '&apikey=' + apiKey;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json.price) {
      return { ok: true, price: parseFloat(json.price) };
    }
    return { ok: false, error: json.message || 'Symbol not found' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function fetchFxRate(from, to) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(STOCK_API_KEY_PROPERTY);
  if (!apiKey) return { ok: false, error: 'Stock API key not configured — run setStockApiKey() first.' };
  try {
    const url = 'https://api.twelvedata.com/price?symbol=' + encodeURIComponent(from + '/' + to) + '&apikey=' + apiKey;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json.price) return { ok: true, rate: parseFloat(json.price) };
    return { ok: false, error: json.message || 'Rate not found' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function saveBackupToDrive(data) {
  try {
    const folderName = 'Workspace Backups';
    const folders = DriveApp.getFoldersByName(folderName);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    const tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
    const stamp = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HHmmss');
    const filename = 'Workspace-backup-' + stamp + '.json';
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const file = folder.createFile(filename, content, MimeType.PLAIN_TEXT);
    return { ok: true, fileName: filename, fileUrl: file.getUrl() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function pushCollection(collection, records) {
  const sheet = getSheet(collection);
  sheet.clearContents();
  if (!records || records.length === 0) return;

  const headers = Object.keys(records[0]);
  sheet.appendRow(headers);
  records.forEach(r => {
    sheet.appendRow(headers.map(h => r[h] !== undefined ? r[h] : ''));
  });
}

function pullAllCollections() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  const tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
  ss.getSheets().forEach(sheet => {
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) { result[sheet.getName()] = []; return; }
    const headers = values[0];
    const rows = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = row[i];
        // Google Sheets auto-converts date-like text (e.g. "2026-07-14") into
        // an actual Date cell. Left as-is, JSON serialization turns that into
        // a UTC timestamp like "2026-07-14T18:30:00.000Z" — wrong date once
        // read back in IST. Convert it back to a clean YYYY-MM-DD string.
        if (v instanceof Date) {
          v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        }
        obj[h] = v;
      });
      return obj;
    });
    result[sheet.getName()] = rows;
  });
  return result;
}

/* Workspace Sheets Sync
   ------------------------------------------------------------
   HOW TO CONNECT GOOGLE SHEETS (free, no hosting cost):

   1. Create a Google Sheet. Name it anything, e.g. "Workspace Database".
   2. In the Sheet, go to Extensions > Apps Script.
   3. Delete any starter code and paste the contents of
      backend/Code.gs (included in this project) into the editor.
   4. Click Deploy > New deployment > select type "Web app".
      - Execute as: Me
      - Who has access: Anyone
   5. Click Deploy, authorize the permissions Google asks for.
   6. Copy the Web App URL you're given and paste it below as
      SHEETS_WEB_APP_URL.
   7. Reload this app. The sync dot in the sidebar turns green
      when the connection works, and all data will read/write
      to your Google Sheet instead of only this browser.

   Until a URL is set, the app runs entirely on localStorage —
   fully usable, just single-device.
*/

const SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwJTj3UebiT22BKSPf3By670b0RnzZOCUQPp57Qpy35xvEZ5eSZ08GWTwc7AUNDHksvvA/exec'; // <-- paste your Apps Script Web App URL here

// This is a SEPARATE password/token from login (login is Supabase Auth
// now). This one just authenticates this app's requests to your Apps
// Script backend. Set it up once in Settings → "Sync with Google Sheets"
// → "Set up Sheets sync token" — it walks you through both sides.
const SHEETS_SYNC_TOKEN = '535e809589857af6afc1aa415696137f14f2acdf1fa5552376dd4eb3003f8590'; // <-- paste the generated hash here (see Settings page)

const SheetsAPI = (() => {
  const isConfigured = () => !!SHEETS_WEB_APP_URL;

  function token() {
    return SHEETS_SYNC_TOKEN || '';
  }

  async function ping() {
    if (!isConfigured()) return false;
    try {
      const res = await fetch(`${SHEETS_WEB_APP_URL}?action=ping&token=${encodeURIComponent(token())}`);
      const json = await res.json();
      return json && json.ok === true;
    } catch (e) {
      return false;
    }
  }

  // Called during login, BEFORE a session token exists yet — so it takes
  // the candidate password hash directly instead of reading Auth.getToken().
  async function verifyToken(candidateHash) {
    try {
      const res = await fetch(`${SHEETS_WEB_APP_URL}?action=ping&token=${encodeURIComponent(candidateHash)}`);
      const json = await res.json();
      return json && json.ok === true;
    } catch (e) {
      console.error('Sheets auth check failed', e);
      return false;
    }
  }

  async function pullAll() {
    if (!isConfigured()) return null;
    try {
      const res = await fetch(`${SHEETS_WEB_APP_URL}?action=pullAll&token=${encodeURIComponent(token())}`);
      const json = await res.json();
      if (!json.ok) { console.warn('Sheets pull rejected:', json.error); return null; }
      return json;
    } catch (e) {
      console.error('Sheets pull failed', e);
      return null;
    }
  }

  async function pushCollection(collection, records) {
    if (!isConfigured()) return false;
    try {
      const res = await fetch(SHEETS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // avoids CORS preflight on Apps Script
        body: JSON.stringify({ action: 'pushCollection', collection, records, token: token() })
      });
      const json = await res.json();
      return json && json.ok === true;
    } catch (e) {
      console.error('Sheets push failed', e);
      return false;
    }
  }

  async function fetchStockPrice(symbol) {
    if (!isConfigured()) return { ok: false, error: 'Sheets not connected' };
    try {
      const res = await fetch(`${SHEETS_WEB_APP_URL}?action=stockPrice&symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token())}`);
      return await res.json();
    } catch (e) {
      console.error('Stock price fetch failed', e);
      return { ok: false, error: 'Network error' };
    }
  }

  async function fetchFxRate(from, to) {
    if (!isConfigured()) return { ok: false, error: 'Sheets not connected' };
    try {
      const res = await fetch(`${SHEETS_WEB_APP_URL}?action=fxRate&from=${from}&to=${to}&token=${encodeURIComponent(token())}`);
      return await res.json();
    } catch (e) {
      return { ok: false, error: 'Network error' };
    }
  }

  async function backupToDrive(dataObj) {
    if (!isConfigured()) return { ok: false, error: 'Sheets not connected' };
    try {
      const res = await fetch(SHEETS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'backupToDrive', data: dataObj, token: token() })
      });
      return await res.json();
    } catch (e) {
      return { ok: false, error: 'Network error' };
    }
  }

  return { isConfigured, ping, verifyToken, pullAll, pushCollection, fetchStockPrice, fetchFxRate, backupToDrive };
})();

/* Workspace App — Settings page */

/* ---------- Settings ---------- */
function renderSettingsView() {
  const sheetsOn = SheetsAPI.isConfigured();
  return `
  <div class="card">
    <div class="section-head"><h2>Data backup &amp; restore</h2></div>
    <p style="color:var(--muted); font-size:13px; margin-bottom:14px;">Download a full backup of everything in this app (all modules) as a JSON file. Keep it somewhere safe — you can restore from it any time, on any device.</p>
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn" id="backupBtn">Download backup (.json)</button>
      <label class="btn secondary" style="cursor:pointer;">Restore from file
        <input type="file" id="restoreFile" accept="application/json" style="display:none;">
      </label>
      ${sheetsOn ? `<button class="btn secondary" id="driveBackupBtn">📁 Backup to Google Drive</button>` : ''}
    </div>
    ${sheetsOn ? `<div id="driveBackupStatus" style="margin-top:10px; font-size:12.5px; color:var(--muted);"></div>` : `<p style="color:var(--muted); font-size:11.5px; margin-top:10px;">Backing up straight to Google Drive needs Sheets connected first — see README Part 2.</p>`}
  </div>

  ${sheetsOn ? `
  <div class="card" style="border-left-color:var(--teal);">
    <div class="section-head"><h2>Sync with Google Sheets</h2></div>
    <p style="color:var(--muted); font-size:13px; margin-bottom:14px;">
      Sheets is connected. <strong style="color:var(--text);">Pull latest</strong> loads the newest data from your Sheet into this device (useful mid-session, e.g. after editing from another device). <strong style="color:var(--text);">Push all local data</strong> sends everything on this device up to the Sheet — use this once, right after connecting Sheets for the first time, or if this device has entries the Sheet doesn't.
    </p>
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn secondary" id="pullAllBtn">↓ Pull latest from Sheets</button>
      <button class="btn" id="pushAllBtn">↑ Push all local data to Sheets</button>
    </div>
    <div id="pushAllStatus" style="margin-top:10px; font-size:12.5px; color:var(--muted);"></div>
  </div>
  ` : ''}

  <div class="card" style="border-left-color:var(--teal);">
    <div class="section-head"><h2>Sync with Supabase</h2></div>
    <p style="color:var(--muted); font-size:13px; margin-bottom:14px;">
      This is the real multi-user database (needed for staff logins and role-based access). <strong style="color:var(--text);">Migrate to Supabase</strong> is a one-time step — push everything currently on this device up to Supabase. After that, every login (yours and staff) pulls the latest data automatically, and every save pushes back up. <strong style="color:var(--text);">Pull latest</strong> re-fetches on demand mid-session.
    </p>
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn secondary" id="supaPullBtn">↓ Pull latest from Supabase</button>
      <button class="btn" id="supaMigrateBtn">↑ Migrate / push all local data to Supabase</button>
    </div>
    <div id="supaSyncStatus" style="margin-top:10px; font-size:12.5px; color:var(--muted);"></div>
  </div>

  <div class="card">
    <div class="section-head"><h2>Security</h2></div>
    <p style="color:var(--muted); font-size:13px; margin-bottom:14px;">
      Login mode: <strong style="color:var(--text);">${sheetsOn ? 'Google Sheets (server-side check)' : 'Universal password (client-side hash)'}</strong><br><br>
      ${sheetsOn
        ? 'Password is verified by your Apps Script backend — it is never exposed in this app\'s code.'
        : 'The password is checked against a hash stored in js/auth.js. There\'s no email-based recovery — if forgotten, generate a new hash below (or on the login screen) and update the code with it.'}
    </p>
    <div style="border-top:1px solid var(--line); padding-top:14px;">
      <label style="display:block; font-size:11.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px;">Change / reset password</label>
      <div class="field"><label>New password</label><input type="text" id="chgPwInput" placeholder="e.g. Karan@Projector2027"></div>
      <button class="btn secondary" id="chgPwGenBtn" style="margin-top:8px;">Generate hash</button>
      <div id="chgPwResultField" style="display:none; margin-top:12px;">
        <div class="field"><label>New hash — copy this</label><input type="text" id="chgPwResult" readonly onclick="this.select()"></div>
        <button class="btn secondary" id="chgPwCopyBtn" style="width:100%;">Copy hash</button>
        <p style="color:var(--muted); font-size:11.5px; margin-top:10px; line-height:1.5;">
          ${sheetsOn
            ? 'Paste this into the Apps Script <code>setAppPassword()</code> hash property (or run setAppPassword() with the plain password instead), then redeploy — see README Part 2.'
            : 'Paste this into <code>js/auth.js</code> as:<br><code>const UNIVERSAL_PASSWORD_HASH = \'paste-here\';</code> then commit &amp; deploy.'}
        </p>
      </div>
    </div>
  </div>

  <div class="card" style="border-color:var(--danger);">
    <div class="section-head"><h2 style="color:var(--danger);">Danger zone</h2></div>
    <p style="color:var(--muted); font-size:13px; margin-bottom:14px;">This permanently deletes every record in every module on this device.</p>
    <button class="btn secondary" id="revealDangerBtn">🔒 Show danger zone</button>
    <div id="dangerZoneContent" style="display:none; margin-top:14px;">
      <p style="color:var(--danger); font-size:12.5px; margin-bottom:12px;">Only do this if you have a backup you trust, or you genuinely want a clean slate. This cannot be undone.</p>
      <button class="btn danger" id="resetBtn">Reset all data</button>
    </div>
  </div>`;
}

function wireSettingsView() {
  const root = $('#viewRoot');

  root.querySelector('#chgPwGenBtn')?.addEventListener('click', async () => {
    const pw = root.querySelector('#chgPwInput').value;
    if (!pw) { alert('Type a new password first.'); return; }
    const hash = await sha256Hex(pw);
    root.querySelector('#chgPwResult').value = hash;
    root.querySelector('#chgPwResultField').style.display = '';
  });

  root.querySelector('#chgPwCopyBtn')?.addEventListener('click', () => {
    const field = root.querySelector('#chgPwResult');
    field.select();
    navigator.clipboard?.writeText(field.value).then(() => {
      const btn = root.querySelector('#chgPwCopyBtn');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy hash'; }, 1500);
    }).catch(() => { document.execCommand('copy'); });
  });

  root.querySelector('#backupBtn')?.addEventListener('click', () => {
    const data = Store.exportJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  root.querySelector('#driveBackupBtn')?.addEventListener('click', async () => {
    const btn = $('#driveBackupBtn');
    const status = $('#driveBackupStatus');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    status.textContent = 'Saving backup to your Google Drive...';
    const data = JSON.parse(Store.exportJSON());
    const result = await SheetsAPI.backupToDrive(data);
    btn.disabled = false;
    btn.textContent = '📁 Backup to Google Drive';
    if (result && result.ok) {
      status.innerHTML = `Saved as <strong style="color:var(--text);">${result.fileName}</strong> in a "Workspace Backups" folder in your Drive. <a href="${result.fileUrl}" target="_blank" rel="noopener" style="color:var(--amber);">Open file ↗</a>`;
    } else {
      status.textContent = 'Backup failed: ' + (result?.error || 'unknown error');
    }
  });

  root.querySelector('#restoreFile')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('This will REPLACE all current data on this device with the contents of the backup file. This cannot be undone. Continue?')) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(reader.result);
        alert('Backup restored successfully.');
        render();
      } catch (err) {
        alert('Could not read this file — make sure it\'s a Workspace backup .json. ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  root.querySelector('#pullAllBtn')?.addEventListener('click', async () => {
    const btn = $('#pullAllBtn');
    const status = $('#pushAllStatus');
    btn.disabled = true;
    btn.textContent = 'Pulling...';
    status.textContent = 'Fetching latest data from Google Sheets...';
    await pullFromSheetsIntoStore();
    btn.disabled = false;
    btn.textContent = '↓ Pull latest from Sheets';
    status.textContent = 'Done — this device now has the latest data from your Sheet.';
    render();
  });

  root.querySelector('#pushAllBtn')?.addEventListener('click', async () => {
    const btn = $('#pushAllBtn');
    const status = $('#pushAllStatus');
    btn.disabled = true;
    btn.textContent = 'Pushing...';
    const collections = [...new Set(Object.values(MODULES).map(m => m.collection))];
    let done = 0, failed = [];
    for (const col of collections) {
      const records = Store.all(col);
      const ok = await SheetsAPI.pushCollection(col, records);
      if (ok) done++; else failed.push(col);
      status.textContent = `Pushing ${done + failed.length} of ${collections.length} sheets...`;
    }
    btn.disabled = false;
    btn.textContent = 'Push all local data to Sheets';
    status.textContent = failed.length
      ? `Done, but ${failed.length} sheet(s) failed: ${failed.join(', ')}. Check your Apps Script deployment.`
      : `All ${done} sheets pushed successfully.`;
  });

  root.querySelector('#supaPullBtn')?.addEventListener('click', async () => {
    const btn = $('#supaPullBtn');
    const status = $('#supaSyncStatus');
    btn.disabled = true;
    btn.textContent = 'Pulling...';
    status.textContent = 'Fetching latest data from Supabase...';
    await pullFromSupabaseIntoStore();
    btn.disabled = false;
    btn.textContent = '↓ Pull latest from Supabase';
    status.textContent = 'Done — this device now has the latest data from Supabase.';
    render();
  });

  root.querySelector('#supaMigrateBtn')?.addEventListener('click', async () => {
    const btn = $('#supaMigrateBtn');
    const status = $('#supaSyncStatus');
    btn.disabled = true;
    const collections = [...new Set(Object.values(MODULES).map(m => m.collection))];
    let done = 0, failed = [];
    for (const col of collections) {
      const records = Store.all(col);
      const result = await SupabaseSync.pushCollection(col, records);
      if (result.ok) done++; else failed.push(col);
      status.textContent = `Pushing ${done + failed.length} of ${collections.length} collections...`;
    }
    btn.disabled = false;
    btn.textContent = '↑ Migrate / push all local data to Supabase';
    status.textContent = failed.length
      ? `Done, but ${failed.length} collection(s) failed: ${failed.join(', ')}. Check the browser console for details.`
      : `All ${done} collections migrated to Supabase successfully.`;
  });

  root.querySelector('#revealDangerBtn')?.addEventListener('click', () => {
    const content = $('#dangerZoneContent');
    const btn = $('#revealDangerBtn');
    content.style.display = '';
    btn.style.display = 'none';
  });

  root.querySelector('#resetBtn')?.addEventListener('click', () => {
    if (!confirm('This permanently deletes ALL data on this device (customers, bookings, invoices, everything). Are you sure?')) return;
    if (!confirm('Last check — this cannot be undone unless you have a backup. Really reset everything?')) return;
    Store.reset();
    render();
  });
}

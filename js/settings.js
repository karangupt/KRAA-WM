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

    <div style="border-top:1px solid var(--line); margin-top:16px; padding-top:14px;">
      <label style="display:block; font-size:11.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px;">Set up / reset Sheets sync token</label>
      <p style="color:var(--muted); font-size:12px; margin-bottom:10px; line-height:1.5;">
        This is separate from your login — it's what lets this app talk to your Apps Script backend. Pick a password below, generate its hash, then put the <strong style="color:var(--text);">plain password</strong> in <code>Code.gs → setAppPassword()</code> (run it once in Apps Script) and the <strong style="color:var(--text);">hash</strong> in <code>js/sheets-api.js → SHEETS_SYNC_TOKEN</code>.
      </p>
      <div class="field"><label>Choose a password</label><input type="text" id="sheetsTokenInput" placeholder="e.g. Workspace2026Sync"></div>
      <button class="btn secondary" id="sheetsTokenGenBtn" style="margin-top:8px;">Generate hash</button>
      <div id="sheetsTokenResultField" style="display:none; margin-top:12px;">
        <div class="field"><label>Hash — paste into js/sheets-api.js (SHEETS_SYNC_TOKEN)</label><input type="text" id="sheetsTokenResult" readonly onclick="this.select()"></div>
      </div>
    </div>
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

  <div class="card" id="teamAccessCard" style="display:none; border-left-color:var(--amber);">
    <div class="section-head"><h2>Team &amp; Access</h2></div>
    <p style="color:var(--muted); font-size:13px; margin-bottom:14px;">
      To add a new team member: create their login in <strong style="color:var(--text);">Supabase Dashboard → Authentication → Users → Add user</strong> (turn on "Auto Confirm User"). Then come back here and set what they can access — no SQL needed.
    </p>
    <div id="teamMembersList" style="color:var(--muted); font-size:13px;">Loading team members...</div>
  </div>

  <div class="card">
    <div class="section-head"><h2>Security</h2></div>
    <p style="color:var(--muted); font-size:13px; margin-bottom:14px;">
      Login mode: <strong style="color:var(--text);">Supabase Auth (per-user email + password)</strong><br><br>
      Each person signs in with their own email and password. Forgotten passwords are reset by the admin (Owner) from the Supabase dashboard — Authentication → Users → select the person → reset password.
    </p>
    <div style="border-top:1px solid var(--line); padding-top:14px;">
      <label style="display:block; font-size:11.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px;">Change your own password</label>
      <div class="field"><label>New password</label><input type="password" id="chgPwInput" placeholder="At least 6 characters" autocomplete="new-password"></div>
      <button class="btn secondary" id="chgPwGenBtn" style="margin-top:8px;">Update password</button>
      <div id="chgPwResultField" style="margin-top:12px; font-size:12.5px;"></div>
    </div>
  </div>

  <div class="card" style="border-left-color:var(--amber);">
    <div class="section-head"><h2>Data maintenance</h2></div>
    <p style="color:var(--muted); font-size:13px; margin-bottom:14px;">
      Grocery used to have "Vegetable" and "Milk &amp; Dairy" as their own separate top-level expense categories, before they became Grocery sub-categories. Any expense entries logged back then are still sitting under those old category names, so they don't get counted as Grocery in Reports. This finds them and moves them under Grocery (with the matching sub-category ticked) — nothing else about the entry changes, and it's safe to run more than once.
    </p>
    <button class="btn secondary" id="migrateGroceryBtn">Fix old Vegetable / Milk &amp; Dairy entries → Grocery</button>
    <div id="migrateGroceryStatus" style="margin-top:10px; font-size:12.5px; color:var(--muted);"></div>
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

  root.querySelector('#sheetsTokenGenBtn')?.addEventListener('click', async () => {
    const pw = root.querySelector('#sheetsTokenInput').value;
    if (!pw) { alert('Type a password first.'); return; }
    const hash = await sha256Hex(pw);
    root.querySelector('#sheetsTokenResult').value = hash;
    root.querySelector('#sheetsTokenResultField').style.display = '';
  });

  root.querySelector('#chgPwGenBtn')?.addEventListener('click', async () => {
    const pw = root.querySelector('#chgPwInput').value;
    const resultBox = root.querySelector('#chgPwResultField');
    if (!pw || pw.length < 6) { resultBox.innerHTML = '<span style="color:var(--danger);">Password must be at least 6 characters.</span>'; return; }
    resultBox.textContent = 'Updating...';
    const { error } = await supabaseClient.auth.updateUser({ password: pw });
    if (error) {
      resultBox.innerHTML = `<span style="color:var(--danger);">${error.message}</span>`;
    } else {
      resultBox.innerHTML = '<span style="color:var(--teal);">Password updated. Use it next time you sign in.</span>';
      root.querySelector('#chgPwInput').value = '';
    }
  });

  // Team & Access — only shown to the Owner
  (async () => {
    const profile = await SupaAuth.getProfile();
    const card = root.querySelector('#teamAccessCard');
    if (!profile || profile.role !== 'owner' || !card) return;
    card.style.display = '';

    const { data: members, error } = await supabaseClient.from('profiles').select('id, full_name, email, role');
    const listEl = root.querySelector('#teamMembersList');
    if (error) { listEl.textContent = 'Could not load team members: ' + error.message; return; }
    if (!members || !members.length) { listEl.textContent = 'No team members yet.'; return; }

    listEl.innerHTML = members.map(m => `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 0; border-top:1px solid var(--line); flex-wrap:wrap;">
        <div>
          <div style="font-size:13.5px;">${m.email || m.full_name || '(no email set — run 05-add-profile-email.sql)'}</div>
          ${m.full_name ? `<div style="font-size:11px; color:var(--muted);">${m.full_name}</div>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <select class="role-select" data-uid="${m.id}" style="padding:6px 10px; border-radius:8px; background:var(--panel-2); color:var(--text); border:1px solid var(--line);">
            ${['owner','manager','staff','family','viewer'].map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
          </select>
          <button class="btn secondary reset-pw-btn" data-uid="${m.id}" data-email="${m.email || ''}" style="padding:6px 10px; font-size:12px;">Reset password</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.reset-pw-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newPw = prompt(`New password for ${btn.dataset.email || btn.dataset.uid}:\n(at least 6 characters)`);
        if (!newPw) return;
        if (newPw.length < 6) { alert('Password must be at least 6 characters.'); return; }
        btn.disabled = true;
        btn.textContent = 'Resetting...';
        try {
          const { data, error } = await supabaseClient.functions.invoke('bright-action', {
            body: { targetUserId: btn.dataset.uid, newPassword: newPw }
          });
          if (error || (data && data.error)) {
            alert('Could not reset password: ' + (error?.message || data.error));
          } else {
            alert('Password reset successfully.');
          }
        } catch (e) {
          alert('Could not reset password: ' + e.message);
        }
        btn.disabled = false;
        btn.textContent = 'Reset password';
      });
    });

    listEl.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        sel.disabled = true;
        const { error: updErr } = await supabaseClient
          .from('profiles')
          .update({ role: sel.value })
          .eq('id', sel.dataset.uid);
        sel.disabled = false;
        if (updErr) alert('Could not update role: ' + updErr.message);
      });
    });
  })();

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

  root.querySelector('#migrateGroceryBtn')?.addEventListener('click', async () => {
    const btn = root.querySelector('#migrateGroceryBtn');
    const status = root.querySelector('#migrateGroceryStatus');
    // Old category name -> which Grocery sub-category it becomes.
    const LEGACY_MAP = { 'Vegetable': 'Fruits & Vegetables', 'Milk & Dairy': 'Milk & Dairy' };
    const expenses = Store.all('expenses');
    const toFix = expenses.filter(e => LEGACY_MAP[e.category]);
    if (!toFix.length) {
      status.textContent = 'Nothing to fix — no old Vegetable / Milk & Dairy entries found.';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Fixing...';
    toFix.forEach(e => {
      const newSub = LEGACY_MAP[e.category];
      const existingSub = Array.isArray(e.subCategory) ? e.subCategory : [];
      const mergedSub = existingSub.includes(newSub) ? existingSub : [...existingSub, newSub];
      Store.update('expenses', e.id, { category: 'Grocery', subCategory: mergedSub });
    });
    await syncCollection('expense');
    btn.disabled = false;
    btn.textContent = 'Fix old Vegetable / Milk & Dairy entries → Grocery';
    status.textContent = `Done — moved ${toFix.length} old entr${toFix.length === 1 ? 'y' : 'ies'} under Grocery. Check Reports to see the updated total.`;
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

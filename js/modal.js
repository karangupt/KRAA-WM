/* Workspace App — Add/Edit modal (generic form for every module) */

/* ---------- Modal / form ---------- */
function openModal(moduleKey, id) {
  const cfg = MODULES[moduleKey];
  editingContext = { moduleKey, id };
  const record = id ? Store.get(cfg.collection, id) : {};

  $('#modalTitle').textContent = (id ? 'Edit ' : 'Add ') + cfg.title.replace(/s$/, '');

  const form = $('#modalForm');
  form.innerHTML = cfg.fields.map(f => {
    const val = record[f.name] ?? '';
    const wrapAttrs = f.showIf ? `data-showif-field="${f.showIf.field}" data-showif-equals="${f.showIf.equals}"` : '';
    let inner;
    if (f.type === 'select') {
      const opts = f.source ? Store.all(f.source).map(o => ({ value: o.id, label: o[f.optLabel] }))
                             : f.options.map(o => ({ value: o, label: o }));
      inner = `<label>${f.label}</label>
        <select name="${f.name}">
          <option value="">—</option>
          ${opts.map(o => `<option value="${o.value}" ${o.value===val?'selected':''}>${o.label}</option>`).join('')}
        </select>`;
    } else if (f.type === 'textarea') {
      inner = `<label>${f.label}</label>
        <textarea name="${f.name}" rows="5" style="width:100%; background:var(--bg); border:1px solid var(--line); color:var(--text); padding:9px 10px; border-radius:7px; font-size:13.5px; font-family:inherit; resize:vertical;" ${f.required?'required':''}>${val}</textarea>`;
    } else {
      inner = `<label>${f.label}</label>
      <input type="${f.type}" name="${f.name}" value="${val}" ${f.type === 'number' ? 'step="any"' : ''} ${f.required?'required':''}>`;
    }
    return `<div class="field" ${wrapAttrs}>${inner}</div>`;
  }).join('') + `
    <div class="modal-actions">
      <button type="submit" class="btn">Save</button>
      <button type="button" class="btn secondary" id="cancelModal">Cancel</button>
    </div>`;

  // Conditional fields: hide/show based on another field's current value,
  // e.g. "Which credit card?" only appears when Payment Mode = Credit Card.
  const conditionalWraps = form.querySelectorAll('[data-showif-field]');
  function applyConditionalVisibility() {
    conditionalWraps.forEach(wrap => {
      const controllerName = wrap.dataset.showifField;
      const expected = wrap.dataset.showifEquals;
      const controller = form.querySelector(`[name="${controllerName}"]`);
      const match = controller && controller.value === expected;
      wrap.style.display = match ? '' : 'none';
    });
  }
  const controllerNames = new Set(Array.from(conditionalWraps).map(w => w.dataset.showifField));
  controllerNames.forEach(name => {
    const controller = form.querySelector(`[name="${name}"]`);
    controller?.addEventListener('change', applyConditionalVisibility);
  });
  applyConditionalVisibility();

  // Prevent Enter from silently submitting/closing the form while typing —
  // a very easy accidental keypress. Save still works via the button click.
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  });

  form.querySelector('#cancelModal').addEventListener('click', closeModal);
  form.onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const previousRecord = id ? Store.get(cfg.collection, id) : null;
    const saved = id ? Store.update(cfg.collection, id, data) : Store.add(cfg.collection, data);
    if (cfg.onSave) cfg.onSave(saved, previousRecord);
    closeModal();
    render();
    syncCollection(moduleKey);
  };

  $('#modalBackdrop').classList.add('show');
}

function closeModal() {
  $('#modalBackdrop').classList.remove('show');
  editingContext = null;
}

/* ---------- Cloud sync (Sheets + Supabase, best-effort, silent if not configured) ---------- */
async function syncCollection(moduleKey) {
  const cfg = MODULES[moduleKey];
  if (!cfg) return;
  const records = Store.all(cfg.collection);
  if (SheetsAPI.isConfigured()) {
    await SheetsAPI.pushCollection(cfg.collection, records);
  }
  if (typeof SupabaseSync !== 'undefined') {
    await SupabaseSync.pushCollection(cfg.collection, records);
  }
}

async function checkSyncStatus() {
  const dot = $('#syncDot'), title = $('#syncTitle'), sub = $('#syncSub');
  if (!SheetsAPI.isConfigured()) {
    dot.classList.remove('on'); title.textContent = 'Local storage mode'; sub.textContent = 'Sheets not connected';
    return;
  }
  const ok = await SheetsAPI.ping();
  dot.classList.toggle('on', ok);
  title.textContent = ok ? 'Connected to Google Sheets' : 'Sheets connection failed';
  sub.textContent = ok ? 'Cloud backup active' : 'Check Apps Script deployment';
}

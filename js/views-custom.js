/* Workspace App — combined/custom views (Bookings+Payments merged view, view registry) */


const PLACEHOLDER_VIEWS = {
  // Anything not yet built lands here automatically — see catch-all in render().
};

const CUSTOM_VIEWS = {
  reports:         { title: 'Reports',              render: renderReports,  wire: wireReports },
  networth:        { title: 'Net Worth Dashboard',  render: renderNetWorth, wire: wireDashboard },
  invoiceGen:      { title: 'Generate Invoice',     render: renderInvoiceGen, wire: wireInvoiceGen },
  bookingPayments: { title: 'Bookings',             render: renderBookingPayments, wire: wireBookingPayments },
  settings:        { title: 'Settings',             render: renderSettingsView, wire: wireSettingsView }
};

function renderBookingPayments() {
  return `
  <div style="margin-bottom:8px; color:var(--muted); font-size:12px;">Everything from Bookings and Payments, on one page — same Add / Edit / Delete / Columns / Sort options as their own pages.</div>
  <div id="bp_bookingSection">${renderModuleView(MODULES.booking, 'booking')}</div>
  <div style="height:36px;"></div>
  <div style="border-top:1px solid var(--line); margin-bottom:28px;"></div>
  <div id="bp_paymentsSection">${renderModuleView(MODULES.payments, 'payments')}</div>`;
}

function wireBookingPayments() {
  wireModuleView('booking');
  wireModuleView('payments');
}

function tagFor(status) {
  const s = (status || '').toLowerCase();
  const cls = ['paid','confirmed','completed','ok'].includes(s) ? 'ok'
            : ['unpaid','due','overdue','cancelled'].includes(s) ? 'due'
            : 'pending';
  return `<span class="tag ${cls}">${status || '—'}</span>`;
}

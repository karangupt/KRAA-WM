/* Workspace App — Reports, Net Worth dashboard, stock price refresh */

function printAnnualInvoiceList() {
  const invoices = Store.all('invoices');
  const years = [...new Set(invoices.map(i => (i.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const defaultYear = years[0] || todayStr().slice(0, 4);
  const year = prompt(`Print invoice list for which year?${years.length ? ' (years with data: ' + years.join(', ') + ')' : ''}`, defaultYear);
  if (!year) return;

  const yearInvoices = invoices.filter(i => (i.date || '').startsWith(year)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const total = yearInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);

  const html = `
  <div class="invoice-sheet">
    <div class="invoice-title">INVOICE LIST — ${year}</div>
    <div style="margin-bottom:10px;">${COMPANY_INFO.name} — ${COMPANY_INFO.addressLines.join(', ')}</div>
    <table class="invoice-items">
      <thead><tr><th>Number</th><th>Type</th><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>
        ${yearInvoices.map(i => `<tr><td>${i.number}</td><td>${i.docType || 'Invoice'}</td><td>${fmtDate(i.date)}</td><td>${i.customerName || '—'}</td><td>${fmt(i.amount)}</td><td>${i.status}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;"><strong>Total (${yearInvoices.length} invoice${yearInvoices.length===1?'':'s'})</strong></td><td colspan="2"><strong>${fmt(total)}</strong></td></tr></tfoot>
    </table>
  </div>`;

  $('#genericPrintArea').innerHTML = html;
  const originalTitle = document.title;
  document.title = `Invoice List ${year}`;
  window.print();
  setTimeout(() => { document.title = originalTitle; }, 500);
}

async function refreshStockPrices() {
  if (!SheetsAPI.isConfigured()) {
    alert('Live price fetching needs the free Google Sheets backend connected (browsers can\'t call stock market APIs directly). See README Part 3 — Live stock prices.');
    return;
  }
  const btn = $('#refreshPrices');
  const items = Store.all('investments').filter(i => i.ticker);
  if (!items.length) {
    alert('Add a ticker symbol to at least one investment first (e.g. AAPL, TSLA, or an Indian symbol).');
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = '↻ Refreshing...'; }

  // Fetch USD→INR once if any US stocks are present, reuse for all of them.
  let usdInr = null;
  if (items.some(i => i.type === 'US Stock')) {
    const fx = await SheetsAPI.fetchFxRate('USD', 'INR');
    if (fx && fx.ok) usdInr = fx.rate;
  }

  let updated = 0, failed = [];
  for (const item of items) {
    const result = await SheetsAPI.fetchStockPrice(item.ticker);
    if (result && result.ok && result.price) {
      const qty = Number(item.qty || 1);
      let priceInInr = result.price;
      if (item.type === 'US Stock') {
        if (!usdInr) { failed.push(item.ticker + ' (no FX rate)'); continue; }
        priceInInr = result.price * usdInr;
      }
      Store.update('investments', item.id, { current: Math.round(priceInInr * qty) });
      updated++;
    } else {
      failed.push(item.ticker);
    }
  }

  render();
  syncCollection('investments');
  if (btn) { btn.disabled = false; btn.textContent = '↻ Refresh Prices'; }
  if (failed.length) alert(`Updated ${updated} of ${items.length}. Could not fetch: ${failed.join(', ')}`);
}

/* ---------- Reports ---------- */
// Period the Reports page is currently scoped to. Defaults to the running
// month so numbers on load always reflect "this month", per the report
// dashboard requirement. Persist across re-renders while on this page.
let reportsPeriodMode = 'month';                    // 'month' | 'year' | 'all'
let reportsPeriodMonth = todayStr().slice(0, 7);     // 'YYYY-MM'
let reportsPeriodYear = todayStr().slice(0, 4);      // 'YYYY'

// Expense-type filter: lets Personal Expense and Corporate (business)
// Expense be viewed separately across every breakdown on this page.
let reportsTypeFilter = 'all'; // 'all' | 'corporate' | 'personal'

// '' means "All Categories" — previously there was no way to clear a
// category selection back to a combined view once one was picked.
let reportsSelectedCategory = '';

function reportsPeriodLabel() {
  if (reportsPeriodMode === 'all') return 'All Time';
  if (reportsPeriodMode === 'year') return reportsPeriodYear;
  return new Date(reportsPeriodMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function reportsInPeriod(dateStr) {
  if (!dateStr) return false;
  if (reportsPeriodMode === 'all') return true;
  if (reportsPeriodMode === 'year') return dateStr.startsWith(reportsPeriodYear);
  return dateStr.slice(0, 7) === reportsPeriodMonth;
}

function reportsAllYears() {
  const dates = [
    ...Store.all('invoices'), ...Store.all('otherIncome'), ...Store.all('expenses')
  ].map(r => (r.date || '').slice(0, 4)).filter(Boolean);
  const years = [...new Set(dates)].sort().reverse();
  if (!years.includes(reportsPeriodYear)) years.unshift(reportsPeriodYear);
  return years;
}

function reportsFilterByType(list) {
  if (reportsTypeFilter === 'corporate') return list.filter(e => e._expType === 'corporate');
  if (reportsTypeFilter === 'personal') return list.filter(e => e._expType === 'personal');
  return list;
}

function renderReportsPeriodPicker() {
  const years = reportsAllYears();
  return `
  <div class="section-head">
    <h2>Reports — ${reportsPeriodLabel()}</h2>
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <select id="reportsPeriodMode" style="width:auto;">
        <option value="month" ${reportsPeriodMode === 'month' ? 'selected' : ''}>Monthly</option>
        <option value="year" ${reportsPeriodMode === 'year' ? 'selected' : ''}>This Year</option>
        <option value="all" ${reportsPeriodMode === 'all' ? 'selected' : ''}>All Time</option>
      </select>
      ${reportsPeriodMode === 'month' ? `<input type="month" id="reportsPeriodMonth" value="${reportsPeriodMonth}" style="width:auto;" title="Pick any month — defaults to the current one">` : ''}
      ${reportsPeriodMode === 'year' ? `<select id="reportsPeriodYear" style="width:auto;">${years.map(y => `<option value="${y}" ${y === reportsPeriodYear ? 'selected' : ''}>${y}</option>`).join('')}</select>` : ''}
    </div>
  </div>`;
}

function renderCategoryMonthlyBreakdown(expenses, yearKey) {
  const filtered = reportsFilterByType(expenses);
  const categories = [...new Set(filtered.map(e => e.category || 'Uncategorised'))].sort();
  // Reset to "All Categories" only if the previously selected category no
  // longer exists in this filtered set — '' itself is always a valid choice.
  if (reportsSelectedCategory && !categories.includes(reportsSelectedCategory)) {
    reportsSelectedCategory = '';
  }
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyTotals = monthNames.map((_, i) => {
    const mk = `${yearKey}-${String(i + 1).padStart(2, '0')}`;
    return filtered
      .filter(e => (reportsSelectedCategory === '' || (e.category || 'Uncategorised') === reportsSelectedCategory) && (e.date || '').startsWith(mk))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
  });
  const yearTotal = monthlyTotals.reduce((s, a) => s + a, 0);

  return `
  <div class="card">
    <div class="section-head">
      <h2>Category-wise monthly breakdown — ${yearKey}</h2>
      <select id="reportsCategorySelect" style="width:auto;">
        <option value="" ${reportsSelectedCategory === '' ? 'selected' : ''}>All Categories</option>
        ${categories.map(c => `<option value="${c}" ${c === reportsSelectedCategory ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    ${categories.length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr>${monthNames.map(m => `<th>${m}</th>`).join('')}<th>Total</th></tr></thead>
      <tbody><tr>${monthlyTotals.map(a => `<td>${a > 0 ? fmt(a) : '—'}</td>`).join('')}<td><strong>${fmt(yearTotal)}</strong></td></tr></tbody>
    </table></div>
    <p style="color:var(--muted); font-size:12px; margin-top:10px;">${reportsSelectedCategory ? `Showing "${reportsSelectedCategory}" only — pick "All Categories" above to see the combined total.` : `Showing all categories combined for ${yearKey}. Pick a category above to drill into just that one.`}</p>
    ` : `<div class="empty-state"><div class="glyph"><i data-lucide="receipt"></i></div>No expenses logged yet.</div>`}
  </div>`;
}

function renderReports() {
  const invoices = Store.all('invoices');
  const bookings = Store.all('bookings');
  const otherIncome = Store.all('otherIncome');
  const creditCards = Store.all('creditCards');

  // Corporate vs Personal is a field on each expense record (expenseType),
  // not a separate collection — every expense lives in Store 'expenses'.
  // A missing/blank expenseType defaults to Corporate, matching how the
  // Expenses module itself displays it (render: v => v || 'Corporate').
  const allExpenses = Store.all('expenses').map(e => ({
    ...e,
    _expType: e.expenseType === 'Personal' ? 'personal' : 'corporate'
  }));
  const corporateExpenses = allExpenses.filter(e => e._expType === 'corporate');
  const personalExpenses = allExpenses.filter(e => e._expType === 'personal');

  const periodInvoices = invoices.filter(i => reportsInPeriod(i.date));
  const periodOtherIncome = otherIncome.filter(o => reportsInPeriod(o.date));
  const businessRevenue = periodInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const otherIncomeTotal = periodOtherIncome.reduce((s, o) => s + Number(o.amount || 0), 0);
  const revenue = businessRevenue + otherIncomeTotal;

  const periodCorporateExpenses = corporateExpenses.filter(e => reportsInPeriod(e.date));
  const periodPersonalExpenses = personalExpenses.filter(e => reportsInPeriod(e.date));
  const corporateTotal = periodCorporateExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const personalTotal = periodPersonalExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExpenses = corporateTotal + personalTotal;
  const profit = revenue - totalExpenses;

  // Outstanding Payments now reflects money Karan owes (credit card dues),
  // not money customers owe him — previously this pulled from unpaid
  // invoice balances, which was the wrong source.
  const outstanding = creditCards.reduce((s, c) => s + Number(c.dueAmount || 0), 0);

  const periodExpensesByType = reportsFilterByType([...periodCorporateExpenses, ...periodPersonalExpenses]);
  const expenseByCategoryPeriod = {};
  periodExpensesByType.forEach(e => {
    const cat = e.category || 'Uncategorised';
    expenseByCategoryPeriod[cat] = (expenseByCategoryPeriod[cat] || 0) + Number(e.amount || 0);
  });
  const catRowsPeriod = Object.entries(expenseByCategoryPeriod).sort((a, b) => b[1] - a[1]);

  const allExpensesByType = reportsFilterByType(allExpenses);
  const expenseByCategoryAll = {};
  allExpensesByType.forEach(e => {
    const cat = e.category || 'Uncategorised';
    expenseByCategoryAll[cat] = (expenseByCategoryAll[cat] || 0) + Number(e.amount || 0);
  });
  const catRowsAll = Object.entries(expenseByCategoryAll).sort((a, b) => b[1] - a[1]);

  const incomeBySource = {};
  periodOtherIncome.forEach(o => { incomeBySource[o.type || 'Other'] = (incomeBySource[o.type || 'Other'] || 0) + Number(o.amount || 0); });
  const incomeRows = Object.entries(incomeBySource).sort((a, b) => b[1] - a[1]);

  const statusCounts = {};
  bookings.forEach(b => { statusCounts[b.status || 'unknown'] = (statusCounts[b.status || 'unknown'] || 0) + 1; });

  const breakdownYear = reportsPeriodMode === 'year' ? reportsPeriodYear : todayStr().slice(0, 4);

  return `
  ${renderReportsPeriodPicker()}

  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value">${fmt(revenue)}</div><div class="kpi-sub">Business ${fmt(businessRevenue)} + Other Income ${fmt(otherIncomeTotal)}</div></div>
    <div class="kpi"><div class="kpi-label">Corporate Expense</div><div class="kpi-value">${fmt(corporateTotal)}</div><div class="kpi-sub">${reportsPeriodLabel()}</div></div>
    <div class="kpi"><div class="kpi-label">Personal Expense</div><div class="kpi-value">${fmt(personalTotal)}</div><div class="kpi-sub">${reportsPeriodLabel()}</div></div>
    <div class="kpi"><div class="kpi-label">Net Profit</div><div class="kpi-value" style="color:${profit >= 0 ? 'var(--teal)' : 'var(--danger)'}">${fmt(profit)}</div><div class="kpi-sub">Revenue − (Corporate + Personal)</div></div>
    <div class="kpi"><div class="kpi-label">Outstanding Payments</div><div class="kpi-value">${fmt(outstanding)}</div><div class="kpi-sub">Total credit card dues</div></div>
  </div>

  <div class="card">
    <div class="section-head">
      <h2>Expenses by category — ${reportsPeriodLabel()}</h2>
      <select id="reportsTypeFilter" style="width:auto;">
        <option value="all" ${reportsTypeFilter === 'all' ? 'selected' : ''}>All Expenses</option>
        <option value="corporate" ${reportsTypeFilter === 'corporate' ? 'selected' : ''}>Corporate Only</option>
        <option value="personal" ${reportsTypeFilter === 'personal' ? 'selected' : ''}>Personal Only</option>
      </select>
    </div>
    ${catRowsPeriod.length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr><th>Category</th><th>Amount</th></tr></thead>
      <tbody>${catRowsPeriod.map(([cat, amt]) => `<tr><td class="name-cell">${cat}</td><td>${fmt(amt)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td><strong>Total</strong></td><td><strong>${fmt(catRowsPeriod.reduce((s, [, a]) => s + a, 0))}</strong></td></tr></tfoot>
    </table></div>` : `<div class="empty-state"><div class="glyph"><i data-lucide="receipt"></i></div>No expenses logged for ${reportsPeriodLabel()} yet.</div>`}
  </div>

  ${renderCategoryMonthlyBreakdown(allExpenses, breakdownYear)}

  <div class="card">
    <div class="section-head"><h2>Expenses by category — All Time</h2></div>
    ${catRowsAll.length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr><th>Category</th><th>Amount</th></tr></thead>
      <tbody>${catRowsAll.map(([cat, amt]) => `<tr><td class="name-cell">${cat}</td><td>${fmt(amt)}</td></tr>`).join('')}</tbody>
    </table></div>` : `<div class="empty-state"><div class="glyph"><i data-lucide="receipt"></i></div>No expenses logged yet.</div>`}
  </div>

  <div class="card">
    <div class="section-head"><h2>Other income by source — ${reportsPeriodLabel()}</h2></div>
    ${incomeRows.length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr><th>Source</th><th>Amount</th></tr></thead>
      <tbody>${incomeRows.map(([src, amt]) => `<tr><td class="name-cell">${src}</td><td>${fmt(amt)}</td></tr>`).join('')}</tbody>
    </table></div>` : `<div class="empty-state"><div class="glyph"><i data-lucide="wallet"></i></div>No other income logged for ${reportsPeriodLabel()} yet.</div>`}
  </div>

  <div class="card">
    <div class="section-head"><h2>Bookings by status</h2></div>
    ${Object.keys(statusCounts).length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr><th>Status</th><th>Count</th></tr></thead>
      <tbody>${Object.entries(statusCounts).map(([st, count]) => `<tr><td>${tagFor(st)}</td><td>${count}</td></tr>`).join('')}</tbody>
    </table></div>` : `<div class="empty-state"><div class="glyph"><i data-lucide="calendar-check"></i></div>No bookings logged yet.</div>`}
  </div>`;
}

/* ---------- Net Worth Dashboard ---------- */
function renderNetWorth() {
  const bank = Store.all('bankAccounts');
  const fdrd = Store.all('fdrd');
  const investments = Store.all('investments');
  const assetsRaw = Store.all('assets');

  // Sukanya, Minor and Spouse accounts hold money that isn't really "yours"
  // to count as personal net worth — same exclusion as Available Balance.
  const bankTotal = bank
    .filter(a => !LOCKED_ACCOUNT_TYPES.includes(a.accType))
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const excludedBankTotal = bank
    .filter(a => LOCKED_ACCOUNT_TYPES.includes(a.accType))
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const fdrdTotal = fdrd.reduce((s, a) => s + Number(a.principal || 0), 0);

  // India investments are already stored in ₹. US Stocks are stored in $ and
  // must be converted before they can be added to a ₹ net worth total.
  const indiaInvestTotal = investments.filter(i => i.type !== 'US Stock').reduce((s, a) => s + Number(a.current || 0), 0);
  const usInvestTotal = investments.filter(i => i.type === 'US Stock').reduce((s, a) => s + Number(a.current || 0), 0);
  const usInvestInr = cachedUsdInrRate ? Math.round(usInvestTotal * cachedUsdInrRate) : 0;
  const investTotal = indiaInvestTotal + usInvestInr;

  const liabilities = assetsRaw.filter(a => (a.type || '').startsWith('Liability'));
  const otherAssets = assetsRaw.filter(a => !(a.type || '').startsWith('Liability'));
  const assetsTotal = otherAssets.reduce((s, a) => s + Number(a.value || 0), 0);
  const liabilitiesTotal = liabilities.reduce((s, a) => s + Number(a.value || 0), 0);

  const totalAssets = bankTotal + fdrdTotal + investTotal + assetsTotal;
  const netWorth = totalAssets - liabilitiesTotal;

  const rows = [
    { label: 'Bank Accounts', value: bankTotal },
    { label: 'FD / RD', value: fdrdTotal },
    { label: 'India Investments', value: indiaInvestTotal },
    { label: usInvestTotal > 0 ? `US Stocks ($${usInvestTotal.toLocaleString('en-IN')}${cachedUsdInrRate ? ' @ ₹'+cachedUsdInrRate+'/$' : ', not converted yet'})` : 'US Stocks', value: usInvestInr },
    { label: 'Other Assets', value: assetsTotal },
    { label: 'Liabilities', value: -liabilitiesTotal }
  ];

  return `
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Total Assets</div><div class="kpi-value">${fmt(totalAssets)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Liabilities</div><div class="kpi-value" style="color:var(--danger)">${fmt(liabilitiesTotal)}</div></div>
    <div class="kpi"><div class="kpi-label">Net Worth</div><div class="kpi-value" style="color:var(--teal)">${fmt(netWorth)}</div></div>
  </div>
  ${usInvestTotal > 0 && !cachedUsdInrRate ? `<p style="color:var(--amber); font-size:12.5px; margin-bottom:14px;">⚠ You have $${usInvestTotal.toLocaleString('en-IN')} in US Stocks not yet converted to ₹ — Net Worth above excludes them. <a href="#" id="convertUsdBtn" style="color:var(--amber); text-decoration:underline;">Convert now</a></p>` : ''}
  <div class="card">
    <div class="section-head"><h2>Breakdown</h2></div>
    <div class="table-wrap"><table class="ledger">
      <thead><tr><th>Category</th><th>Amount</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td class="name-cell">${r.label}</td><td style="color:${r.value < 0 ? 'var(--danger)' : 'inherit'}">${fmt(r.value)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p style="color:var(--muted); font-size:12px; margin-top:12px;">Pulled live from Bank Accounts, FD/RD, Investments and Assets &amp; Liabilities — update those modules and this updates automatically.${excludedBankTotal > 0 ? ` Excludes ${fmt(excludedBankTotal)} in Sukanya/Minor/Spouse accounts — that money isn't counted as your personal net worth.` : ''}</p>
  </div>`;
}

function wireReports() {
  const root = $('#viewRoot');
  root.querySelector('#reportsPeriodMode')?.addEventListener('change', (e) => {
    reportsPeriodMode = e.target.value;
    render();
  });
  root.querySelector('#reportsPeriodMonth')?.addEventListener('change', (e) => {
    if (e.target.value) reportsPeriodMonth = e.target.value;
    render();
  });
  root.querySelector('#reportsPeriodYear')?.addEventListener('change', (e) => {
    reportsPeriodYear = e.target.value;
    render();
  });
  root.querySelector('#reportsTypeFilter')?.addEventListener('change', (e) => {
    reportsTypeFilter = e.target.value;
    render();
  });
  root.querySelector('#reportsCategorySelect')?.addEventListener('change', (e) => {
    reportsSelectedCategory = e.target.value;
    render();
  });
}

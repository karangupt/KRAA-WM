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
let reportsSelectedCategory = ''; // persists across re-renders while on the Reports page

function renderCategoryMonthlyBreakdown(expenses, yearKey) {
  const categories = [...new Set(expenses.map(e => e.category || 'Uncategorised'))].sort();
  if (!reportsSelectedCategory || !categories.includes(reportsSelectedCategory)) {
    reportsSelectedCategory = categories[0] || '';
  }
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyTotals = monthNames.map((_, i) => {
    const mk = `${yearKey}-${String(i + 1).padStart(2, '0')}`;
    return expenses
      .filter(e => (e.category || 'Uncategorised') === reportsSelectedCategory && (e.date || '').startsWith(mk))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
  });
  const yearTotal = monthlyTotals.reduce((s, a) => s + a, 0);

  return `
  <div class="card">
    <div class="section-head">
      <h2>Category-wise monthly breakdown — ${yearKey}</h2>
      <select id="reportsCategorySelect" style="width:auto;">
        ${categories.length ? categories.map(c => `<option value="${c}" ${c === reportsSelectedCategory ? 'selected' : ''}>${c}</option>`).join('') : '<option>No expenses yet</option>'}
      </select>
    </div>
    ${categories.length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr>${monthNames.map(m => `<th>${m}</th>`).join('')}<th>Total</th></tr></thead>
      <tbody><tr>${monthlyTotals.map(a => `<td>${a > 0 ? fmt(a) : '—'}</td>`).join('')}<td><strong>${fmt(yearTotal)}</strong></td></tr></tbody>
    </table></div>
    <p style="color:var(--muted); font-size:12px; margin-top:10px;">Select a different category above to see its month-by-month spend for ${yearKey}.</p>
    ` : `<div class="empty-state"><div class="glyph"><i data-lucide="receipt"></i></div>No expenses logged yet.</div>`}
  </div>`;
}

function renderReports() {
  const invoices = Store.all('invoices');
  const payments = Store.all('payments');
  const expenses = Store.all('expenses');
  const bookings = Store.all('bookings');
  const otherIncome = Store.all('otherIncome');

  const businessRevenue = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const otherIncomeTotal = otherIncome.reduce((s, o) => s + Number(o.amount || 0), 0);
  const revenue = businessRevenue + otherIncomeTotal;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const profit = revenue - totalExpenses;

  const paidPerInvoice = {};
  payments.forEach(p => { paidPerInvoice[p.invoiceId] = (paidPerInvoice[p.invoiceId] || 0) + Number(p.amount || 0); });
  const outstanding = invoices.reduce((s, i) => {
    const paid = paidPerInvoice[i.id] || 0;
    const due = Number(i.amount || 0) - paid;
    return s + (due > 0 ? due : 0);
  }, 0);

  const expenseByCategory = {};
  expenses.forEach(e => { expenseByCategory[e.category || 'Uncategorised'] = (expenseByCategory[e.category || 'Uncategorised'] || 0) + Number(e.amount || 0); });
  const catRows = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

  const thisMonthKey = todayStr().slice(0, 7);
  const thisYearKey = todayStr().slice(0, 4);
  const expenseByCategoryMonth = {};
  const expenseByCategoryYear = {};
  expenses.forEach(e => {
    const cat = e.category || 'Uncategorised';
    if ((e.date || '').startsWith(thisMonthKey)) expenseByCategoryMonth[cat] = (expenseByCategoryMonth[cat] || 0) + Number(e.amount || 0);
    if ((e.date || '').startsWith(thisYearKey)) expenseByCategoryYear[cat] = (expenseByCategoryYear[cat] || 0) + Number(e.amount || 0);
  });
  const catRowsMonth = Object.entries(expenseByCategoryMonth).sort((a, b) => b[1] - a[1]);
  const catRowsYear = Object.entries(expenseByCategoryYear).sort((a, b) => b[1] - a[1]);
  const monthLabelText = new Date(thisMonthKey + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const incomeBySource = {};
  otherIncome.forEach(o => { incomeBySource[o.type || 'Other'] = (incomeBySource[o.type || 'Other'] || 0) + Number(o.amount || 0); });
  const incomeRows = Object.entries(incomeBySource).sort((a, b) => b[1] - a[1]);

  const statusCounts = {};
  bookings.forEach(b => { statusCounts[b.status || 'unknown'] = (statusCounts[b.status || 'unknown'] || 0) + 1; });

  return `
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value">${fmt(revenue)}</div><div class="kpi-sub">Business ${fmt(businessRevenue)} + Other Income ${fmt(otherIncomeTotal)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Expenses</div><div class="kpi-value">${fmt(totalExpenses)}</div></div>
    <div class="kpi"><div class="kpi-label">Net Profit</div><div class="kpi-value" style="color:${profit >= 0 ? 'var(--teal)' : 'var(--danger)'}">${fmt(profit)}</div></div>
    <div class="kpi"><div class="kpi-label">Outstanding Payments</div><div class="kpi-value">${fmt(outstanding)}</div></div>
  </div>

  <div class="card">
    <div class="section-head"><h2>Expenses by category — ${monthLabelText}</h2></div>
    ${catRowsMonth.length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr><th>Category</th><th>Amount</th></tr></thead>
      <tbody>${catRowsMonth.map(([cat, amt]) => `<tr><td class="name-cell">${cat}</td><td>${fmt(amt)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td><strong>Total</strong></td><td><strong>${fmt(catRowsMonth.reduce((s, [, a]) => s + a, 0))}</strong></td></tr></tfoot>
    </table></div>` : `<div class="empty-state"><div class="glyph"><i data-lucide="receipt"></i></div>No expenses logged this month yet.</div>`}
  </div>

  <div class="card">
    <div class="section-head"><h2>Expenses by category — ${thisYearKey}</h2></div>
    ${catRowsYear.length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr><th>Category</th><th>Amount</th></tr></thead>
      <tbody>${catRowsYear.map(([cat, amt]) => `<tr><td class="name-cell">${cat}</td><td>${fmt(amt)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td><strong>Total</strong></td><td><strong>${fmt(catRowsYear.reduce((s, [, a]) => s + a, 0))}</strong></td></tr></tfoot>
    </table></div>` : `<div class="empty-state"><div class="glyph"><i data-lucide="receipt"></i></div>No expenses logged this year yet.</div>`}
  </div>

  ${renderCategoryMonthlyBreakdown(expenses, thisYearKey)}

  <div class="card">
    <div class="section-head"><h2>Expenses by category — All Time</h2></div>
    ${catRows.length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr><th>Category</th><th>Amount</th></tr></thead>
      <tbody>${catRows.map(([cat, amt]) => `<tr><td class="name-cell">${cat}</td><td>${fmt(amt)}</td></tr>`).join('')}</tbody>
    </table></div>` : `<div class="empty-state"><div class="glyph"><i data-lucide="receipt"></i></div>No expenses logged yet.</div>`}
  </div>

  <div class="card">
    <div class="section-head"><h2>Other income by source</h2></div>
    ${incomeRows.length ? `
    <div class="table-wrap"><table class="ledger">
      <thead><tr><th>Source</th><th>Amount</th></tr></thead>
      <tbody>${incomeRows.map(([src, amt]) => `<tr><td class="name-cell">${src}</td><td>${fmt(amt)}</td></tr>`).join('')}</tbody>
    </table></div>` : `<div class="empty-state"><div class="glyph"><i data-lucide="wallet"></i></div>No other income logged yet.</div>`}
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
  root.querySelector('#reportsCategorySelect')?.addEventListener('change', (e) => {
    reportsSelectedCategory = e.target.value;
    render();
  });
}

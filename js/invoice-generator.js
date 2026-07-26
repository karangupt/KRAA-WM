/* Workspace App — Invoice Generator (printable invoice/quotation builder) */

/* ---------- Invoice Generator ---------- */
function invoiceItemsTotal() {
  return invoiceDraft.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
}

function openInvoiceInGenerator(invoiceId) {
  const rec = Store.get('invoices', invoiceId);
  if (!rec) return;

  if (rec.fullDataJson) {
    try {
      invoiceDraft = JSON.parse(rec.fullDataJson);
    } catch (e) {
      console.error('Could not parse saved invoice data, rebuilding a basic draft instead', e);
    }
  }

  if (!rec.fullDataJson) {
    // Older entry created before this feature existed, or added manually —
    // build a best-effort starting draft from whatever fields it does have.
    const customer = rec.customerId ? Store.get('customers', rec.customerId) : null;
    invoiceDraft = {
      docType: rec.docType || 'Tax Invoice',
      invoiceNo: rec.number || '',
      date: rec.date || todayStr(),
      deliveryDate: '',
      duration: '1 Day Only (Four hours only)',
      customerName: rec.customerName || (customer ? customer.name : ''),
      customerAddress: customer ? (customer.companyName || '') : '',
      deliveryAddress: '',
      sameAsCustomer: true,
      customerGST: customer ? (customer.gst || '') : '',
      customerEmail: customer ? (customer.email || '') : '',
      contactPersonName: '',
      contactPersonNumber: customer ? (customer.phone || '') : '',
      poNumber: '',
      items: [{ desc: 'Rental charges', qty: 1, rate: Number(rec.amount || 0) }],
      paid: rec.status === 'paid',
      paymentMode: 'Cash',
      txnId: '',
      paymentDate: ''
    };
  }

  navigateTo('invoiceGen');
}

function renderInvoiceGen() {
  const total = invoiceItemsTotal();
  return `
  <div id="invoiceGenControls">
    <div class="card">
      <div class="section-head"><h2>1. Document details</h2></div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px;">
        <div class="field"><label>Document type</label>
          <select id="ig_docType">
            <option value="Quotation" ${invoiceDraft.docType==='Quotation'?'selected':''}>Quotation</option>
            <option value="Provisional Invoice" ${invoiceDraft.docType==='Provisional Invoice'?'selected':''}>Provisional Invoice</option>
            <option value="Tax Invoice" ${invoiceDraft.docType==='Tax Invoice'?'selected':''}>Invoice</option>
          </select>
        </div>
        <div class="field"><label>Invoice number</label><input type="text" id="ig_invoiceNo" value="${invoiceDraft.invoiceNo}" placeholder="e.g. PS/2026/068"></div>
        <div class="field"><label>Date</label><input type="date" id="ig_date" value="${invoiceDraft.date}"></div>
        <div class="field"><label>${invoiceDraft.docType === 'Quotation' ? 'Valid until' : 'Delivery date'}</label><input type="date" id="ig_deliveryDate" value="${invoiceDraft.deliveryDate}"></div>
        <div class="field"><label>Duration</label><input type="text" id="ig_duration" value="${invoiceDraft.duration}"></div>
      </div>
    </div>

    <div class="card">
      <div class="section-head"><h2>2. Customer &amp; delivery</h2></div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px;">
        <div class="field"><label>Customer name</label><input type="text" id="ig_customerName" value="${invoiceDraft.customerName}"></div>
        <div class="field"><label>Customer address</label><textarea id="ig_customerAddress" rows="3" style="width:100%; background:var(--bg); border:1px solid var(--line); color:var(--text); padding:9px 10px; border-radius:7px; font-size:13.5px; font-family:inherit;">${invoiceDraft.customerAddress}</textarea></div>
        <div class="field"><label>Customer GST number</label><input type="text" id="ig_customerGST" value="${invoiceDraft.customerGST}" placeholder="e.g. 27AAACL0582H1ZM"></div>
        <div class="field"><label>Customer email</label><input type="text" id="ig_customerEmail" value="${invoiceDraft.customerEmail}"></div>
        <div class="field"><label>Contact person name</label><input type="text" id="ig_contactPersonName" value="${invoiceDraft.contactPersonName}"></div>
        <div class="field"><label>Contact person number</label><input type="text" id="ig_contactPersonNumber" value="${invoiceDraft.contactPersonNumber}"></div>
        <div class="field"><label>PO / Reference number (optional)</label><input type="text" id="ig_poNumber" value="${invoiceDraft.poNumber}" placeholder="Customer's purchase order no."></div>
      </div>
      <label style="display:flex; align-items:center; gap:8px; margin-top:10px; font-size:12.5px; color:var(--muted); cursor:pointer;">
        <input type="checkbox" id="ig_sameAddr" ${invoiceDraft.sameAsCustomer ? 'checked' : ''} style="accent-color:var(--amber);">
        Delivery address same as customer address
      </label>
      <div class="field" id="ig_deliveryAddrField" style="margin-top:10px; ${invoiceDraft.sameAsCustomer ? 'display:none;' : ''}">
        <label>Delivery address</label>
        <textarea id="ig_deliveryAddress" rows="3" style="width:100%; background:var(--bg); border:1px solid var(--line); color:var(--text); padding:9px 10px; border-radius:7px; font-size:13.5px; font-family:inherit;">${invoiceDraft.deliveryAddress}</textarea>
      </div>
    </div>

    <div class="card">
      <div class="section-head"><h2>3. Items</h2><button class="btn secondary" id="ig_addItem">+ Add item</button></div>
      <div class="table-wrap"><table class="ledger">
        <thead><tr><th>Description</th><th style="width:80px;">Qty</th><th style="width:120px;">Rate</th><th style="width:120px;">Amount</th><th></th></tr></thead>
        <tbody>
          ${invoiceDraft.items.map((it, i) => `<tr>
            <td><input type="text" data-item-field="desc" data-item-idx="${i}" value="${it.desc}" style="width:100%; background:var(--bg); border:1px solid var(--line); color:var(--text); padding:6px 8px; border-radius:6px; font-size:13px;"></td>
            <td><input type="number" data-item-field="qty" data-item-idx="${i}" value="${it.qty}" style="width:100%; background:var(--bg); border:1px solid var(--line); color:var(--text); padding:6px 8px; border-radius:6px; font-size:13px;"></td>
            <td><input type="number" data-item-field="rate" data-item-idx="${i}" value="${it.rate}" style="width:100%; background:var(--bg); border:1px solid var(--line); color:var(--text); padding:6px 8px; border-radius:6px; font-size:13px;"></td>
            <td class="name-cell">${fmt((Number(it.qty)||0)*(Number(it.rate)||0))}</td>
            <td><button data-remove-item="${i}" style="background:none; border:none; color:var(--danger); cursor:pointer; display:flex; align-items:center;"><i data-lucide="x" style="width:14px;height:14px;"></i></button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <p style="text-align:right; margin-top:10px; font-family:var(--font-mono); font-size:15px;">Total: <strong style="color:var(--amber);">${fmt(total)}</strong></p>
    </div>

    ${invoiceDraft.docType !== 'Quotation' ? `
    <div class="card">
      <div class="section-head"><h2>4. Payment</h2></div>
      <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--muted); cursor:pointer;">
        <input type="checkbox" id="ig_paid" ${invoiceDraft.paid ? 'checked' : ''} style="accent-color:var(--amber);">
        Mark as PAID (adds a payment confirmation block + stamp)
      </label>
      <div id="ig_paidFields" style="display:${invoiceDraft.paid ? '' : 'none'}; margin-top:14px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px;">
          <div class="field"><label>Payment mode</label>
            <select id="ig_paymentMode">
              ${['Cash','UPI','Bank Transfer','Cheque','Credit Card'].map(m => `<option value="${m}" ${invoiceDraft.paymentMode===m?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Payment received on</label><input type="date" id="ig_paymentDate" value="${invoiceDraft.paymentDate}"></div>
          <div class="field" id="ig_txnIdField" style="${invoiceDraft.paymentMode === 'Cash' ? 'display:none;' : ''}">
            <label>Transaction ID / Reference No.</label>
            <input type="text" id="ig_txnId" value="${invoiceDraft.txnId || ''}" placeholder="UTR / UPI Ref / Cheque No.">
          </div>
        </div>
      </div>
    </div>` : ''}

    <div style="display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap;">
      <button class="btn" id="ig_generate">Generate preview</button>
      <button class="btn secondary" id="ig_print">🖨 Print / Save as PDF</button>
      <button class="btn secondary" id="ig_saveRecord">💾 Save to Invoice records</button>
    </div>
    <p id="ig_saveStatus" style="color:var(--muted); font-size:12px; margin-top:-14px; margin-bottom:24px;"></p>
  </div>

  <div id="invoicePrintArea">${renderInvoicePrintable()}</div>`;
}

function renderInvoicePrintable() {
  const total = invoiceItemsTotal();
  const deliveryAddr = invoiceDraft.sameAsCustomer ? invoiceDraft.customerAddress : invoiceDraft.deliveryAddress;
  const title = invoiceDraft.docType === 'Quotation' ? 'QUOTATION'
    : invoiceDraft.docType === 'Provisional Invoice' ? 'PROVISIONAL INVOICE – CUM – DELIVERY CHALLAN'
    : 'INVOICE – CUM – DELIVERY CHALLAN';

  // UPI payment QR — scanning it opens the customer's UPI app (GPay/PhonePe/
  // etc.) with the payee, amount, and invoice number already filled in.
  // Not shown on Quotations, since there's nothing to pay yet.
  const upiUri = `upi://pay?pa=${encodeURIComponent(COMPANY_INFO.upiId)}&pn=${encodeURIComponent(COMPANY_INFO.name)}&am=${encodeURIComponent(total)}&cu=INR&tn=${encodeURIComponent('Invoice ' + (invoiceDraft.invoiceNo || ''))}`;
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(upiUri)}`;

  return `
  <div class="invoice-sheet">
    <div class="invoice-title">${title}</div>
    <div class="invoice-header-row">
      <div class="invoice-company">
        <div class="invoice-company-name">${COMPANY_INFO.name}</div>
        <div>${COMPANY_INFO.tagline}</div>
        ${COMPANY_INFO.addressLines.map(l => `<div>${l}</div>`).join('')}
        <div>Mobile: ${COMPANY_INFO.mobile}</div>
        <div>Email: ${COMPANY_INFO.email}</div>
        <div style="margin-top:6px;">Udyam Registration No.: ${COMPANY_INFO.udyam}</div>
        <div>GSTIN: ${COMPANY_INFO.gstNote}</div>
      </div>
      <div class="invoice-meta">
        <table>
          <tr><td>Invoice No:</td><td>${invoiceDraft.invoiceNo || '—'}</td></tr>
          <tr><td>Dated:</td><td>${fmtDate(invoiceDraft.date)}</td></tr>
          <tr><td>${invoiceDraft.docType === 'Quotation' ? 'Valid Until:' : 'Delivery Dated:'}</td><td>${fmtDate(invoiceDraft.deliveryDate)}</td></tr>
          <tr><td>Duration:</td><td>${invoiceDraft.duration}</td></tr>
        </table>
      </div>
    </div>

    <div class="invoice-addr-row">
      <div><strong>Customer Details / Bill To:</strong><br>${invoiceDraft.customerName}<br>${(invoiceDraft.customerAddress||'').replace(/\n/g,'<br>')}
        ${invoiceDraft.customerGST ? `<br>GSTIN: ${invoiceDraft.customerGST}` : ''}
        ${invoiceDraft.customerEmail ? `<br>Email: ${invoiceDraft.customerEmail}` : ''}
        ${invoiceDraft.contactPersonName ? `<br>Contact: ${invoiceDraft.contactPersonName}${invoiceDraft.contactPersonNumber ? ' (' + invoiceDraft.contactPersonNumber + ')' : ''}` : ''}
        ${!invoiceDraft.contactPersonName && invoiceDraft.contactPersonNumber ? `<br>Contact No.: ${invoiceDraft.contactPersonNumber}` : ''}
        ${invoiceDraft.poNumber ? `<br>PO/Ref No.: ${invoiceDraft.poNumber}` : ''}
      </div>
      <div><strong>${invoiceDraft.docType === 'Quotation' ? 'Site / Venue Address:' : 'Delivery Address:'}</strong><br>${(deliveryAddr||'').replace(/\n/g,'<br>')}</div>
    </div>

    <table class="invoice-items">
      <thead><tr><th>SI No</th><th>Description of Goods</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>
        ${invoiceDraft.items.map((it, i) => `<tr><td>${i+1}</td><td>${it.desc}</td><td>${it.qty}</td><td>${it.rate ? fmt(it.rate) : ''}</td><td>${fmt((Number(it.qty)||0)*(Number(it.rate)||0))}</td></tr>`).join('')}
        ${Array.from({length: Math.max(0, 6 - invoiceDraft.items.length)}).map(() => `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>`).join('')}
        ${invoiceDraft.paid && invoiceDraft.docType !== 'Quotation' ? `<tr><td colspan="5" style="padding-top:16px;">
          <strong>Payment Confirmation</strong><br>
          This is to confirm that payment against the below invoice has been successfully received.<br><br>
          <em>Invoice No.: ${invoiceDraft.invoiceNo}<br>
          Invoice Amount: ${fmt(total)}<br>
          Payment Mode: ${invoiceDraft.paymentMode}<br>
          Payment Received On: ${fmtDate(invoiceDraft.paymentDate)}<br>
          ${invoiceDraft.paymentMode !== 'Cash' && invoiceDraft.txnId ? `Transaction ID: ${invoiceDraft.txnId}<br>` : ''}
          Status: PAID</em>
        </td></tr>` : ''}
      </tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;"><strong>Total</strong></td><td><strong>${fmt(total)}</strong></td></tr></tfoot>
    </table>

    <div class="invoice-words-row">
      <div>Amount Chargeable (in words)<br><strong>Indian Rupees: ${numToWordsIndian(total)} Only</strong></div>
      <div style="text-align:right;">E. &amp; O.E</div>
    </div>

    <div class="invoice-terms">
      <strong>Terms &amp; Conditions:</strong>
      <ol>${(invoiceDraft.docType === 'Quotation' ? [`This quotation is valid until ${fmtDate(invoiceDraft.deliveryDate) !== '—' ? fmtDate(invoiceDraft.deliveryDate) : 'the date mentioned above'}. Prices and equipment availability are subject to confirmation after this date.`] : []).concat(INVOICE_TERMS).map(t => `<li>${t}</li>`).join('')}</ol>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:12px;">
        <div>
          <strong>Mode of Payment: Only Digital Payments Accepted (Bank Transfer / UPI / NEFT / RTGS). Cash Payment Not Accepted.</strong><br>
          GPay: UPI ID: ${COMPANY_INFO.upiId}<br>
          Online Payment Link: <a href="${COMPANY_INFO.paymentLink}">${COMPANY_INFO.paymentLink}</a><br>
          *If payment is made using a Credit Card, an additional 2.5% processing charge will be applicable
        </div>
        ${invoiceDraft.docType !== 'Quotation' ? `
        <div style="text-align:center; flex-shrink:0;">
          <img src="${qrImgUrl}" alt="Scan to Pay via UPI" style="width:100px; height:100px;">
          <div style="font-size:9px; color:#666; margin-top:2px;">Scan to Pay via UPI</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="invoice-bank-sign">
      <div>
        <strong>Bank Details: (For Cheque Payment / NEFT / RTGS Transfer)</strong><br>
        Bank Name: ${COMPANY_INFO.bankName}<br>
        A/c No.: ${COMPANY_INFO.bankAccNo}<br>
        A/c Name: ${COMPANY_INFO.bankAccName}<br>
        Branch &amp; IFS Code: ${COMPANY_INFO.bankBranchIfsc}
      </div>
      <div style="text-align:center; position:relative;">
        ${invoiceDraft.paid && invoiceDraft.docType !== 'Quotation' ? `<img src="${PAID_STAMP_IMG}" alt="Paid" style="position:absolute; width:120px; height:120px; left:-90px; top:-8px; opacity:0.88; z-index:2;">` : ''}
        <div>For ${COMPANY_INFO.name}</div>
        <img src="${SIGNATURE_IMG}" alt="Signature" style="height:45px; margin-top:6px;">
        <div style="margin-top:6px;">Authorised Signatory</div>
      </div>
    </div>
  </div>`;
}

function wireInvoiceGen() {
  const root = $('#viewRoot');
  const bind = (id, prop, evt = 'input') => {
    root.querySelector('#' + id)?.addEventListener(evt, (e) => {
      invoiceDraft[prop] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      wireInvoiceGenRefresh();
    });
  };
  root.querySelector('#ig_docType')?.addEventListener('change', (e) => {
    invoiceDraft.docType = e.target.value;
    render();
  });
  bind('ig_invoiceNo', 'invoiceNo');
  bind('ig_date', 'date');
  bind('ig_deliveryDate', 'deliveryDate');
  bind('ig_duration', 'duration');
  bind('ig_customerName', 'customerName');
  bind('ig_customerAddress', 'customerAddress');
  bind('ig_customerGST', 'customerGST');
  bind('ig_customerEmail', 'customerEmail');
  bind('ig_contactPersonName', 'contactPersonName');
  bind('ig_contactPersonNumber', 'contactPersonNumber');
  bind('ig_poNumber', 'poNumber');
  bind('ig_deliveryAddress', 'deliveryAddress');
  bind('ig_paymentMode', 'paymentMode', 'change');
  bind('ig_paymentDate', 'paymentDate');
  bind('ig_txnId', 'txnId');

  root.querySelector('#ig_paymentMode')?.addEventListener('change', (e) => {
    const txnField = root.querySelector('#ig_txnIdField');
    if (txnField) txnField.style.display = e.target.value === 'Cash' ? 'none' : '';
  });

  root.querySelector('#ig_sameAddr')?.addEventListener('change', (e) => {
    invoiceDraft.sameAsCustomer = e.target.checked;
    render();
  });
  root.querySelector('#ig_paid')?.addEventListener('change', (e) => {
    invoiceDraft.paid = e.target.checked;
    render();
  });

  root.querySelectorAll('[data-item-field]').forEach(input => {
    input.addEventListener('input', () => {
      const idx = Number(input.dataset.itemIdx);
      const field = input.dataset.itemField;
      invoiceDraft.items[idx][field] = field === 'desc' ? input.value : Number(input.value);
      wireInvoiceGenRefresh();
    });
  });

  root.querySelector('#ig_addItem')?.addEventListener('click', () => {
    invoiceDraft.items.push({ desc: '', qty: 1, rate: 0 });
    render();
  });

  root.querySelectorAll('[data-remove-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removeItem);
      if (invoiceDraft.items.length > 1) invoiceDraft.items.splice(idx, 1);
      render();
    });
  });

  root.querySelector('#ig_saveRecord')?.addEventListener('click', () => {
    const status = $('#ig_saveStatus');
    if (!invoiceDraft.invoiceNo) {
      status.style.color = 'var(--danger)';
      status.textContent = 'Add an Invoice Number first — it\'s used to find/update the record.';
      return;
    }
    const total = invoiceItemsTotal();
    const existing = Store.all('invoices').find(inv => inv.number === invoiceDraft.invoiceNo);
    // Store both the flat summary fields (used by Dashboard/Reports revenue
    // calculations) AND the full snapshot as JSON, so this exact invoice can
    // be reopened, edited, reprinted, or resent to the customer anytime —
    // nothing is lost after you close this page.
    const record = {
      number: invoiceDraft.invoiceNo,
      date: invoiceDraft.date,
      amount: total,
      status: invoiceDraft.paid ? 'paid' : 'unpaid',
      customerName: invoiceDraft.customerName,
      docType: invoiceDraft.docType,
      fullDataJson: JSON.stringify(invoiceDraft)
    };
    if (existing) {
      Store.update('invoices', existing.id, record);
    } else {
      Store.add('invoices', record);
    }
    syncCollection('invoice');
    status.style.color = 'var(--teal)';
    status.textContent = `Saved (${existing ? 'updated' : 'new'}). Find it anytime in "Quotation & Invoice" — click "Open" on that row to reprint or resend it.`;
  });

  root.querySelector('#ig_generate')?.addEventListener('click', () => {
    $('#invoicePrintArea').innerHTML = renderInvoicePrintable();
    $('#invoicePrintArea').scrollIntoView({ behavior: 'smooth' });
  });

  root.querySelector('#ig_print')?.addEventListener('click', () => {
    $('#invoicePrintArea').innerHTML = renderInvoicePrintable();
    const originalTitle = document.title;
    const cleanName = (invoiceDraft.customerName || 'Invoice').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Invoice';
    document.title = `${cleanName} - ${invoiceDraft.invoiceNo || 'Invoice'}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 500);
  });
}

// Lightweight refresh: just updates the live total/preview without a full
// re-render, so the form doesn't lose focus while typing.
function wireInvoiceGenRefresh() {
  const totalEl = document.querySelector('#invoiceGenControls .card:nth-child(3) p strong');
  if (totalEl) totalEl.textContent = fmt(invoiceItemsTotal());
}

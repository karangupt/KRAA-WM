/* Workspace App — helpers & shared constants (fmt/date helpers, invoice constants, invoice draft) */

/* Workspace App — router + views */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmt = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');

// Display dates as DD-MM-YYYY (Indian convention). Internally everything
// still stores/sorts as YYYY-MM-DD — this only changes what's shown.
const fmtDate = v => {
  if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v)) return v || '—';
  const [y, m, d] = v.slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
};

const fmtByType = (v, type) => (type === 'US Stock' ? '$' : '₹') + (Number(v) || 0).toLocaleString('en-IN');

// Account types that behave like long-term/locked investments — not
// counted in "Available Balance" anywhere in the app. Add more types
// here (e.g. 'PPF') and the exclusion applies everywhere automatically.
const LOCKED_ACCOUNT_TYPES = ['Sukanya Samriddhi', 'Minor Account', 'Spouse Account'];

// ---------- Invoice Generator: company letterhead + fixed content ----------
// Edit these once here to change what appears on every generated invoice.
const PAID_STAMP_IMG = 'data:image/png;base64,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';
const SIGNATURE_IMG = 'data:image/png;base64,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';

const COMPANY_INFO = {
  name: 'PROJECTOR SOLUTIONS',
  tagline: '(Projector Rental & Audio Visual Services)',
  addressLines: [
    'C/o, Gupta Cycle Store, Shop No. 263D, Sector 11,',
    'Juhu Gaon, Vashi, Navi Mumbai – 400703, Maharashtra'
  ],
  mobile: '+91 9819952683 / +91 9820889679',
  email: 'info@projectorsolutions.in | karangupt@gmail.com',
  udyam: 'UDYAM-MH-33-0763833',
  pan: 'AKBPG4758J',
  gstNote: 'Not Applicable (Business exempt under GST threshold limit)',
  bankName: 'IDFC FIRST Bank',
  bankAccNo: '10165752073',
  bankAccName: 'Karan Gupta',
  bankBranchIfsc: 'Pune Branch & IDFB0041352',
  upiId: '9820889679@okbizaxis',
  paymentLink: 'https://razorpay.me/@projectorsolutions'
};

const INVOICE_TERMS = [
  'Pricing: Prices mentioned in the invoice are inclusive of agreed rental charges only.',
  'Payment Terms: Payment is due immediately upon completion of service unless otherwise agreed in writing.',
  'Nature of Service: Equipment is provided strictly on a rental basis.',
  'Equipment Responsibility: Any electrical, physical, liquid, accidental, or mishandling damage to the rented equipment during the rental period shall be chargeable to the customer.',
  'Transportation & Installation: Transportation and installation charges are extra unless explicitly mentioned in the invoice.',
  'Rental charges are applicable for a maximum usage period of 4 hours only. Any additional usage beyond the specified duration will be charged at ₹200 per hour per equipment.',
  'Late Return / Delay: Extra charges may apply if the equipment is retained beyond the agreed rental time.',
  'Power Requirement: Customer must ensure proper electricity and power backup availability at the venue.',
  'Cancellation Policy: Last-minute cancellation after booking confirmation or dispatch may attract rental charges, as the equipment slot is reserved and other bookings may be declined.'
];

function numToWordsIndian(num) {
  num = Math.round(Number(num) || 0);
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function threeDigits(n) {
    if (n < 100) return twoDigits(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
  }
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const rest = num;
  let parts = [];
  if (crore) parts.push(threeDigits(crore) + ' Crore');
  if (lakh) parts.push(threeDigits(lakh) + ' Lakh');
  if (thousand) parts.push(threeDigits(thousand) + ' Thousand');
  if (rest) parts.push(threeDigits(rest));
  return parts.join(' ');
}

let invoiceDraft = {
  docType: 'Provisional Invoice',
  invoiceNo: '',
  date: new Date().toISOString().slice(0, 10),
  deliveryDate: '',
  duration: '1 Day Only (Four hours only)',
  customerName: '',
  customerGST: '',
  customerPAN: '',
  customerEmail: '',
  contactPersonName: '',
  contactPersonNumber: '',
  poNumber: '',
  customerAddress: '',
  deliveryAddress: '',
  placeOfSupply: 'Maharashtra (27)',
  sameAsCustomer: true,
  items: [{ desc: '', qty: 1, rate: 0, gstRate: 18, longDesc: '' }],
  paid: false,
  paymentMode: 'Cash',
  txnId: '',
  paymentDate: ''
};

// Used by the "🖨 Generate New" button on the Invoices list — starts the
// generator with a clean blank draft instead of whatever was last edited.
function resetInvoiceDraft() {
  invoiceDraft = {
    docType: 'Provisional Invoice',
    invoiceNo: '',
    date: new Date().toISOString().slice(0, 10),
    deliveryDate: '',
    duration: '1 Day Only (Four hours only)',
    customerName: '',
    customerGST: '',
    customerPAN: '',
    customerEmail: '',
    contactPersonName: '',
    contactPersonNumber: '',
    poNumber: '',
    customerAddress: '',
    deliveryAddress: '',
    placeOfSupply: 'Maharashtra (27)',
    sameAsCustomer: true,
    items: [{ desc: '', qty: 1, rate: 0, gstRate: 18, longDesc: '' }],
    paid: false,
    paymentMode: 'Cash',
    txnId: '',
    paymentDate: ''
  };
}

const todayStr = () => new Date().toISOString().slice(0,10);

// SHA-256 hex digest via the browser's built-in Web Crypto API.
// Used only for the Google Sheets sync token (Settings → Sync with
// Google Sheets) — nothing to do with login, which is Supabase Auth.
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Module configs: drives generic table + form rendering ---------- */
function invoicePaidSoFar(invoiceId) {
  return Store.all('payments')
    .filter(p => p.invoiceId === invoiceId)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
}

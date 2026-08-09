function generatePrescriptionHTML(data) {
  const rxNo = data.rxNumber || 'RX-0000';
  const patientName = data.patientName || 'Patient';
  const doctorName = data.doctorName || 'Dr. J. Montague, MD';
  const diagnosis = data.diagnosis || 'General Consultation';
  const dateStr = data.date || new Date().toLocaleString();
  const medicines = data.medicines || [];

  const patient = data.patient || {};
  const ageStr = patient.age ? `${patient.age} Yrs` : 'N/A';
  const genderStr = patient.gender || 'N/A';
  const contactStr = patient.contact || 'N/A';
  const emailStr = patient.email || 'N/A';
  const placeStr = patient.place || 'Coimbatore';

  const medRows = medicines.map((med, idx) => {
    const name = med.name || 'Paracetamol';
    const dosage = med.dosage || '1 tablet';
    const freq = med.frequency || 'Daily';
    const duration = med.duration || med.durationDays || 3;
    const foodTag = med.foodInstruction ? `<br><small style="color: #64748b; font-weight: 600;">[ ${med.foodInstruction} ]</small>` : '';
    const suggestedQty = med.originalQty || med.doctorSuggestedQty || med.qty || 1;
    const buyingQty = med.qty || med.finalBuyingQty || 1;

    return `
      <tr>
        <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
        <td><strong>${name}</strong></td>
        <td>${dosage}</td>
        <td>${freq}${foodTag}</td>
        <td style="text-align: center;">${duration} Days</td>
        <td style="text-align: center; color: #64748b;">${suggestedQty}</td>
        <td style="text-align: center;"><span class="badge-qty">${buyingQty}</span></td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Medical Prescription - ${rxNo}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 24px; line-height: 1.5; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; }
    .brand h1 { font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px; }
    .brand p { font-size: 11px; color: #64748b; margin-top: 3px; }
    .doc-type { text-align: right; }
    .doc-type h2 { font-size: 15px; color: #2563eb; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-type p { font-size: 12px; color: #475569; font-weight: 600; margin-top: 3px; }
    
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 22px; }
    .meta-block label { display: block; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-block p { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px; }
    
    .section-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-left: 3.5px solid #2563eb; padding-left: 8px; }
    
    .med-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
    .med-table th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
    .med-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; vertical-align: middle; }
    .med-table tr:nth-child(even) { background: #fafafa; }
    .badge-qty { display: inline-block; background: #eff6ff; color: #2563eb; font-weight: 700; padding: 3px 10px; border-radius: 4px; border: 1px solid #bfdbfe; font-size: 12px; }
    
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .advice { font-size: 11px; color: #64748b; max-width: 320px; line-height: 1.4; }
    .sig-block { text-align: right; }
    .sig-line { border-bottom: 1.5px solid #0f172a; width: 170px; margin-bottom: 6px; display: inline-block; }
    .sig-text { font-size: 11px; font-weight: 700; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>SNS HOSPITAL</h1>
      <p>SNS College of Technology, Saravanampatti, Coimbatore</p>
      <p>Phone: +91 98765 43210 &bull; GSTIN: 33AAAAA0000A1Z5</p>
    </div>
    <div class="doc-type">
      <h2>OFFICIAL PRESCRIPTION</h2>
      <p>Rx Ref: ${rxNo}</p>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <label>Patient Details</label>
      <p>${patientName} (${genderStr}, ${ageStr})</p>
      <p style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">Contact: ${contactStr} &bull; Email: ${emailStr}</p>
      <p style="font-size: 11px; color: #64748b; font-weight: normal;">Location: ${placeStr}</p>
    </div>
    <div class="meta-block">
      <label>Prescribing Doctor & Date</label>
      <p>${doctorName}</p>
      <p style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">Diagnosis: <strong>${diagnosis}</strong></p>
      <p style="font-size: 11px; color: #64748b; font-weight: normal;">Date & Time: ${dateStr}</p>
    </div>
  </div>

  <div class="section-title">Prescribed Medications & Intake Instructions</div>

  <table class="med-table">
    <thead>
      <tr>
        <th style="text-align: center; width: 40px;">S.No</th>
        <th>Medicine Name</th>
        <th>Dosage</th>
        <th>Frequency & Food Timing</th>
        <th style="text-align: center;">Duration</th>
        <th style="text-align: center;">Sugg. Qty</th>
        <th style="text-align: center;">Buying Qty</th>
      </tr>
    </thead>
    <tbody>
      ${medRows}
    </tbody>
  </table>

  <div class="footer">
    <div class="advice">
      <strong>Doctor's Directions:</strong><br>
      Please take prescribed medications regularly. Complete full dosage duration. Store in a cool & dry place.
    </div>
    <div class="sig-block">
      <div class="sig-line"></div><br>
      <span class="sig-text">Authorized Doctor Signature</span>
    </div>
  </div>
</body>
</html>`;
}

function generateBillHTML(data) {
  const rxNo = data.rxNumber || 'RX-0000';
  const invoiceNo = data.invoiceNo || `INV-${rxNo.replace('#', '')}`;
  const patientName = data.patientName || 'Patient';
  const doctorName = data.doctorName || 'Dr. J. Montague, MD';
  const dateStr = data.date || new Date().toLocaleString();
  const medicines = data.medicines || [];

  const patient = data.patient || {};
  const contactStr = patient.contact || 'N/A';
  const emailStr = patient.email || 'N/A';

  let medsSubtotal = 0;

  const itemRows = medicines.map((med, idx) => {
    const name = med.name || 'Paracetamol';
    const qty = parseInt(med.qty || med.finalBuyingQty, 10) || 1;
    const unitPrice = parseFloat(med.unitPrice) || 15;
    const amount = parseFloat(med.amount) || (qty * unitPrice);
    medsSubtotal += amount;

    return `
      <tr>
        <td style="text-align: center; color: #64748b;">${idx + 1}</td>
        <td><strong>${name}</strong></td>
        <td style="text-align: center; font-weight: 600;">${qty}</td>
        <td style="text-align: right;">₹${unitPrice.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700;">₹${amount.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const consultationFee = data.consultationFee !== undefined ? data.consultationFee : 200;
  const dispensingFee = data.dispensingFee !== undefined ? data.dispensingFee : 30;
  const subtotal = medsSubtotal + consultationFee + dispensingFee;
  const taxGst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + taxGst;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pharmacy Bill - ${invoiceNo}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 24px; line-height: 1.5; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 14px; margin-bottom: 20px; }
    .brand h1 { font-size: 22px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px; }
    .brand p { font-size: 11px; color: #64748b; margin-top: 3px; }
    .doc-type { text-align: right; }
    .doc-type h2 { font-size: 15px; color: #059669; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-type p { font-size: 12px; color: #475569; font-weight: 600; margin-top: 3px; }
    
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 22px; }
    .meta-block label { display: block; font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-block p { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px; }
    
    .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    .bill-table th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
    .bill-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; vertical-align: middle; }
    .bill-table tr:nth-child(even) { background: #fafafa; }
    
    .summary-box { margin-left: auto; width: 300px; margin-bottom: 25px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #475569; }
    .summary-row.total { border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 6px; font-size: 15px; font-weight: 800; color: #059669; }
    
    .status-badge { text-align: center; background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: 800; padding: 12px; border-radius: 6px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; margin-top: 30px; }
    .footer-note { text-align: center; font-size: 11px; color: #64748b; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>SNS HOSPITAL PHARMACY</h1>
      <p>SNS College of Technology, Saravanampatti, Coimbatore</p>
      <p>Phone: +91 98765 43210 &bull; GSTIN: 33AAAAA0000A1Z5</p>
    </div>
    <div class="doc-type">
      <h2>OFFICIAL PHARMACY BILL</h2>
      <p>Bill No: ${invoiceNo}</p>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <label>Billed To</label>
      <p>${patientName}</p>
      <p style="font-size: 11px; color: #166534; font-weight: normal; margin-top: 2px;">Contact: ${contactStr} &bull; Email: ${emailStr}</p>
    </div>
    <div class="meta-block">
      <label>Invoice Details</label>
      <p>Rx Ref: ${rxNo}</p>
      <p style="font-size: 11px; color: #166534; font-weight: normal; margin-top: 2px;">Doctor: ${doctorName}</p>
      <p style="font-size: 11px; color: #166534; font-weight: normal;">Date & Time: ${dateStr}</p>
    </div>
  </div>

  <table class="bill-table">
    <thead>
      <tr>
        <th style="text-align: center; width: 40px;">S.No</th>
        <th>Item / Medication Description</th>
        <th style="text-align: center; width: 90px;">Buying Qty</th>
        <th style="text-align: right; width: 90px;">Unit Price</th>
        <th style="text-align: right; width: 110px;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="summary-box">
    <div class="summary-row"><span>Doctor Consultation Fee:</span><span>₹${consultationFee.toFixed(2)}</span></div>
    <div class="summary-row"><span>Pharmacy Dispensing Charge:</span><span>₹${dispensingFee.toFixed(2)}</span></div>
    <div class="summary-row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
    <div class="summary-row"><span>GST Tax (5%):</span><span>₹${taxGst.toFixed(2)}</span></div>
    <div class="summary-row total"><span>GRAND TOTAL:</span><span>₹${grandTotal.toFixed(2)}</span></div>
  </div>

  <div class="status-badge">Payment Status: PAID & DISPENSED</div>
  <div class="footer-note">Thank you for choosing SNS Hospital Pharmacy! Wish you good health.</div>
</body>
</html>`;
}

module.exports = {
  generatePrescriptionHTML,
  generateBillHTML
};

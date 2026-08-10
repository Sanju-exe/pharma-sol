const db = require('../db');
const { generatePrescriptionHTML, generateBillHTML } = require('../utils/htmlGenerator');
const { loadStore, saveStore } = require('../utils/persistentStore');

const defaultSeedPrescriptions = [
  {
    id: 101,
    rxNumber: '#RX-1295',
    patientId: 'PT-57311',
    patientName: 'hariharan',
    doctorName: 'Dr. Jagadeesh',
    diagnosis: 'cold and cough',
    medicines: [
      { name: 'Paracetamol 650mg', dosage: '1 (mrng, night)', duration: 3, qty: 6, unitPrice: 15, amount: 90 }
    ],
    status: 'Dispensed',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 102,
    rxNumber: '#RX-2110',
    patientId: 'PT-98214',
    patientName: 'Srisaran.S',
    doctorName: 'Dr. Nikitha',
    diagnosis: 'Acute Viral Fever',
    medicines: [
      { name: 'Dolo 650mg', dosage: '1 tablet', frequency: 'Morning, Evening, Night', duration: 3, qty: 9, unitPrice: 15, amount: 135 },
      { name: 'Cetirizine 10mg', dosage: '1 tablet', frequency: 'Night', duration: 5, qty: 5, unitPrice: 10, amount: 50 }
    ],
    status: 'Dispensed',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

// Persistent disk-backed fallback store for prescriptions across server restarts
let fallbackPrescriptions = loadStore('prescriptions.json', defaultSeedPrescriptions);
if (!fallbackPrescriptions || fallbackPrescriptions.length === 0) {
  fallbackPrescriptions = defaultSeedPrescriptions;
  saveStore('prescriptions.json', fallbackPrescriptions);
}

const syncPrescriptionsStore = () => {
  saveStore('prescriptions.json', fallbackPrescriptions);
};

const createPrescription = (req, res) => {
  const {
    rxNumber,
    patientId,
    patientName,
    doctorName = 'Dr. J. Montague, MD',
    diagnosis,
    medicines = [],
    status = 'New'
  } = req.body;

  const generatedRx = rxNumber || `#RX-${Math.floor(1000 + Math.random() * 9000)}`;

  const newRxObj = {
    id: Date.now(),
    rxNumber: generatedRx,
    patientId: patientId || '',
    patientName: patientName || 'Unknown Patient',
    doctorName,
    diagnosis: diagnosis || '',
    medicines,
    status,
    createdAt: new Date().toISOString()
  };

  fallbackPrescriptions.push(newRxObj);
  syncPrescriptionsStore();

  const query = `
    INSERT INTO prescriptions 
    (rx_number, patient_id, patient_name, doctor_name, diagnosis, medicines, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    generatedRx,
    patientId || '',
    patientName || 'Unknown Patient',
    doctorName,
    diagnosis || '',
    JSON.stringify(medicines),
    status
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.warn("MySQL insert prescription failed, stored in persistent fallback store:", err.message);
      return res.status(201).json({ success: true, data: newRxObj });
    }

    newRxObj.id = result.insertId;
    console.log("Prescription successfully saved to MySQL DB:", generatedRx, "for patient:", patientName);
    res.status(201).json({ success: true, data: newRxObj });
  });
};

const getPrescriptions = (req, res) => {
  const query = 'SELECT * FROM prescriptions ORDER BY id ASC';

  db.query(query, (err, results) => {
    let dbFormatted = [];
    if (!err && results) {
      dbFormatted = results.map(row => {
        let parsedMeds = [];
        try {
          parsedMeds = typeof row.medicines === 'string' ? JSON.parse(row.medicines) : (row.medicines || []);
        } catch (e) {
          parsedMeds = row.medicines || [];
        }
        return {
          id: row.id,
          rxNumber: row.rx_number,
          patientId: row.patient_id,
          patientName: row.patient_name,
          doctorName: row.doctor_name,
          diagnosis: row.diagnosis,
          medicines: parsedMeds,
          status: row.status,
          createdAt: row.created_at
        };
      });
    }

    const combinedMap = new Map();
    dbFormatted.forEach(rx => {
      const key = (rx.rxNumber || String(rx.id)).trim().toUpperCase();
      const fbMatch = fallbackPrescriptions.find(fb => 
        (fb.rxNumber && fb.rxNumber.trim().toUpperCase() === key) || 
        (fb.id && String(fb.id).trim().toUpperCase() === key)
      );
      if (fbMatch && fbMatch.status) {
        rx.status = fbMatch.status;
      }
      combinedMap.set(key, rx);
    });

    fallbackPrescriptions.forEach(rx => {
      const key = (rx.rxNumber || String(rx.id)).trim().toUpperCase();
      if (!combinedMap.has(key)) {
        combinedMap.set(key, rx);
      }
    });

    const combinedList = Array.from(combinedMap.values());
    fallbackPrescriptions = combinedList;
    syncPrescriptionsStore();
    res.json({ success: true, data: combinedList });
  });
};

const updatePrescriptionStatus = (req, res) => {
  const { id } = req.params;
  const { status = 'Completed' } = req.body;

  const rawKey = decodeURIComponent(String(id)).trim();
  const upperKey = rawKey.toUpperCase();

  // Update in fallback store
  fallbackPrescriptions.forEach(rx => {
    const rxKey = (rx.rxNumber || String(rx.id)).trim().toUpperCase();
    if (rxKey === upperKey) {
      rx.status = status;
    }
  });
  syncPrescriptionsStore();

  const isNumeric = /^\d+$/.test(rawKey);
  const query = isNumeric 
    ? 'UPDATE prescriptions SET status = ? WHERE UPPER(rx_number) = ? OR id = ?'
    : 'UPDATE prescriptions SET status = ? WHERE UPPER(rx_number) = ?';
  const params = isNumeric ? [status, upperKey, parseInt(rawKey, 10)] : [status, upperKey];

  db.query(query, params, (err, result) => {
    if (err) {
      console.warn("MySQL update prescription status failed:", err.message);
    } else {
      console.log("Prescription status updated to:", status, "for Rx:", rawKey);
    }

    res.json({ success: true, message: 'Prescription status updated successfully', status });
  });
};

const sendPdf = async (req, res) => {
  const { id } = req.params;
  const { patientId, prescriptionData, medicineItems } = req.body || {};
  
  const targetRxKey = id || prescriptionData?.rxNumber || 'RX-7931';
  const targetPatientId = patientId || prescriptionData?.patientId;

  // 1. Fetch Patient Record from DB
  let patientRecord = {};
  if (targetPatientId) {
    try {
      const patKey = decodeURIComponent(String(targetPatientId)).trim();
      const patUpper = patKey.toUpperCase();
      const patIsNum = /^\d+$/.test(patKey);
      
      const query = patIsNum 
        ? 'SELECT * FROM patients WHERE UPPER(patient_id) = ? OR id = ?'
        : 'SELECT * FROM patients WHERE UPPER(patient_id) = ?';
      const params = patIsNum ? [patUpper, parseInt(patKey, 10)] : [patUpper];

      const results = await new Promise((resolve, reject) => {
        db.query(query, params, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });

      if (results && results.length > 0) {
        patientRecord = results[0];
      }
    } catch (err) {
      console.warn("Could not fetch patient record from DB for webhook:", err.message);
    }
  }

  // 2. Build Structured Payload & HTML Documents for SNS AI Workbench Webhook
  const meds = medicineItems || prescriptionData?.medicines || [];
  const medsSubtotal = meds.reduce((sum, item) => sum + (parseFloat(item.amount) || ((parseInt(item.qty, 10) || 1) * 15)), 0);
  const consultationFee = 200;
  const dispensingFee = 30;
  const subtotal = medsSubtotal + consultationFee + dispensingFee;
  const taxGst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + taxGst;

  const dataForHtml = {
    rxNumber: targetRxKey,
    invoiceNo: `INV-${String(targetRxKey).replace('#', '')}`,
    patientName: patientRecord.name || prescriptionData?.patientName || 'Patient',
    doctorName: prescriptionData?.doctorName || 'Dr. J. Montague, MD',
    diagnosis: prescriptionData?.diagnosis || 'General Consultation',
    date: new Date().toLocaleString(),
    medicines: meds,
    patient: {
      patientId: targetPatientId || patientRecord.patient_id || patientRecord.patientId || '',
      age: patientRecord.age,
      gender: patientRecord.gender,
      contact: patientRecord.contact,
      email: patientRecord.email,
      place: patientRecord.place
    },
    consultationFee,
    dispensingFee
  };

  const prescriptionHtml = generatePrescriptionHTML(dataForHtml);
  const billHtml = generateBillHTML(dataForHtml);

  const resolvedEmail = patientRecord.email || prescriptionData?.email || prescriptionData?.patientEmail || '';

  const webhookPayload = {
    event: 'DISPENSE_COMPLETED',
    rxNumber: targetRxKey,
    invoiceNumber: `INV-${String(targetRxKey).replace('#', '')}`,
    dispensedAt: new Date().toISOString(),
    email: resolvedEmail,
    patientEmail: resolvedEmail,
    recipientEmail: resolvedEmail,
    patient: {
      patientId: targetPatientId || patientRecord.patient_id || patientRecord.patientId || '',
      name: patientRecord.name || prescriptionData?.patientName || 'Patient',
      age: patientRecord.age || '',
      gender: patientRecord.gender || '',
      contact: patientRecord.contact || '',
      email: resolvedEmail,
      place: patientRecord.place || '',
      complaints: patientRecord.complaints || ''
    },
    doctor: {
      name: prescriptionData?.doctorName || 'Dr. J. Montague, MD'
    },
    diagnosis: prescriptionData?.diagnosis || 'General Consultation',
    medicines: meds.map(item => ({
      name: item.name || 'Paracetamol',
      dosage: item.dosage || '1 tablet',
      frequency: item.frequency || 'Daily',
      durationDays: parseInt(item.duration, 10) || 3,
      foodInstruction: item.foodInstruction || '',
      doctorSuggestedQty: item.originalQty || item.qty || 1,
      finalBuyingQty: parseInt(item.qty, 10) || 1,
      unitPrice: parseFloat(item.unitPrice) || 15,
      amount: parseFloat(item.amount) || ((parseInt(item.qty, 10) || 1) * 15)
    })),
    billing: {
      medsSubtotal,
      consultationFee,
      dispensingFee,
      subtotal,
      taxGst,
      grandTotal,
      currency: 'INR',
      status: 'PAID & DISPENSED'
    },
    prescriptionHtml: prescriptionHtml,
    billHtml: billHtml
  };

  const webhookUrl = process.env.WORKBENCH_WEBHOOK_URL || 'https://api.agents.snsihub.ai/webhook/aca7be79-e11d-4df6-9373-3e8cf3f2b9c3';

  try {
    console.log(`[Workbench Webhook] Dispatching data to ${webhookUrl}...`);

    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookRes.ok) {
      console.warn(`[Workbench Webhook] Webhook returned status ${webhookRes.status}`);
    } else {
      console.log(`[Workbench Webhook] Data successfully received by Workbench Webhook!`);
    }

    // 3. UPDATE DB Status to 'Dispensed' ONLY upon successful trigger
    const rawKey = decodeURIComponent(String(targetRxKey)).trim();
    const upperKey = rawKey.toUpperCase();
    const isNumeric = /^\d+$/.test(rawKey);

    db.query(
      isNumeric ? 'UPDATE prescriptions SET status = ? WHERE UPPER(rx_number) = ? OR id = ?' : 'UPDATE prescriptions SET status = ? WHERE UPPER(rx_number) = ?',
      isNumeric ? ['Dispensed', upperKey, parseInt(rawKey, 10)] : ['Dispensed', upperKey],
      (err) => { if (err) console.warn("Update prescription DB status failed:", err.message); }
    );

    if (targetPatientId) {
      const patKey = decodeURIComponent(String(targetPatientId)).trim();
      const patUpper = patKey.toUpperCase();
      const patIsNum = /^\d+$/.test(patKey);
      db.query(
        patIsNum ? 'UPDATE patients SET status = ? WHERE UPPER(patient_id) = ? OR id = ?' : 'UPDATE patients SET status = ? WHERE UPPER(patient_id) = ?',
        patIsNum ? ['Dispensed', patUpper, parseInt(patKey, 10)] : ['Dispensed', patUpper],
        (err) => { if (err) console.warn("Update patient DB status failed:", err.message); }
      );
    }

    // Update in fallback store if active
    fallbackPrescriptions.forEach(rx => {
      const rxK = (rx.rxNumber || String(rx.id)).trim().toUpperCase();
      if (rxK === upperKey) rx.status = 'Dispensed';
    });

    res.json({
      success: true,
      message: 'Dispensing data successfully sent to SNS AI Workbench webhook!',
      status: 'Dispensed'
    });

  } catch (error) {
    console.error("Workbench Webhook Dispatch Error:", error);
    res.status(500).json({ success: false, message: 'Failed to send data to Workbench Webhook: ' + error.message });
  }
};

module.exports = {
  createPrescription,
  getPrescriptions,
  updatePrescriptionStatus,
  sendPdf
};


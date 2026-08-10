const db = require('../db');
const { loadStore, saveStore } = require('../utils/persistentStore');

const defaultSeedPatients = [
  {
    id: 1,
    patientId: 'PT-57311',
    name: 'hariharan',
    age: '24',
    gender: 'Male',
    contact: '9876543210',
    place: 'Coimbatore',
    temperature: '98.6 °F',
    bloodPressure: '120/80 mmHg',
    recordingDate: new Date().toLocaleDateString(),
    complaints: 'cold and cough',
    status: 'Waiting',
    collected_by: 'Receptionist'
  },
  {
    id: 2,
    patientId: 'PT-98214',
    name: 'Srisaran.S',
    age: '21',
    gender: 'Male',
    contact: '9876543211',
    place: 'Coimbatore',
    temperature: '100.2 °F',
    bloodPressure: '122/82 mmHg',
    recordingDate: new Date().toLocaleDateString(),
    complaints: 'Acute Viral Fever',
    status: 'Waiting',
    collected_by: 'Receptionist'
  }
];

// Persistent disk-backed fallback store to ensure records persist across server restarts
let fallbackPatients = loadStore('patients.json', defaultSeedPatients);
if (!fallbackPatients || fallbackPatients.length === 0) {
  fallbackPatients = defaultSeedPatients;
  saveStore('patients.json', fallbackPatients);
}

const syncPatientsStore = () => {
  saveStore('patients.json', fallbackPatients);
};

const getPatients = (req, res) => {
  const query = 'SELECT * FROM patients ORDER BY id ASC';

  db.query(query, (err, results) => {
    let dbFormatted = [];
    if (!err && results) {
      dbFormatted = results.map(row => ({
        id: row.id,
        patientId: row.patient_id,
        name: row.name,
        age: row.age,
        gender: row.gender,
        contact: row.contact,
        place: row.place,
        temperature: row.temperature,
        bloodPressure: row.blood_pressure,
        recordingDate: row.recording_date,
        complaints: row.complaints,
        status: row.status,
        collected_by: row.collected_by,
        createdAt: row.created_at
      }));
    }

    // Combine DB patients with fallbackPatients memory/disk array, ensuring status updates apply
    const combinedMap = new Map();
    dbFormatted.forEach(p => {
      const key = p.patientId || String(p.id);
      const upperKey = String(key).trim().toUpperCase();
      const fbMatch = fallbackPatients.find(fb => 
        (fb.patientId && String(fb.patientId).trim().toUpperCase() === upperKey) || 
        (fb.id && String(fb.id).trim().toUpperCase() === upperKey)
      );
      if (fbMatch && fbMatch.status) {
        p.status = fbMatch.status;
      }
      combinedMap.set(key, p);
    });

    fallbackPatients.forEach(p => {
      const key = p.patientId || String(p.id);
      if (!combinedMap.has(key)) {
        combinedMap.set(key, p);
      }
    });

    const combinedList = Array.from(combinedMap.values());
    fallbackPatients = combinedList;
    syncPatientsStore();
    res.json({ success: true, data: combinedList });
  });
};

const createPatient = (req, res) => {
  const {
    patientId,
    name,
    age,
    gender,
    contact,
    place,
    temperature,
    bloodPressure,
    recordingDate,
    complaints,
    status = 'Waiting',
    collected_by
  } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Patient name is required' });
  }

  const generatedPatientId = patientId || `PT-${Math.floor(10000 + Math.random() * 90000)}`;

  const newPatientObj = {
    id: Date.now(),
    patientId: generatedPatientId,
    name,
    age: age || '',
    gender: gender || '',
    contact: contact || '',
    place: place || '',
    temperature: temperature || '',
    bloodPressure: bloodPressure || '',
    recordingDate: recordingDate || new Date().toLocaleString(),
    complaints: complaints || '',
    status,
    collected_by: collected_by || 'Unknown',
    createdAt: new Date().toISOString()
  };

  // Keep fallback store in sync and persist to disk
  fallbackPatients.push(newPatientObj);
  syncPatientsStore();

  const query = `
    INSERT INTO patients 
    (patient_id, name, age, gender, contact, place, temperature, blood_pressure, recording_date, complaints, status, collected_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    generatedPatientId,
    name,
    age || '',
    gender || '',
    contact || '',
    place || '',
    temperature || '',
    bloodPressure || '',
    recordingDate || new Date().toLocaleString(),
    complaints || '',
    status,
    collected_by || 'Unknown'
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.warn("MySQL insert failed, stored in persistent fallback disk store:", err.message);
      return res.status(201).json({ success: true, data: newPatientObj });
    }

    newPatientObj.id = result.insertId;
    res.status(201).json({ success: true, data: newPatientObj });
  });
};

const updatePatientStatus = (req, res) => {
  const { patientId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  const rawKey = String(patientId).trim();
  const targetKey = rawKey.toUpperCase();

  // Rule: Only ONE patient can be 'In Consultation' at any given time.
  if (status === 'In Consultation') {
    // Revert any other patient currently in consultation back to 'Waiting' in memory
    fallbackPatients.forEach(p => {
      const pKey = (p.patientId || String(p.id)).trim().toUpperCase();
      if (p.status === 'In Consultation' && pKey !== targetKey) {
        p.status = 'Waiting';
      }
    });

    // Revert in MySQL DB as well
    const revertQuery = 'UPDATE patients SET status = "Waiting" WHERE status = "In Consultation" AND UPPER(patient_id) != ?';
    db.query(revertQuery, [targetKey], (revertErr) => {
      if (revertErr) {
        console.warn("Reverting previous in-consultation status failed in DB:", revertErr.message);
      }
    });
  }

  // Update or add target patient in fallbackPatients store immediately
  let foundInFallback = fallbackPatients.find(p => 
    (p.patientId && String(p.patientId).trim().toUpperCase() === targetKey) || 
    (p.id && String(p.id).trim().toUpperCase() === targetKey)
  );

  if (foundInFallback) {
    foundInFallback.status = status;
  } else {
    fallbackPatients.push({ patientId: rawKey, id: rawKey, status });
  }
  syncPatientsStore();

  const isNumeric = /^\d+$/.test(rawKey);
  const query = isNumeric 
    ? 'UPDATE patients SET status = ? WHERE patient_id = ? OR id = ?'
    : 'UPDATE patients SET status = ? WHERE patient_id = ?';

  const params = isNumeric ? [status, rawKey, parseInt(rawKey, 10)] : [status, rawKey];

  db.query(query, params, (err, result) => {
    if (err) {
      console.warn("MySQL update status failed, stored in fallback store:", err.message);
    } else {
      console.log("MySQL patient status successfully updated to:", status, "for patient:", rawKey);
    }
    res.json({ success: true, message: 'Status updated successfully', status });
  });
};

const getPatientById = (req, res) => {
  const { patientId } = req.params;
  const rawKey = String(patientId).trim();
  const isNumeric = /^\d+$/.test(rawKey);
  
  const query = isNumeric 
    ? 'SELECT * FROM patients WHERE patient_id = ? OR id = ?' 
    : 'SELECT * FROM patients WHERE patient_id = ?';

  const params = isNumeric ? [rawKey, parseInt(rawKey, 10)] : [rawKey];

  db.query(query, params, (err, results) => {
    if (err || !results || results.length === 0) {
      const foundInFallback = fallbackPatients.find(p => 
        (p.patientId && String(p.patientId).trim().toUpperCase() === rawKey.toUpperCase()) || 
        (p.id && String(p.id).trim().toUpperCase() === rawKey.toUpperCase())
      );
      if (foundInFallback) {
        return res.json({ success: true, data: foundInFallback });
      }
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const row = results[0];
    const formatted = {
      id: row.id,
      patientId: row.patient_id,
      name: row.name,
      age: row.age,
      gender: row.gender,
      contact: row.contact,
      place: row.place,
      temperature: row.temperature,
      bloodPressure: row.blood_pressure,
      recordingDate: row.recording_date,
      complaints: row.complaints,
      status: row.status,
      collected_by: row.collected_by,
      createdAt: row.created_at
    };

    res.json({ success: true, data: formatted });
  });
};

const deletePatient = (req, res) => {
  const { patientId } = req.params;
  const rawKey = String(patientId).trim();
  const targetKey = rawKey.toUpperCase();

  // Remove from fallback memory array and sync
  fallbackPatients = fallbackPatients.filter(p => {
    const pKey = (p.patientId || String(p.id)).trim().toUpperCase();
    return pKey !== targetKey;
  });
  syncPatientsStore();

  const isNumeric = /^\d+$/.test(rawKey);
  const query = isNumeric 
    ? 'DELETE FROM patients WHERE UPPER(patient_id) = ? OR id = ?' 
    : 'DELETE FROM patients WHERE UPPER(patient_id) = ?';

  const params = isNumeric ? [targetKey, parseInt(rawKey, 10)] : [targetKey];

  db.query(query, params, (err, result) => {
    if (err) {
      console.warn("MySQL delete patient failed:", err.message);
    } else {
      console.log("Patient successfully deleted from MySQL DB:", rawKey);
    }
    res.json({ success: true, message: 'Patient record deleted successfully' });
  });
};

module.exports = {
  getPatients,
  createPatient,
  updatePatientStatus,
  getPatientById,
  deletePatient
};

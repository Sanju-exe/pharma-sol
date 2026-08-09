const express = require('express');
const router = express.Router();
const {
  getPatients,
  createPatient,
  updatePatientStatus,
  getPatientById,
  deletePatient
} = require('../controllers/patientController');

// GET /api/patients - Get all patients in queue
router.get('/', getPatients);

// POST /api/patients - Register new patient intake from reception
router.post('/', createPatient);

// GET /api/patients/:patientId - Get specific patient details
router.get('/:patientId', getPatientById);

// PUT /api/patients/:patientId/status - Update patient status (Waiting, In Consultation, Completed)
router.put('/:patientId/status', updatePatientStatus);

// DELETE /api/patients/:patientId - Delete patient record
router.delete('/:patientId', deletePatient);

module.exports = router;

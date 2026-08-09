const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');

router.post('/', prescriptionController.createPrescription);
router.get('/', prescriptionController.getPrescriptions);
router.put('/:id/status', prescriptionController.updatePrescriptionStatus);
router.post('/:id/send-pdf', prescriptionController.sendPdf);

module.exports = router;

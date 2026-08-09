const express = require('express');
const router = express.Router();
const { getInventory, dispenseInventory, addOrUpdateInventory } = require('../controllers/inventoryController');

// Get all inventory items
router.get('/', getInventory);

// Add or update inventory item
router.post('/', addOrUpdateInventory);

// Dispense medicines (decrease stock)
router.put('/dispense', dispenseInventory);

module.exports = router;

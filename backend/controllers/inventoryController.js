const db = require('../db');
const { loadStore, saveStore } = require('../utils/persistentStore');

const defaultInventory = [
  { id: 1, name: 'Paracetamol 500mg', stock: 50, reorder_threshold: 20, type: 'tablet', expiry_date: '2027-12-31' },
  { id: 2, name: 'Amoxicillin 500mg', stock: 30, reorder_threshold: 10, type: 'tablet', expiry_date: '2026-10-15' },
  { id: 3, name: 'Lisinopril 10mg', stock: 45, reorder_threshold: 15, type: 'tablet', expiry_date: '2027-01-20' },
  { id: 4, name: 'Metformin 850mg', stock: 60, reorder_threshold: 25, type: 'tablet', expiry_date: '2028-05-10' },
  { id: 5, name: 'Atorvastatin 20mg', stock: 40, reorder_threshold: 15, type: 'tablet', expiry_date: '2027-08-22' },
  { id: 6, name: 'Cough Syrup 100ml', stock: 20, reorder_threshold: 5, type: 'syrup', expiry_date: '2026-11-30' }
];

// Persistent disk-backed fallback for inventory across server restarts
let fallbackInventory = loadStore('inventory.json', defaultInventory);

const syncInventoryStore = () => {
  saveStore('inventory.json', fallbackInventory);
};

const getInventory = (req, res) => {
  const { search, q } = req.query;
  const searchTerm = (search || q || '').trim();

  const query = 'SELECT * FROM inventory ORDER BY name ASC';

  db.query(query, (err, results) => {
    let inventoryData = results;
    if (err || !results || results.length === 0) {
      console.warn("MySQL fetch inventory failed or empty, using persistent fallback store:", err?.message);
      inventoryData = fallbackInventory;
    } else {
      fallbackInventory = results;
      syncInventoryStore();
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      inventoryData = inventoryData.filter(item => 
        item.name && item.name.toLowerCase().includes(lower)
      );
    }

    res.json({ success: true, data: inventoryData });
  });
};

const dispenseInventory = (req, res) => {
  const { medicines } = req.body;
  
  if (!medicines || !Array.isArray(medicines)) {
    return res.status(400).json({ success: false, message: 'Invalid medicines data' });
  }

  let completedCount = 0;
  let hasError = false;

  const checkCompletion = () => {
    completedCount++;
    if (completedCount === medicines.length) {
      syncInventoryStore();
      if (hasError) {
        return res.status(500).json({ success: false, message: 'Some inventory updates failed' });
      }
      return res.json({ success: true, message: 'Inventory updated successfully' });
    }
  };

  if (medicines.length === 0) {
    return res.json({ success: true, message: 'No medicines to dispense' });
  }

  medicines.forEach(med => {
    const qtyToDispense = parseInt(med.qty, 10);
    if (isNaN(qtyToDispense) || qtyToDispense <= 0) {
      return checkCompletion();
    }

    const query = 'UPDATE inventory SET stock = stock - ? WHERE name = ? AND stock >= ?';
    db.query(query, [qtyToDispense, med.name, qtyToDispense], (err, result) => {
      if (err) {
        console.warn(`Failed to update inventory for ${med.name}:`, err.message);
        hasError = true;
      }
      
      // Update fallback
      const fbItem = fallbackInventory.find(item => item.name === med.name);
      if (fbItem && fbItem.stock >= qtyToDispense) {
        fbItem.stock -= qtyToDispense;
      }
      
      checkCompletion();
    });
  });
};

const addOrUpdateInventory = (req, res) => {
  const { name, stock, expiry_date } = req.body;

  if (!name || stock === undefined || !expiry_date) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const parsedStock = parseInt(stock, 10);
  if (isNaN(parsedStock)) {
    return res.status(400).json({ success: false, message: 'Invalid stock value' });
  }

  const query = `
    INSERT INTO inventory (name, stock, reorder_threshold, type, expiry_date) 
    VALUES (?, ?, 10, 'tablet', ?)
    ON DUPLICATE KEY UPDATE stock = ?, expiry_date = ?
  `;

  db.query(query, [name, parsedStock, expiry_date, parsedStock, expiry_date], (err, result) => {
    // Update fallback just in case
    const fbItemIndex = fallbackInventory.findIndex(item => item.name === name);
    if (fbItemIndex >= 0) {
      fallbackInventory[fbItemIndex].stock = parsedStock;
      fallbackInventory[fbItemIndex].expiry_date = expiry_date;
    } else {
      fallbackInventory.push({ 
        id: Date.now(), 
        name, 
        stock: parsedStock, 
        reorder_threshold: 10, 
        type: 'tablet', 
        expiry_date 
      });
    }
    syncInventoryStore();

    if (err) {
      console.warn("Failed to add/update inventory in MySQL (saved in persistent fallback):", err.message);
    }

    res.json({ success: true, message: 'Inventory updated successfully' });
  });
};

module.exports = {
  getInventory,
  dispenseInventory,
  addOrUpdateInventory
};

const mysql = require('mysql2');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Sanju@12127',
  database: 'pharmsync',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Auto-create patients table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    age VARCHAR(10),
    gender VARCHAR(20),
    contact VARCHAR(50),
    place VARCHAR(100),
    temperature VARCHAR(50),
    blood_pressure VARCHAR(50),
    recording_date VARCHAR(50),
    complaints TEXT,
    status VARCHAR(50) DEFAULT 'Waiting',
    collected_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.warn("Could not execute patients table creation in MySQL (will use fallback store if DB is down):", err.message);
  } else {
    console.log("Patients table verified/created successfully.");
    // Attempt to add collected_by column if it doesn't exist
    db.query("ALTER TABLE patients ADD COLUMN collected_by VARCHAR(100)", (altErr) => {
      if (!altErr) {
        console.log("Added collected_by column to patients table.");
      }
    });
  }
});

// Auto-create users table if it doesn't exist
const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
  )
`;

db.query(createUsersTableQuery, (err) => {
  if (err) {
    console.warn("Could not execute users table creation in MySQL:", err.message);
  } else {
    console.log("Users table verified/created successfully.");
    // Seed default users
    const usersData = [
      ['Sanjay D', 'sanju@gmail.com', '267741', 'reception'],
      ['Saran', 'saran@gmail.com', '123456', 'reception'],
      ['Jagadeesh', 'jagadeesh@gmail.com', '98765', 'doctor'],
      ['Nikitha', 'nikitha@gmail.com', '1234', 'doctor'],
      ['Prasanth', 'prasanth@gmail.com', '12345', 'pharmacy'],
      ['dinesh', 'dinesh@gmail.com', '12345', 'pharmacy']
    ];
    // Use INSERT IGNORE ... if duplicate emails exist, they will be ignored (since email is UNIQUE)
    // For parameterized multiple inserts, query format is "INSERT ... VALUES ?" and pass an array of arrays
    db.query("INSERT IGNORE INTO users (name, email, password, role) VALUES ?", [usersData], (seedErr) => {
      if (!seedErr) {
        console.log("Default users seeded successfully.");
      } else {
        console.warn("Could not seed users:", seedErr.message);
      }
    });
  }
});

// Auto-create prescriptions table if it doesn't exist
const createPrescriptionsTableQuery = `
  CREATE TABLE IF NOT EXISTS prescriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rx_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(50),
    patient_name VARCHAR(255),
    doctor_name VARCHAR(255) DEFAULT 'Dr. J. Montague',
    diagnosis TEXT,
    medicines JSON,
    status VARCHAR(50) DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

db.query(createPrescriptionsTableQuery, (err) => {
  if (!err) {
    console.log("Prescriptions table verified/created successfully.");
  }
});

// Auto-create inventory table if it doesn't exist
const createInventoryTableQuery = `
  CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    stock INT DEFAULT 0,
    reorder_threshold INT DEFAULT 10,
    type VARCHAR(50) DEFAULT 'tablet',
    expiry_date VARCHAR(50)
  )
`;

db.query(createInventoryTableQuery, (err) => {
  if (err) {
    console.warn("Could not execute inventory table creation:", err.message);
  } else {
    console.log("Inventory table verified/created successfully.");
    
    // Seed default inventory
    const inventoryData = [
      ['Paracetamol 500mg', 50, 20, 'tablet', '2027-12-31'],
      ['Amoxicillin 500mg', 30, 10, 'tablet', '2026-10-15'],
      ['Lisinopril 10mg', 45, 15, 'tablet', '2027-01-20'],
      ['Metformin 850mg', 60, 25, 'tablet', '2028-05-10'],
      ['Atorvastatin 20mg', 40, 15, 'tablet', '2027-08-22'],
      ['Cough Syrup 100ml', 20, 5, 'syrup', '2026-11-30'],
      ['Paracetamol 500 mg', 120, 30, 'tablet', '2027-12-31'],
      ['Paracetamol 650 mg', 100, 30, 'tablet', '2027-10-31'],
      ['Cetirizine 10 mg', 80, 20, 'tablet', '2027-08-31'],
      ['Levocetirizine 5 mg', 75, 20, 'tablet', '2027-11-30'],
      ['Antacid Chewable Tablet', 60, 15, 'tablet', '2027-09-30'],
      ['Calcium + Vitamin D3 Tablet', 90, 20, 'tablet', '2028-01-31'],
      ['Vitamin C 500 mg Tablet', 100, 20, 'tablet', '2027-12-31'],
      ['ORS Electrolyte Tablet', 50, 10, 'tablet', '2027-07-31'],
      ['Simethicone 80 mg Tablet', 60, 15, 'tablet', '2027-10-31'],
      ['Zinc 20 mg Tablet', 70, 15, 'tablet', '2027-09-30']
    ];
    
    db.query("INSERT IGNORE INTO inventory (name, stock, reorder_threshold, type, expiry_date) VALUES ?", [inventoryData], (seedErr) => {
      if (!seedErr) {
        console.log("Default inventory seeded successfully.");
      } else {
        console.warn("Could not seed inventory:", seedErr.message);
      }
    });
  }
});

module.exports = db;


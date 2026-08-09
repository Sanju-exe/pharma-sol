const db = require('../db');

// Fallback users if DB is offline
const FALLBACK_USERS = [
  { name: 'Sanjay D', email: 'sanju@gmail.com', password: '267741', role: 'reception' },
  { name: 'Saran', email: 'saran@gmail.com', password: '123456', role: 'reception' },
  { name: 'Jagadeesh', email: 'jagadeesh@gmail.com', password: '98765', role: 'doctor' },
  { name: 'Nikitha', email: 'nikitha@gmail.com', password: '1234', role: 'doctor' },
  { name: 'Prasanth', email: 'prasanth@gmail.com', password: '12345', role: 'pharmacy' },
  { name: 'dinesh', email: 'dinesh@gmail.com', password: '12345', role: 'pharmacy' }
];

const login = (req, res) => {
  const { email, password, portalType } = req.body;

  if (!email || !password || !portalType) {
    return res.status(400).json({ success: false, message: 'Email, password, and portal type are required' });
  }

  const query = 'SELECT * FROM users WHERE email = ? AND password = ? AND role = ?';

  db.query(query, [email, password, portalType], (err, results) => {
    if (err) {
      console.warn("MySQL login query failed, checking standard fallback users:", err.message);
      const fallbackUser = FALLBACK_USERS.find(u => u.email === email && u.password === password && u.role === portalType);
      if (fallbackUser) {
        return res.json({ success: true, user: fallbackUser });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials or role' });
    }

    if (results && results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      const fallbackUser = FALLBACK_USERS.find(u => u.email === email && u.password === password && u.role === portalType);
      if (fallbackUser) {
        return res.json({ success: true, user: fallbackUser });
      }
      res.status(401).json({ success: false, message: 'Invalid credentials or role' });
    }
  });
};

module.exports = {
    login
};

const db = require('./backend/db');
db.query('SELECT * FROM receptionists', (err, results) => {
    if (err) console.error("Error:", err.message);
    else console.log("Results:", results);
    process.exit();
});

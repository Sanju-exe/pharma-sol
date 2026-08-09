const pool = require('../db');

const ReceptionistModel = {
    findByEmail: async (email) => {
        const [rows] = await pool.query(
            'SELECT * FROM receptionists WHERE email = ?',
            [email]
        );
        return rows[0];
    }
};

module.exports = ReceptionistModel;

const db = require('../config/db');

const authModel = {
    // ইউজার রেজিস্ট্রেশন কুয়েরি
    createUser: async (username, hashedPassword, role) => {
        const sql = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
        return await db.query(sql, [username, hashedPassword, role]);
    },

    // ইউজার খোঁজার কুয়েরি (লগইনের জন্য)
    findUserByUsername: async (username) => {
        const sql = "SELECT * FROM users WHERE username = ?";
        const [results] = await db.query(sql, [username]);
        return results;
    }
};

module.exports = authModel;
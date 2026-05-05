const db = require('../config/db'); // db ফাইলের পাথ ঠিক আছে কিনা একটু চেক করে নিও (ফোল্ডার অনুযায়ী ../ বা ../../ হতে পারে)

const userModel = {
    // ================== Bazar Segment ==================
    // Insert user's bazar expense request into pending queue
    res1: async (user_id, messId, username, bazar_date, itemsString, total_price) => {
        return await db.query("INSERT INTO pending_bazar (user_id, mess_id, username, bazar_date, items, total_price) VALUES (?, ?, ?, ?, ?, ?)", [user_id, messId, username, bazar_date, itemsString, total_price]);
    },
    // Get all pending bazar requests for a mess
    res2: async (messId) => {
        return await db.query("SELECT * FROM pending_bazar WHERE mess_id = ? AND status = 'pending'", [messId]);
    },
    // Move approved bazar request to permanent logs
    res3: async (user_id, mess_id, bazar_date, items, total_price) => {
        return await db.query("INSERT INTO bazar_logs (user_id, mess_id, bazar_date, items, total_price) VALUES (?, ?, ?, ?, ?)", [user_id, mess_id, bazar_date, items, total_price]);
    },
    // Remove bazar from pending queue (approve/reject)
    res4: async (id) => {
        return await db.query("DELETE FROM pending_bazar WHERE id = ?", [id]);
    },
    // Admin directly insert bazar expense to logs
    res5: async (user_id, messId, bazar_date, itemsString, total_price) => {
        return await db.query("INSERT INTO bazar_logs (user_id, mess_id, bazar_date, items, total_price) VALUES (?, ?, ?, ?, ?)", [user_id, messId, bazar_date, itemsString, total_price]);
    },
    // Retrieve user's bazar transaction history
    res6: async (userId) => {
        return await db.query("SELECT * FROM bazar_logs WHERE user_id = ? ORDER BY bazar_date DESC", [userId]);
    },
    // Fetch all bazar records with username joined from users table
    res7: async () => {
        return await db.query("SELECT b.*, u.username FROM bazar_logs b JOIN users u ON b.user_id = u.id ORDER BY b.bazar_date DESC");
    },

    // ================== Meal Segment ==================
    res8: async (user_id, date, lunch, dinner, guest) => {
        return await db.query("INSERT INTO meals (user_id, meal_date, lunch, dinner, guest) VALUES (?, ?, ?, ?, ?)", [user_id, date, lunch, dinner, guest]);
    },

    // ======== Mess Creation and Management ========
    res9: async (mess_name, user_id, total_seats, mess_img, location) => {
        return await db.query("INSERT INTO messes (mess_name, admin_id, total_seats, mess_img, location, booked_seats) VALUES (?, ?, ?, ?, ?, 1)", [mess_name, user_id, total_seats, mess_img, location]);
    },
    res10: async (user_id, mess_id) => {
        return await db.query("INSERT INTO join_requests (user_id, mess_id, status) VALUES (?, ?, 'pending')", [user_id, mess_id]);
    },
    res11: async (userId, messId) => {
        return await db.query("DELETE FROM join_requests WHERE user_id = ? AND mess_id = ? AND status = 'pending'", [userId, messId]);
    },
    res12: async () => {
        return await db.query("SELECT messes.*, users.username AS admin_name,users.id As admin_id FROM messes JOIN users ON messes.admin_id = users.id ORDER BY messes.id DESC");
    },
    res13: async (userId) => {
        return await db.query("SELECT mess_id FROM users WHERE id = ?", [userId]);
    },

    // ================== Mess Interface ==================
    res14: async (today, messId) => {
        return await db.query("SELECT u.id, u.username, IFNULL(m.lunch, 0) AS lunch, IFNULL(m.dinner, 0) AS dinner, IFNULL(m.guest, 0) AS guest FROM users u LEFT JOIN meals m ON u.id = m.user_id AND m.meal_date = ? WHERE u.mess_id = ?", [today, messId]);
    },
    res15: async (messId, m, y) => {
        return await db.query("SELECT SUM(total_price) as totalBazar FROM bazar_logs WHERE mess_id = ? AND MONTH(bazar_date) = ? AND YEAR(bazar_date) = ?", [messId, m, y]);
    },

    // ================== User History & Booking ==================
    res16: async (post_id, user_id, start_date, end_date, total_price) => {
        return await db.query("INSERT INTO rental_bookings (post_id, user_id, start_date, end_date, total_price, status) VALUES (?, ?, ?, ?, ?, 'pending')", [post_id, user_id, start_date, end_date, total_price]);
    },
    res17: async (postId) => {
        return await db.query("SELECT start_date, end_date FROM rental_bookings WHERE post_id = ? AND status = 'confirmed'", [postId]);
    },
    res18: async (userId, currentMonthStr) => {
        return await db.query("SELECT SUM(lunch + dinner + guest) AS total FROM meals WHERE user_id = ? AND meal_date LIKE ?", [userId, currentMonthStr]);
    },
    res19: async (ownerId) => {
        return await db.query("SELECT rb.id, u.username AS sender_name, NULL AS profile_pic, mp.title AS mess_name, rb.total_price AS amount, rb.status, DATE_FORMAT(rb.start_date, '%d %b') AS start_date, DATE_FORMAT(rb.end_date, '%d %b') AS end_date FROM rental_bookings rb JOIN mess_posts mp ON rb.post_id = mp.id JOIN users u ON rb.user_id = u.id WHERE mp.user_id = ? AND LOWER(rb.status) = 'pending'", [ownerId]);
    },
    res20: async (status, bookingId) => {
        return await db.query("UPDATE rental_bookings SET status = ? WHERE id = ?", [status, bookingId]);
    },
    res21: async (userId) => {
        return await db.query("SELECT mp.title, CONCAT(DATE_FORMAT(rb.start_date, '%d %b'), ' - ', DATE_FORMAT(rb.end_date, '%d %b')) AS dates, rb.total_price AS amount, rb.status FROM rental_bookings rb JOIN mess_posts mp ON rb.post_id = mp.id WHERE rb.user_id = ? ORDER BY rb.created_at DESC", [userId]);
    },

    // ================== Admin Part ==================
    res22: async (messId) => {
        return await db.query("SELECT jr.id, u.id AS user_id, u.username, u.profile_pic, jr.request_date FROM join_requests jr JOIN users u ON jr.user_id = u.id WHERE jr.mess_id = ? AND jr.status = 'pending'", [messId]);
    },
    res23: async (request_id) => {
        return await db.query("UPDATE join_requests SET status = 'accepted' WHERE id = ?", [request_id]);
    },
    res24: async (requestId) => {
        return await db.query("DELETE FROM join_requests WHERE id = ?", [requestId]);
    },
    res25: async (messId) => {
        return await db.query("SELECT u.id, u.username, u.role, u.profile_pic, m.mess_name FROM users u JOIN messes m ON u.mess_id = m.id WHERE u.mess_id = ?", [messId]);
    },
    res26: async (userId) => {
        return await db.query("UPDATE users SET mess_id = NULL WHERE id = ?", [userId]);
    },

    // ================== Create Post Manage ==================
    res27: async (user_id, post_type, title, description, finalPrice, image_path) => {
        return await db.query("INSERT INTO mess_posts (user_id, post_type, title, description, price, image_path) VALUES (?, ?, ?, ?, ?, ?)", [user_id, post_type, title, description, finalPrice, image_path]);
    },
    res28: async () => {
        return await db.query("SELECT mess_posts.*, users.username, messes.mess_name FROM mess_posts JOIN users ON mess_posts.user_id = users.id LEFT JOIN messes ON users.mess_id = messes.id ORDER BY mess_posts.id DESC");
    },
    res29: async (postId) => {
        return await db.query("SELECT mess_posts.*, users.username, messes.mess_name FROM mess_posts JOIN users ON mess_posts.user_id = users.id LEFT JOIN messes ON users.mess_id = messes.id WHERE mess_posts.id = ?", [postId]);
    }
};

module.exports = userModel;
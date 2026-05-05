const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const userModel = require('../Models/userModel'); // মডেল ইমপোর্ট করুন




















// function 01 :
// Create pending bazar expense record awaiting admin verification
exports.submit_bazar = async (req, res) => {
    const { user_id, messId, username, bazar_date, items, total_price } = req.body;
    const itemsString = Array.isArray(items) ? items.join(', ') : items;
    try {
        await userModel.res1(user_id, messId, username, bazar_date, itemsString, total_price);
        res.status(201).json({ message: "Bazar added successfully! Please wait for admin's approval !!" });
    } catch (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Failed to store bazar data!" });
    }
};

// function 02 :
// Fetch all pending bazar requests for admin review and approval
exports.get_pending_bazar = async (req, res) => {
    try {
        const [rows] = await userModel.res2(req.params.messId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// function 03 :// Admin approves bazar: moves from pending to permanent logsexports.approve_bazar = async (req, res) => {
    const { id, user_id, mess_id, bazar_date, items, total_price } = req.body;
    try {
        await userModel.res3(user_id, mess_id, bazar_date, items, total_price);
        await userModel.res4(id); // ডিলিট করার কুয়েরি
        res.json({ success: true, message: "Bazar approved and moved to logs!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// function 04 :
// Admin rejects bazar: deletes from pending queue
exports.reject_bazar = async (req, res) => {
    try {
        await userModel.res4(req.params.id);
        res.json({ success: true, message: "Bazar request rejected!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// function 05 :
// Admin directly inserts bazar expense (bypasses approval workflow)
exports.add_bazar = async (req, res) => {
    const { user_id, messId, bazar_date, items, total_price } = req.body;
    const itemsString = Array.isArray(items) ? items.join(', ') : items;
    try {
        await userModel.res5(user_id, messId, bazar_date, itemsString, total_price);
        res.status(201).json({ message: "Bazar added successfully!" });
    } catch (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Failed to store bazar data!" });
    }
};

// function 06 :
// Retrieve user's personal bazar history and expenses
exports.my_bazar = async (req, res) => {
    const userId = req.params.userId;
    try {
        const [results] = await userModel.res6(userId);
        const formattedResults = results.map(row => ({
            ...row,
            items: row.items ? row.items.split(', ') : []
        }));
        res.json(formattedResults);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// function 07 :
// Fetch complete bazar ledger for all users with usernames
exports.total_bazar = async (req, res) => {
    try {
        const [results] = await userModel.res7();
        const formattedResults = results.map(row => ({
            ...row,
            items: row.items ? row.items.split(', ') : []
        }));
        res.json(formattedResults);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// function 08 :
// Store daily meal tracking record (lunch/dinner status and guest meals)
exports.input_meal = async (req, res) => {
    const { user_id, date, lunch, dinner, guest } = req.body;
    if (!user_id || !date) return res.status(400).json({ status: "Invalid request. Please provide user_id and date." });
    try {
        const [result] = await userModel.res8(user_id, date, lunch, dinner, guest);
        if (result.affectedRows > 0) return res.status(200).json({ status: "successful", message: "Meal added successfully!" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ status: "duplicate", message: "আপনি এই তারিখের মিল অলরেডি সাবমিট করেছেন!" });
        console.error("Database Error:", error.message);
        return res.status(500).json({ status: "error", message: "ডাটাবেস সার্ভারে সমস্যা হয়েছে।" });
    }
};

// function 09 :
exports.create_mess = async (req, res) => {
    try {
        const { mess_name, total_seats, user_id, location } = req.body;
        if (!mess_name || !user_id) return res.status(400).json({ error: "মেসের নাম এবং ইউজার আইডি প্রয়োজন!" });
        
        const [existingUser] = await userModel.res13(user_id); // ইউজারের মেস চেক করার কুয়েরি
        if (existingUser.length > 0 && existingUser[0].mess_id !== null) {
            return res.status(400).json({ error: "You have already opened a mess. You have to leave first to open another mess." });
        }

        let mess_img = req.file ? `/public/uploads/posts/${req.file.filename}` : null;
        const [result] = await userModel.res9(mess_name, user_id, total_seats || 6, mess_img, location);

        if (result.affectedRows > 0) {
            const newMessId = result.insertId;
            // ইউজারকে অ্যাডমিন বানানোর কুয়েরি (এটি তোমার লিস্টে ছিল না, আমি ধরে নিচ্ছি তুমি এটি মডেলে যোগ করে নেবে, আপাতত আগের মতোই রাখছি)
            const [result1] = await db.query("UPDATE users SET role = 'admin', mess_id = ? WHERE id = ?", [newMessId, user_id]);
            if (result1.affectedRows > 0) {
                return res.status(201).json({ message: "Congratulations!! Your mess has been created, and you are the admin.", mess_id: newMessId });
            } else throw new Error("Failed to update user role to admin");
        } else return res.status(500).json({ error: "Facing problem creating mess" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "This mess name or admin already exists!" });
        console.error("Error:", err);
        return res.status(500).json({ error: "Server error during mess creation!" });
    }
};

// function 10 :
exports.join_request = async (req, res) => {
    const { user_id, mess_id } = req.body;
    try {
        const [results] = await userModel.res13(user_id);
        if (results.length > 0 && results[0].mess_id) return res.status(400).json({ error: "আপনি ইতিমধ্যে একটি মেসের সদস্য!" });

        await userModel.res10(user_id, mess_id);
        res.status(200).json({ message: "রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে! অ্যাডমিনের অনুমোদনের অপেক্ষা করুন।" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।" });
    }
};

// function 11 :
exports.cancel_request = async (req, res) => {
    try {
        const { userId, messId } = req.params;
        const [result] = await userModel.res11(userId, messId);
        if (result.affectedRows > 0) res.json({ message: "Request cancelled successfully!" });
        else res.status(404).json({ error: "No pending request found!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error!" });
    }
};

// function 12 :
exports.get_all_messes = async (req, res) => {
    try {
        const [results] = await userModel.res12();
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// function 13 :
exports.find_mess_member = async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(200).json({ mess_id: null, message: "No user ID provided" });
    try {
        const [rows] = await userModel.res13(userId);
        if (rows.length > 0) return res.status(200).json({ mess_id: rows[0].mess_id, isMember: rows[0].mess_id !== null });
        else return res.status(200).json({ mess_id: null });
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// function 14 :
// Retrieves all meal records for a given date and mess for admin dashboard
exports.get_today_meal_data = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const messId = req.query.messId;
        const [rows] = await userModel.res14(today, messId);
        if (rows.length > 0) res.status(200).json(rows);
        else res.status(200).json([]);
    } catch (err) {
        console.error("Error in /get_today_meal_data:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// function 15 :
// Calculates current month meal rate: total bazar / total meals per user
exports.get_mealrate = async (req, res) => {
    try {
        const messId = parseInt(req.query.messId);
        if (!messId) return res.status(400).json({ error: "Mess ID is required !! please login another time !!" });
        
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();

        const [bazarRes] = await userModel.res15(messId, m, y);
        // মেলের জন্য আলাদা কুয়েরি মডেলে যোগ করতে হবে, আমি এখানে আগের ফরম্যাটটি রাখছি
        const mealQuery = `SELECT SUM(m.lunch + m.dinner + m.guest) as totalMeals FROM meals m JOIN users u ON m.user_id = u.id WHERE u.mess_id = ? AND MONTH(m.meal_date) = ? AND YEAR(m.meal_date) = ?`;
        const [mealRes] = await db.query(mealQuery, [messId, m, y]); 

        const totalBazar = bazarRes[0].totalBazar || 0;
        const totalMeals = mealRes[0].totalMeals || 0;
        let mealRate = totalMeals > 0 ? (totalBazar / totalMeals).toFixed(2) : 0;

        res.status(200).json({ currentMonth: m, totalBazar, totalMeals, mealRate });
    } catch (err) {
        console.error("Meal Rate Error:", err);
        res.status(500).json({ error: "Calculation failed" });
    }
};

// function 16 :
// Check date conflicts and create rental booking request
exports.create_booking = async (req, res) => {
    const { post_id, user_id, start_date, end_date, total_price } = req.body;
    if (!post_id || !user_id || !start_date || !end_date) return res.status(400).json({ success: false, message: "All fields are required!" });
    
    try {
        // কনফ্লিক্ট চেক কুয়েরি মডেলে অ্যাড করে নিও, আপাতত সরাসরি রাখছি        // Verify date range doesn't overlap with confirmed bookings        const conflictSql = `SELECT id FROM rental_bookings WHERE post_id = ? AND status = 'confirmed' AND ((start_date <= ? AND end_date >= ?))`;
        const [conflicts] = await db.query(conflictSql, [post_id, end_date, start_date]);
        if (conflicts.length > 0) return res.status(400).json({ success: false, message: "❌ Sorry, these dates are already booked!" });

        const [result] = await userModel.res16(post_id, user_id, start_date, end_date, total_price);
        if (result.insertId) res.json({ success: true, message: "⏳ Booking request sent! Waiting for owner approval.", bookingId: result.insertId });
        else res.status(500).json({ success: false, message: "Database insertion failed!" });
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// function 17 :
// Build array of booked dates from confirmed bookings and return as occupiedDates
exports.get_bookings = async (req, res) => {
    const { postId } = req.params;
    try {
        const [results] = await userModel.res17(postId);
        if (!results || results.length === 0) return res.json({ success: true, occupiedDates: [] });

        let allOccupiedDates = [];
        results.forEach(booking => {
            let current = new Date(booking.start_date);
            let end = new Date(booking.end_date);
            while (current <= end) {
                const year = current.getFullYear();
                const month = String(current.getMonth() + 1).padStart(2, '0');
                const day = String(current.getDate()).padStart(2, '0');
                allOccupiedDates.push(`${year}-${month}-${day}`);
                current.setDate(current.getDate() + 1);
            }
        });
        res.status(200).json({ success: true, occupiedDates: [...new Set(allOccupiedDates)] });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, message: "সার্ভারে সমস্যা হয়েছে!", error: error.message });
    }
};

// function 18 :
// Computes user's meal statistics: total meals, meal rate, and cost for current month
exports.get_user_meal_summary = async (req, res) => {
    const userId = req.params.userId;
    const currentMonth = new Date().toISOString().slice(0, 7);
    try {
        const [userMealResult] = await userModel.res18(userId, `${currentMonth}%`);
        const userTotalMeals = parseFloat(userMealResult[0].total) || 0;

        // ম্যাস মিল ও বাজারের কুয়েরিগুলো মডেলে অ্যাড করতে হবে, আপাতত কোড ঠিক রাখার জন্য ডিরেক্ট রাখছি
        const [messMealsResult] = await db.query(`SELECT SUM(lunch + dinner + guest) AS total FROM meals WHERE meal_date LIKE ?`, [`${currentMonth}%`]);
        const messTotalMeals = parseFloat(messMealsResult[0].total) || 0;

        const [messBazarResult] = await db.query(`SELECT SUM(total_price) AS total FROM bazar_logs WHERE bazar_date LIKE ?`, [`${currentMonth}%`]);
        const messTotalBazar = parseFloat(messBazarResult[0].total) || 0;

        let mealRate = messTotalMeals > 0 ? (messTotalBazar / messTotalMeals) : 0;
        const userCost = userTotalMeals * mealRate;

        const [reqResult] = await db.query(`SELECT COUNT(*) AS count FROM rental_bookings rb JOIN mess_posts mp ON rb.post_id = mp.id WHERE mp.user_id = ? AND rb.status = 'pending'`, [userId]);

        res.json({ success: true, totalMeals: userTotalMeals, mealRate: mealRate.toFixed(2), userCost: userCost.toFixed(2), pendingRequests: reqResult[0].count || 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// function 19 :
// function 19 :
// Fetch all pending rental requests for property owner
exports.get_incoming_requests = async (req, res) => {
    const ownerId = req.params.userId;
    try {
        const [requests] = await userModel.res19(ownerId);
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// function 20 :
// Confirm booking and auto-cancel conflicting pending requests
exports.update_booking_status = async (req, res) => {
    const { bookingId } = req.params;
    const { status } = req.body;
    try {
        if (status === 'confirmed') {
            const [currentBooking] = await db.query("SELECT post_id, start_date, end_date FROM rental_bookings WHERE id = ?", [bookingId]);
            if (currentBooking.length > 0) {
                const { post_id, start_date, end_date } = currentBooking[0];
                // Auto-cancel conflicting bookings when confirming
                const cancelSql = `UPDATE rental_bookings SET status = 'cancelled' WHERE post_id = ? AND status = 'pending' AND id != ? AND ((start_date <= ? AND end_date >= ?))`;
                await db.query(cancelSql, [post_id, bookingId, end_date, start_date]);
            }
        }
        await userModel.res20(status, bookingId);
        res.json({ success: true, message: status === 'confirmed' ? "Booking confirmed and conflicting requests cancelled!" : "Booking updated!" });
    } catch (err) {
        console.error("Conflict Resolution Error:", err);
        res.status(500).json({ success: false, message: "Server error during update" });
    }
};

// function 21 :
exports.get_user_rental_history = async (req, res) => {
    const userId = req.params.userId;
    try {
        const [history] = await userModel.res21(userId);
        res.json({ success: true, history });
    } catch (err) {
        console.error("History Error:", err);
        res.status(500).json({ success: false });
    }
};

// function 22 :
exports.get_pending_requests = async (req, res) => {
    const messId = req.params.mess_id;
    try {
        const [results] = await userModel.res22(messId);
        if (!results || results.length === 0) return res.status(200).json([]);

        const updatedResults = results.map(user => ({
            ...user,
            profile_pic: user.profile_pic || '/public/uploads/profiles/default-avatar.png'
        }));
        res.status(200).json(updatedResults);
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ success: false, error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" });
    }
};

// function 23 :
exports.accept_request = async (req, res) => {
    const { request_id, user_id, mess_id } = req.body;
    try {
        await userModel.res23(request_id);
        // এগুলো মডেলে এড করে নিও
        await db.query("UPDATE users SET mess_id = ? WHERE id = ?", [mess_id, user_id]);
        await db.query("UPDATE messes SET booked_seats = booked_seats + 1 WHERE id = ?", [mess_id]);
        res.json({ message: "সদস্য সফলভাবে যুক্ত করা হয়েছে! 🎉" });
    } catch (err) {
        return res.status(500).json({ error: "Accept request process failed" });
    }
};

// function 24 :
exports.reject_request = async (req, res) => {
    const requestId = req.params.id;
    try {
        await userModel.res24(requestId);
        res.json({ message: "রিকোয়েস্টটি বাতিল করা হয়েছে।" });
    } catch (err) {
        return res.status(500).json({ error: "Reject failed" });
    }
};

// function 25 :
exports.get_mess_members = async (req, res) => {
    const messId = req.params.mess_id;
    try {
        const [results] = await userModel.res25(messId);
        if (!results || results.length === 0) return res.status(404).json({ message: "No members found" });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// function 26 :
exports.remove_member = async (req, res) => {
    const { userId, messId } = req.body;
    if (!userId || !messId) return res.status(400).json({ success: false, message: "UserId and MessId both are required!" });
    try {
        const [userResult] = await userModel.res26(userId);
        const [messResult] = await db.query("UPDATE messes SET booked_seats = booked_seats - 1 WHERE id = ?", [messId]);
        if (userResult.affectedRows > 0) res.json({ success: true, message: "Member removed and seat updated!" });
        else res.status(404).json({ success: false, message: "User not found or ID incorrect!" });
    } catch (error) {
        console.error("Critical Database Error:", error);
        res.status(500).json({ success: false, message: "Database failure: " + error.message });
    }
};

// function 27 :// Save new post (rent/sale/other) with uploaded image to databaseexports.create_posts = async (req, res) => {
    // এখানে multer upload.single('post_image') রাউটে ব্যবহার করা হয়েছে ধরে নিলাম
    try {
        const { user_id, post_type, title, description, price } = req.body;
        const image_path = req.file ? `/public/uploads/posts/${req.file.filename}` : null;
        const finalPrice = (post_type === 'other') ? 0 : price;

        const [result] = await userModel.res27(user_id, post_type, title, description, finalPrice, image_path);
        if (result.affectedRows > 0) return res.status(200).json({ success: true, message: "Post Created Successfully! 🚀", postId: result.insertId });
        else return res.status(400).json({ error: "Could not save post." });
    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({ error: "Internal Server Error!" });
    }
};

// function 28 :
// Retrieve all posts with user and mess information
exports.get_posts = async (req, res) => {
    try {
        const [rows] = await userModel.res28();
        res.status(200).json(rows);
    } catch (err) {
        console.error("Error fetching all posts:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// function 29 :
// Get single post details with owner info and mess name
exports.get_post_details = async (req, res) => {
    const postId = req.params.id;
    try {
        const [rows] = await userModel.res29(postId);
        if (rows.length === 0) return res.status(404).json({ error: "Sorry, this post does not exist!" });
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error(`Database Error for Post ID ${postId}:`, err.message);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
};







exports.uploadProfilePic = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const imagePath = `/public/uploads/profiles/${req.file.filename}`;
        
        const [result] = await db.query(
            "UPDATE users SET profile_pic = ? WHERE id = ?",
            [imagePath, userId]
        );

        res.status(200).json({ 
            success: true, 
            message: 'Uploaded successfully', 
            imagePath: imagePath 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// function 31 : Get User Profile
exports.getUserProfile = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT username, profile_pic FROM users WHERE id = ?", [req.params.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
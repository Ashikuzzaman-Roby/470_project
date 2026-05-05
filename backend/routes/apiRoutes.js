const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ================== ফোল্ডার তৈরি করার লজিক (fs module) ==================
// process.cwd() ব্যবহার করা হয়েছে যাতে মেইন রুট ফোল্ডার থেকে পাথ ঠিকমতো পায়
const postDir = path.join(process.cwd(), 'public', 'uploads', 'posts');
const profileDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');

if (!fs.existsSync(postDir)) {
    fs.mkdirSync(postDir, { recursive: true });
}
if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
}

// ================== Multer Setup for Posts ==================
const postStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, postDir),
    filename: (req, file, cb) => cb(null, 'post-' + Date.now() + path.extname(file.originalname))
});
const uploadPost = multer({ storage: postStorage, limits: { fileSize: 100 * 1024 * 1024 } });

// ================== Multer Setup for Profiles ==================
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profileDir),
    filename: (req, file, cb) => cb(null, 'profile-' + Date.now() + path.extname(file.originalname))
});
const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 100 * 1024 * 1024 } });

// ================== Bazar Segment ==================
// User submits bazar expense request awaiting admin approval
router.post('/submit-bazar', mainController.submit_bazar);
// Retrieve pending bazar requests for admin dashboard
router.get('/get-pending-bazar/:messId', mainController.get_pending_bazar);
// Admin approves bazar and moves to permanent logs
router.post('/approve-bazar', mainController.approve_bazar);
// Admin rejects and removes bazar request
router.delete('/reject-bazar/:id', mainController.reject_bazar);
// Admin directly add bazar to logs (bypasses approval)
router.post('/add-bazar', mainController.add_bazar);
// Fetch user's bazar history
router.get('/my-bazar/:userId', mainController.my_bazar);
// Get all bazar records with user details
router.get('/total-bazar', mainController.total_bazar);

// ================== Meal Segment ==================
// Route to save user meal records (lunch, dinner, guest count)
router.post('/input_meal', mainController.input_meal);

// ======== Mess Creation and Management ========
router.post('/create-mess', uploadPost.single('post_image'), mainController.create_mess);
router.post('/join-request', mainController.join_request);
router.delete('/cancel-request/:userId/:messId', mainController.cancel_request);
router.get('/all-messes', mainController.get_all_messes);
router.get('/find_mess_member', mainController.find_mess_member);

// ================== Mess Interface ==================
// Fetch all meal records for a specific date and mess
router.get('/get_today_meal_data', mainController.get_today_meal_data);
// Calculate meal rate: total bazar cost divided by total meals for current month
router.get('/get_mealrate', mainController.get_mealrate);

// ================== User History & Booking ==================
router.post('/create-booking', mainController.create_booking);
router.get('/get-bookings/:postId', mainController.get_bookings);
router.get('/user_meal_summary/:userId', mainController.get_user_meal_summary);
router.get('/incoming-requests/:userId', mainController.get_incoming_requests);
router.put('/update-booking-status/:bookingId', mainController.update_booking_status);
router.get('/user-rental-history/:userId', mainController.get_user_rental_history);

// ================== Admin Part ==================
router.get('/pending-requests/:mess_id', mainController.get_pending_requests);
router.post('/accept-request', mainController.accept_request);
router.delete('/reject-request/:id', mainController.reject_request);
router.get('/mess-members/:mess_id', mainController.get_mess_members);
router.post('/remove-member', mainController.remove_member);

// ================== Create Post Manage & Profile ==================
router.post('/create-posts', uploadPost.single('post_image'), mainController.create_posts);
router.get('/get-posts', mainController.get_posts);
router.get('/get-post/:id', mainController.get_post_details);

// প্রোফাইল পিকচার আপলোড
router.post('/upload-profile-pic', uploadProfile.single('profile_pic'), mainController.uploadProfilePic);
router.get('/user/:id', mainController.getUserProfile);

module.exports = router;
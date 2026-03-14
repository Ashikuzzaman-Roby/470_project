// ============================================================     user interface ============================================


// প্রোফাইল পিকচারের জন্য ফোল্ডার পাথ
const profileDir = path.join(__dirname, 'public', 'uploads', 'profiles');
if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
}

// প্রোফাইলের জন্য আলাদা স্টোরেজ ইঞ্জিন
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileDir);
    },
    filename: (req, file, cb) => {
        // ইউজারের আইডি পাওয়া গেলে সেটা দিয়ে নাম করা ভালো, আপাতত টাইমস্ট্যাম্প দিচ্ছি
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});

const uploadProfile = multer({ 
    storage: profileStorage,
    limits: { fileSize: 100 * 1024 * 1024 } 
}).single('profile_pic');

// প্রোফাইল পিকচার আপলোড API এন্ডপয়েন্ট
app.post('/api/upload-profile-pic', uploadProfile, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const imagePath = `/public/uploads/profiles/${req.file.filename}`;
        
        // ডাটাবেস আপডেট কুয়েরি
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
});


// fetching user picture in the profile picture : 
// Example: গেট ইউজার ডেটা
app.get('/api/user/:id', async (req, res) => {
    const [rows] = await db.query("SELECT username, profile_pic FROM users WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
});










// for bazar _logs : user interface : 

// user's bazar first a pending bazar list a  jabe 
// then admin approve korle bazar main database a jabe..
// 




app.post('/api/submit-bazar', async (req, res) => {
    // ফ্রন্টএন্ড থেকে messId আসছে, তাই এখানে messId ধরছি
    const { user_id, messId, username, bazar_date, items, total_price } = req.body;
    
    // আইটেম অ্যারে থাকলে স্ট্রিং বানিয়ে নেওয়া
    const itemsString = Array.isArray(items) ? items.join(', ') : items;

    // কলামের নাম অবশ্যই 'items' হতে হবে, 'itemsString' নয়
    const sql = "INSERT INTO pending_bazar (user_id, mess_id, username, bazar_date, items, total_price) VALUES (?, ?, ?, ?, ?, ?)";
    
    try {
        // এখানে messId পাস করো
        await db.query(sql, [user_id, messId, username, bazar_date, itemsString, total_price]);
        res.status(201).json({ message: "Bazar added successfully! Please wait for admin's approval !!" });
    } catch (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Failed to store bazar data!" });
    }
});


// fetching pending bazar for admin : 
app.get('/api/get-pending-bazar/:messId', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM pending_bazar WHERE mess_id = ? AND status = 'pending'", [req.params.messId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// bazar approve or deny from the admin : 

app.post('/api/approve-bazar', async (req, res) => {
    const { id, user_id, mess_id, bazar_date, items, total_price } = req.body;
    try {
        // মেইন বাজার লগে ইনসার্ট
        await db.query("INSERT INTO bazar_logs (user_id, mess_id, bazar_date, items, total_price) VALUES (?, ?, ?, ?, ?)", 
        [user_id, mess_id, bazar_date, items, total_price]);

        // পেন্ডিং থেকে রিমুভ (যাতে ভ্যানিশ হয়)
        await db.query("DELETE FROM pending_bazar WHERE id = ?", [id]);

        res.json({ success: true, message: "Bazar approved and moved to logs!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// ৪. অ্যাডমিন যখন DENY/REJECT করবে
app.delete('/api/reject-bazar/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM pending_bazar WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: "Bazar request rejected!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});








// ১. বাজার যোগ করা (টেবিল নাম bazar_logs নিশ্চিত করো)


app.post('/add-bazar', async (req, res) => {
    const { user_id, messId, bazar_date, items, total_price } = req.body;

    // আইটেমগুলো অ্যারে হলে কমা দিয়ে স্ট্রিং বানিয়ে নেওয়া
    const itemsString = Array.isArray(items) ? items.join(', ') : items;

    // ভুল ছিল এখানে: কলাম ৫টি কিন্তু '?' ছিল ৪টি। আর mess_id হবে ডাটাবেস অনুযায়ী।
    const sql = "INSERT INTO bazar_logs (user_id, mess_id, bazar_date, items, total_price) VALUES (?, ?, ?, ?, ?)";
    
    try {
        // ৫টি প্যারামিটারই পাঠাতে হবে
        await db.query(sql, [user_id, messId, bazar_date, itemsString, total_price]);
        res.status(201).json({ message: "Bazar added successfully!" });
    } catch (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Failed to store bazar data!" });
    }
});










// ২. নিজের বাজার দেখা (বদলানো হয়েছে: bazars -> bazar_logs)
app.get('/my-bazar/:userId', async (req, res) => {
    const userId = req.params.userId;
    const sql = "SELECT * FROM bazar_logs WHERE user_id = ? ORDER BY bazar_date DESC";
    
    try {
        const [results] = await db.query(sql, [userId]);
        const formattedResults = results.map(row => ({
            ...row,
            items: row.items ? row.items.split(', ') : []
        }));
        res.json(formattedResults);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ৩. টোটাল বাজার (JOIN ব্যবহার করা হয়েছে যাতে username পাওয়া যায়)
app.get('/total-bazar', async (req, res) => {
    // এখানে bazar_logs এর সাথে users টেবিল জয়েন করা হয়েছে
    const sql = `
        SELECT b.*, u.username 
        FROM bazar_logs b 
        JOIN users u ON b.user_id = u.id 
        ORDER BY b.bazar_date DESC
    `;
    
    try {
        const [results] = await db.query(sql);
        const formattedResults = results.map(row => ({
            ...row,
            items: row.items ? row.items.split(', ') : []
        }));
        res.json(formattedResults);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// ============================================  showing  meal segment: ========================================         

app.post("/input_meal", async (req, res) => {
    const { user_id, date, lunch, dinner, guest } = req.body;

    if (!user_id || !date) {
        return res.status(400).json({
            status: "Invalid request. Please provide user_id and date."
        });
    }

    try {
        const query = `INSERT INTO meals (user_id, meal_date, lunch, dinner, guest) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await db.query(query, [user_id, date, lunch, dinner, guest]);

        if (result.affectedRows > 0) {
            return res.status(200).json({
                status: "successful",
                message: "Meal added successfully!"
            });
        }
    } catch (error) {
        // ডুপ্লিকেট এন্ট্রি হলে কনসোলে বড় এরর না দেখিয়ে ইউজারকে মেসেজ দিন
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ // 409 মানে Conflict
                status: "duplicate",
                message: "আপনি এই তারিখের মিল অলরেডি সাবমিট করেছেন!"
            });
        }

        // অন্য কোনো সিরিয়াস এরর হলে তখন কনসোলে দেখাবে
        console.error("Database Error:", error.message);
        return res.status(500).json({
            status: "error",
            message: "ডাটাবেস সার্ভারে সমস্যা হয়েছে।"
        });
    }
});





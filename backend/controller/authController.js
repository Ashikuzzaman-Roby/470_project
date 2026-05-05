const authModel = require('../Models/authModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // মডেল থেকে ফাংশন কল করা হয়েছে
        await authModel.createUser(username, hashedPassword, role);
        
        res.status(201).json({ message: "User Registered Successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "User already exists or Database error!" });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        // মডেল থেকে ইউজার ডাটা আনা হয়েছে
        const results = await authModel.findUserByUsername(username);

        if (results.length === 0) return res.status(404).json({ error: "User not found!" });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(401).json({ error: "Wrong Password!" });

        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET || "SECRET_KEY", 
            { expiresIn: '1h' }
        );
        
        res.json({ 
            message: "Login Successful", 
            token, 
            id: user.id, 
            role: user.role,
            mess_id: user.mess_id, 
            profile_pic: user.profile_pic, 
            username: user.username
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
};
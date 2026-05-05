require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./backend/Routes/authRoutes');
const apiRoutes = require('./backend/Routes/apiRoutes');

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// ১. Use API Routes
app.use('/api', authRoutes);
app.use('/api', apiRoutes);

// ২. Static Folders
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'frontend')));

// ৩. Frontend File Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'home.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin.html')));
app.get('/user', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'user.html')));

// ৪. ভুল পাথ হ্যান্ডেল করার দরকার নেই, উপরের গুলো থাকলেই হবে।
// অথবা শুধু নিচের এই লাইনটি ব্যবহার করতে পারেন:
app.use((req, res) => res.status(404).send("Page not found!"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
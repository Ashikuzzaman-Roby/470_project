#!/bin/bash

echo "🚀 Starting System Recovery & Installation..."

# ১. এনপিএম প্রজেক্ট ইনিশিয়ালাইজ করা
echo "📦 Initializing npm..."
npm init -y

# ২. মেইন প্যাকেজগুলো ইনস্টল করা (Express, SQL/MySQL, Dotenv)
echo "📥 Installing Express, MySQL2, and Dotenv..."
npm install express mysql2 dotenv

# ৩. ডেভেলপার টুলস ইনস্টল করা (Nodemon)
echo "🛠️ Installing Nodemon as a dev dependency..."
npm install --save-dev nodemon

# ৪. ফোল্ডার স্ট্রাকচার ঠিক আছে কি না চেক করা
echo "📂 Checking directory structure..."
mkdir -p backend/controller backend/Models backend/routes

echo "✅ All packages installed successfully!"
echo "💡 Tip: Use 'npx nodemon server.js' to start your server."
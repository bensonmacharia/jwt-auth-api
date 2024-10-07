const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

// Register Route
app.post("/register", async (req, res) => {
    const { firstname, lastname, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ msg: "User already exists" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
        firstname,
        lastname,
        email,
        password: hashedPassword,
    });

    await newUser.save();
    res.json({ msg: "User registered successfully" });
});

// Login Route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid email or password" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid email or password" });

    // Generate JWT token
    const token = jwt.sign({ id: user._id, uid: user.uid }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
});

// Middleware to validate JWT
const auth = (req, res, next) => {
    const token = req.header("Authorization").split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token, authorization denied" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ msg: "Token is not valid" });
    }
};

// Edit user profile Route
app.put('/user/:uid', auth, async (req, res) => {
    try {
        const { firstname, lastname, email } = req.body;

        // Find user by uid and update the fields if they exist in the request body
        const user = await User.findOneAndUpdate(
            { uid: req.params.uid },
            { firstname, lastname, email },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the updated user's profile (excluding password)
        res.json({
            uid: user.uid,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Edit user profile Route
app.put('/profile/edit', auth, async (req, res) => {
    try {
        const { firstname, lastname, email } = req.body;

        // Find user by _id and update the fields if they exist in the request body
        // _id is taken from the JWT token that is submitted with the req
        const user = await User.findOneAndUpdate(
            { uid: req.user.uid },
            { firstname, lastname, email },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the updated user's profile (excluding password)
        res.json({
            id: user._id,
            uid: user.uid,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get User Profile Route
app.get("/profile", auth, async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
});

// Start the server
const PORT = process.env.PORT || 8008;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
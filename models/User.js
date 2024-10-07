const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    uid: {
        type: Number,
        unique: true,
    },
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
});

// Pre-save hook to implement auto-incremental ID
UserSchema.pre("save", async function (next) {
    if (this.isNew) {
        const count = await mongoose.model("User").countDocuments();  // Get the current count of users
        this.uid = count + 1;  // Set the auto-incremental ID
    }
    next();
});

module.exports = mongoose.model("User", UserSchema);

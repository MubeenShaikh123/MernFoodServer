const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }

})
const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true
    },
    used: {
        type: Boolean,
        required: true,
        default: false
    },
    date: {
        type: Date,
        default: Date.now()
    }
})

// Define the sub-schema for menu items
const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    qty: {
        type: Number,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    finalPrice: {
        type: Number,
        required: true
    }
});

const menuSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    cartData: [menuItemSchema]
});


const User = mongoose.model("User", userSchema);
const Otp = mongoose.model("Otp", otpSchema);
const Menu = mongoose.model('Menu', menuSchema);

module.exports = { User, Otp, Menu };
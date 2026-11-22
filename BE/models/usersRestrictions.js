const mongoose = require("mongoose");

const UserRestrictions = new mongoose.Schema({
    withdrawal2Fa: {
        type: Boolean,
        default: false
    },
    requireEmailVerification: {
        type: Boolean,
        default: true
    },
    walletEnabled: {
        type: Boolean,
        default: true
    },
    requireSignupKyc: {
        type: Boolean,
        default: true
    },
    signupCryptoIdCode: {
        type: String,
        default: "CG-2024-ALPHA",
        trim: true
    },
}, { timestamps: true });

let UserRestriction = mongoose.model("UserRestriction", UserRestrictions);

module.exports = UserRestriction;

const mongoose = require("mongoose");

const referralDetailsSchema = new mongoose.Schema(
  {
    referralCode: {
      type: String,
      required: true,
      // unique: true,
      // Code generated for referral (belongs to referredBy user)
    },

    referredBy: {
      type: String, // e.g. "VYDUSER396"
      required: true,
      // The user who shared the referral code
    },

    referredTo: {
      type: String, // e.g. "VYDUSER400"
      default: null,
      // The new user who signs up using the code
    },

    status: {
      type: String,
      enum: ["pending", "completed", "rewarded"],
      default: "pending",
      // "pending"   → when referredTo signs up but has not completed first action (like booking consultation)
      // "completed" → when referredTo completes the first required action
      // "rewarded"  → when reward is issued to referredBy (and maybe referredTo)
    },

    rewardIssued: {
      type: Boolean,
      default: false,
      // Prevents multiple rewards for same referral
      // Updated when status is changed to "rewarded"
    },
  },
  {
    timestamps: true, // Automatically manages createdAt & updatedAt
  }
);

module.exports = mongoose.model("ReferralDetails", referralDetailsSchema);

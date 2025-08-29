const User = require('../models/usersModel');
const OTPVerification = require('../models/otpModels');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const Sequence = require("../sequence/sequenceSchema");
const { SEQUENCE_PREFIX } = require('../utils/constants')
const axios = require('axios');
const referralDetailsModel = require('../models/referralDetailsModel');

const sendSMS = async (params) => {
  try {
    const url = "http://wecann.in/v3/api.php";

    // Trigger the API using axios
    const response = await axios.get(url, { params });

    return response.data; // Return the API response
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw new Error("Failed to send SMS");
  }
};

const sendOTPSMS = async (mobile, OTP) => {
  const template2 =
    "Dear {#var#} Kindly use this otp {#var#} for login to your Application . thank you Wecann";

  const template = "Dear {#var#} Kindly use this {#var#} otp For Login . thank You For choosing - Vydhyo"
  // Function to populate the template with dynamic values
  function populateTemplate(template, values) {
    let index = 0;
    return template.replace(/{#var#}/g, () => values[index++]);
  }

  // Populate the template with the user's name and OTP
  const name = "user"; // Default name for the user
  const message = populateTemplate(template, [name, OTP]);

  // Example Output: Dear User, kindly use this OTP 123456 for login to your application. Thank you, Vydhyo.

  const templateid = "1707175429493821675";

  try {
    const params = {
      username: "VYDHYO",
      apikey: process.env.SMSAPIKEY, // Use API key from environment variables
      senderid: "VYDHYO",
      mobile: mobile,
      message: message,
      templateid: templateid,
    };

    // Call the sendSMS function
    return await sendSMS(params);
  } catch (error) {
    console.error("Error sending OTP SMS:", error);
    throw new Error("Failed to send OTP SMS");
  }
};

exports.validateOtp = async (req, res) => {
  const { userId, OTP: inputOtp } = req.body;
  const latestOTPRecord = await OTPVerification.findOne({ userId }).sort({ createdAt: -1 });
  if (!latestOTPRecord) return res.status(401).json({ message: 'OTP expired...' });
  if (new Date() > latestOTPRecord.expiresAt) return res.status(410).json({ message: 'OTP expired...!' });
  if (latestOTPRecord.otp !== inputOtp) return res.status(400).json({ message: 'Invalid OTP' });

  const user = await User.findOne({ userId });
  const payload = { userid: user.userId, mobile: user.mobile, role: user.role, appLanguage: user.appLanguage };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // user.refreshToken = refreshToken;
  await User.findOneAndUpdate({ userId }, { refreshToken, isLoggedIn: true, lastLogin: new Date() });
  return res.status(200).json({ message: 'OTP verified', "userData": user, accessToken });
}

exports.login = async (req, res) => {

  try {
    const { mobile, userType, language, status, referralCode } = req.body;
    let user = await User.findOne({ mobile, isDeleted: false });
    // If user does not exist and no userType is provided, throw error
    if (!user && !userType) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user && userType) {
      const counter = await Sequence.findByIdAndUpdate({ _id: SEQUENCE_PREFIX.USERSEQUENCE.USER_MODEL }, { $inc: { seq: 1 } }, { new: true, upsert: true });
      const userId = SEQUENCE_PREFIX.USERSEQUENCE.SEQUENCE.concat(counter.seq);

      // Handle referral code
      let referredBy = null;
      if (referralCode) {
        // Check if referral code belongs to an existing user
        const referrer = await User.findOne({ referralCode: referralCode, isDeleted: false });
          if (!referrer) {
          return res
            .status(400)
            .json({ message: "Invalid referral code provided" });
        }
          referredBy = referrer.userId;

          // ✅ Create referralDetails entry
          await referralDetailsModel.create({
            referralCode: referralCode,
            referredBy: referrer.userId, // code owner
            referredTo: userId,          // new user
            status: "pending",           // default until action completed
            rewardIssued: false,
          });
        
      }


      user = new User({
        mobile,
        role: userType,
        userId: userId,
        appLanguage: language,
        status: status || 'inActive',
        isVerified: false,
        isDeleted: false,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        referredBy: referredBy
      });
      await user.save();
    } else {
      // Update existing user's language or userType if needed
      user.appLanguage = language;
      user.updatedAt = new Date();
      await user.save();
    }

    let otpCode;
    if (mobile === '9052519059') {
      otpCode = '123456'; // Fixed OTP for testing  
    }
    else {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    }
    // const otpCode= '123456'
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const saveOtp = new OTPVerification({
      otp: otpCode,
      expiresAt,
      userId: user.userId,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await saveOtp.save();
    try {
      await sendOTPSMS(mobile, otpCode);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      return res.status(500).json({ message: 'Failed to send OTP' });
    }
    // await sendOtp(mobile, otp);
    res.status(200).json({ message: 'OTP sent successfully', userId: user.userId, expiresAt: expiresAt });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  };
}

exports.refreshToken = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized... No refresh token provided' });
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findOne({ 'userId': decoded.userid });
    if (!user || user.refreshToken !== token) return res.status(403).json({ message: "Forbidden...", userId: user.userId });

    const payload = { userid: user.userId, role: user.role, mobile: user.mobile, appLanguage: user.appLanguage };
    const newAccessToken = generateAccessToken(payload);
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Forbidden... Invalid refresh token', Error: err.message });
  }
};


exports.logout = async (req, res) => {
  try {
    const userId = req.headers.userid; // Assuming userId is passed in headers

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'userId is required in headers'
      });
    }

    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Update login status, clear refresh token, and set lastLogout
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        isLoggedIn: false,
        refreshToken: null,
        lastLogout: new Date(), // Set to current timestamp when logout is triggered

      },
      { new: true }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Logout successful',
      data: {
        userId: user.userId,
        isLoggedIn: false,
        lastLogout: updatedUser.lastLogout
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: error.message || 'Internal server error'
    });
  }
};

exports.logout2 = async (req, res) => {
  const token = req.headers.refreshtoken?.split(' ')[1];
  if (token) {
    const decoded = jwt.decode(token);
    if (decoded?.id) {
      await User.findByIdAndUpdate(decoded.id, { $unset: { refreshToken: 1 } });
      return res.status(200).json({ message: "Logout success" });
    }
  }

  res.clearCookie('refreshToken');
  res.sendStatus(204);
};


exports.getReferralDetails = async (req, res) => {
   try {
    const { referralCode } = req.params;
      const { userId } = req.query;

    if (!referralCode) {
      return res.status(400).json({
        status: "fail",
        message: "Referral code is required",
      });
    }

      let query = { referralCode };
    if (userId) {
      query.referredTo = userId;
    }


    // const referral = await referralDetailsModel.findOne({ referralCode }).lean();
     const referrals = await referralDetailsModel
      .find(query)
      .sort({ createdAt: -1 }) // latest first
      .lean();

    // if (!referral) {
    //   return res.status(404).json({
    //     status: "fail",
    //     message: "Referral code not found",
    //   });
    // }
      // Prefer pending if exists
    let referral = referrals.find(r => r.status === "pending") || referrals[0];

    res.status(200).json({
      status: "success",
      data: referral,
    });
  } catch (error) {
    console.error("Error fetching referral:", error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
}

// Update referral status to completed
exports.updateReferralStatus = async (req, res) => {
  try {
    const { referralCode, referredTo } = req.params;

    // Validate input
    if (!referralCode || !referredTo) {
      return res.status(400).json({
        status: 'fail',
        message: 'Referral code and referredTo user ID are required',
      });
    }

    // Find referral
    const referral = await referralDetailsModel.findOne({
      referralCode,
      referredTo
    });

    if (!referral) {
      return res.status(404).json({
        status: 'fail',
        message: 'Referral not found or invalid for this user',
      });
    }

    // Check if referral is already completed or rewarded
    if (referral.status === 'completed' || referral.status === 'rewarded') {
      return res.status(400).json({
        status: 'fail',
        message: `Referral already ${referral.status}`,
      });
    }

    // Update referral status to completed
    referral.status = 'completed';
    const updatedReferral = await referral.save();

    return res.status(200).json({
      status: 'success',
      message: 'Referral status updated to completed',
      data: {
        referralCode: updatedReferral.referralCode,
        referredBy: updatedReferral.referredBy,
        referredTo: updatedReferral.referredTo,
        status: updatedReferral.status,
        updatedAt: updatedReferral.updatedAt
      }
    });

  } catch (err) {
    console.error('Error updating referral status:', err.message);
    return res.status(500).json({
      status: 'fail',
      message: 'Error updating referral status',
      error: err.message,
    });
  }
};
const User = require('../models/usersModel');
const OTPVerification = require('../models/otpModels');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const Sequence = require("../sequence/sequenceSchema");
const { SEQUENCE_PREFIX } = require('../utils/constants')

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
  await User.findOneAndUpdate({ userId }, { refreshToken });

  return res.status(200).json({ message: 'OTP verified',"userData":user, accessToken });
}

exports.login = async (req, res) => {
  const { mobile, userType, language } = req.body;
  let user = await User.findOne({ mobile });

  if (!user) {
    const counter = await Sequence.findByIdAndUpdate({ _id: SEQUENCE_PREFIX.USERSEQUENCE.USER_MODEL }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const userId = SEQUENCE_PREFIX.USERSEQUENCE.SEQUENCE.concat(counter.seq);
    user = new User({
      mobile,
      role: userType,
      userId: userId,
      appLanguage: language,
      status: 'inActive',
      isVerified: false,
      isDeleted: false,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await user.save();
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
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
  // await sendOtp(mobile, otp);
  res.status(200).json({ message: 'OTP sent successfully', userId: user.userId, expiresAt: expiresAt });
};

exports.refreshToken = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized... No refresh token provided' });
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findOne({'userId': decoded.userid});
    if (!user || user.refreshToken !== token) return  res.status(403).json({ message: "Forbidden...", userId: user.userId});

    const payload = { userid: user.userId, role: user.role, mobile: user.mobile, appLanguage: user.appLanguage };
    const newAccessToken = generateAccessToken(payload);
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Forbidden... Invalid refresh token', Error: err.message });
  }
};

exports.logout = async (req, res) => {
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

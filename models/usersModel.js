const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  role: String,
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  mobile: {
    type: String,
    lowercase: true,
    trim: true
  },
  userId: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inActive'],
    default: 'inActive'
  },
  refreshToken: { type: String }, 
  language: {
    type: String,
    enum: ['en', 'hi', 'tel'],
    default: 'en'
  },
  relationship: {
    type: String,
    enum: ['parent', 'child', 'self', 'other'],
    default: 'self'
  },
  parentid: {
    type: String,
    default: null
  },
  profilepic: String,
  gender: {
    type: String,
    default: null
  },
  DOB: {
    type: Date,
    default: null
  },
  bloodgroup: {
    type: String,
    default: null
  },
  maritalStatus : {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },  
  createdBy: {
    type: String,
    default: null
  },
  updatedBy: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
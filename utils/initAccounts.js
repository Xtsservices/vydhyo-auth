const User = require('../models/usersModel');
const Sequence = require('../sequence/sequenceSchema');
const { SEQUENCE_PREFIX } = require('./constants');

// List of initial accounts to create
const initialAccounts = [
  {
    mobile: '9985288579',
    userType: 'superadmin',
    language: 'en',
    name: 'Karthik',
    firstname: 'Karthik',
    lastname: 'vydhyo',
    email: '',
    gender: 'male',
    DOB: '1980-01-01',
    maritalStatus: 'married',
    spokenLanguage: ['en'],
    relationship: 'self'
  },
  {
    mobile: ' 9666679000',
    userType: 'superadmin',
    language: 'en',
    firstname: 'Geeta',
    lastname: 'vydhyo',
    email: '',
    gender: 'female',
    DOB: '1982-02-02',
    maritalStatus: 'married',
    spokenLanguage: ['en'],
    relationship: 'self'
  },
  {
    mobile: '9849526028',
    userType: 'superadmin',
    language: 'en',
    firstname: 'Kalyan ',
    lastname: 'Vydhyo',
    gender: 'male',
    DOB: '1985-03-03',
    maritalStatus: 'married',
    spokenLanguage: ['en'],
    relationship: 'self'
  }
];

async function createInitialAccounts() {
  for (const acc of initialAccounts) {
    let user = await User.findOne({ mobile: acc.mobile });
    if (!user) {
      const counter = await Sequence.findByIdAndUpdate(
        { _id: SEQUENCE_PREFIX.USERSEQUENCE.USER_MODEL },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const userId = SEQUENCE_PREFIX.USERSEQUENCE.SEQUENCE.concat(counter.seq);
      user = new User({
        mobile: acc.mobile,
        role: acc.userType,
        userId: userId,
        appLanguage: acc.language,
        name: acc.name,
        firstname: acc.firstname,
        lastname: acc.lastname,
        email: acc.email,
        gender: acc.gender,
        DOB: acc.DOB,
        maritalStatus: acc.maritalStatus,
        spokenLanguage: acc.spokenLanguage,
        relationship: acc.relationship,
        status: 'Active',
        isVerified: false,
        isDeleted: false,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await user.save();
      console.log(`Created user for mobile: ${acc.mobile}`);
    } else {
      console.log(`User already exists for mobile: ${acc.mobile}`);
    }
  }
}

module.exports = createInitialAccounts;

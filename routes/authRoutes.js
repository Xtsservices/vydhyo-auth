const express = require('express');
const router = express.Router();
const authController = require('../controllers/authCcontroller');


router.post('/login', authController.login);
router.post('/doctorLogin', authController.doctorLogin); //temp login for doctor app with static number
router.post('/whatsappuser', authController.whatsappuser);
router.post('/validateOtp', authController.validateOtp);
router.get('/refreshToken', authController.refreshToken);
router.post('/logout', authController.logout);

router.get('/referral/:referralCode', authController.getReferralDetails);
router.patch('/referral/:referralCode/:referredTo', authController.updateReferralStatus);
router.get('/referral/:referralCode/:appointmentId', authController.getReferralByCodeAndAppointment);
router.patch('/referralCode/:referralCode/:appointmentId', authController.updateReferralStatusByCodeAndAppointment);



module.exports = router;
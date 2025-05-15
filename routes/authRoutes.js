const express = require('express');
const router = express.Router();
const authController = require('../controllers/authCcontroller');


router.post('/login', authController.login);
router.post('/validateOtp', authController.validateOtp);
router.get('/refreshToken', authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;
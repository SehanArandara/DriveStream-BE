const router = require('express').Router();
const { 
  register, login, googleLogin, getMe, createStaff, verifyOTP, 
  forgotPassword, resetPassword, setupStaffPassword, completeProfile, resendOTP
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/register',             register);
router.post('/login',                login);
router.post('/google',               googleLogin);
router.post('/verify-otp',           verifyOTP);
router.post('/resend-otp',           resendOTP);
router.post('/forgot-password',      forgotPassword);
router.post('/reset-password',       resetPassword);
router.post('/setup-staff-password', setupStaffPassword);
router.get( '/me',            protect, getMe);
router.post('/complete-profile', protect, completeProfile);
router.post('/create-staff',     protect, authorize('admin'), createStaff);

module.exports = router;

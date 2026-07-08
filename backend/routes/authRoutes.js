/**
 * Auth Routes
 */
const router = require('express').Router();
const auth = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { registerRules, loginRules, otpSendRules, otpVerifyRules, validate } = require('../middleware/validators');

router.post('/register', registerRules, validate, auth.register);
router.post('/login', loginRules, validate, auth.login);
router.post('/refresh', auth.refreshToken);
router.get('/profile', protect, auth.getProfile);
router.put('/profile', protect, auth.updateProfile);
router.post('/otp/send', otpSendRules, validate, auth.sendOTP);
router.post('/otp/verify', otpVerifyRules, validate, auth.verifyOTP);
router.post('/forgot-password', otpSendRules, validate, auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);

module.exports = router;

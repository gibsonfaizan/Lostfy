/**
 * Claim Routes
 */
const router = require('express').Router();
const claims = require('../controllers/claimController');
const { protect } = require('../middleware/authMiddleware');
const { createClaimRules, submitAnswerRules, validate } = require('../middleware/validators');

router.post('/', protect, createClaimRules, validate, claims.createClaim);
router.get('/mine', protect, claims.getMyClaims);
router.get('/:id', protect, claims.getClaim);
router.post('/:id/answers', protect, submitAnswerRules, validate, claims.submitAnswers);
router.put('/:id/status', protect, claims.updateClaimStatus);
router.post('/:id/meeting', protect, claims.createMeeting);
router.post('/:id/handshake', protect, claims.verifyHandshake);
router.get('/questions/:itemId', protect, claims.getQuestions);
router.get('/matches/:itemId', protect, claims.getMatches);

module.exports = router;

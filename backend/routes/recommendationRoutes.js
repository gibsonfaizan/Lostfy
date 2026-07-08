/**
 * Recommendation Routes
 */
const router = require('express').Router();
const rec = require('../controllers/recommendationController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/nearby', optionalAuth, rec.getNearby);
router.get('/matches/:itemId', optionalAuth, rec.getMatchResults);

module.exports = router;

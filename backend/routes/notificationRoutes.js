/**
 * Notification Routes
 */
const router = require('express').Router();
const notif = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, notif.getNotifications);
router.put('/:id/read', protect, notif.markRead);
router.put('/read-all', protect, notif.markAllRead);

module.exports = router;

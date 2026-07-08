/**
 * Admin Routes — all protected + admin-only
 */
const router = require('express').Router();
const admin = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

router.get('/stats', admin.getStats);
router.get('/items', admin.getAllItems);
router.get('/users', admin.getAllUsers);
router.get('/claims', admin.getAllClaims);
router.put('/items/:id/moderate', admin.moderateItem);
router.put('/users/:id/role', admin.updateUserRole);
router.get('/logs', admin.getLogs);

module.exports = router;

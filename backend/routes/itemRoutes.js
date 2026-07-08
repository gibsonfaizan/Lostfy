/**
 * Item Routes
 */
const router = require('express').Router();
const items = require('../controllers/itemController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { uploadImages } = require('../middleware/uploadMiddleware');
const { createItemRules, validate } = require('../middleware/validators');

router.post('/', protect, uploadImages, createItemRules, validate, items.createItem);
router.get('/search', optionalAuth, items.searchItems);
router.get('/mine', protect, items.getMyItems);
router.get('/:id', optionalAuth, items.getItem);
router.put('/:id', protect, items.updateItem);
router.delete('/:id', protect, items.deleteItem);

module.exports = router;

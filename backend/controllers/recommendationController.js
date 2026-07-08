/**
 * Recommendation Controller — Nearby items and AI-suggested matches
 */
const ItemModel = require('../models/itemModel');
const ClaimModel = require('../models/claimModel');

/* ========== Get Nearby Recommendations ========== */
exports.getNearby = async (req, res, next) => {
    try {
        const { lat, lng, radius, limit } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'lat and lng are required' });
        }
        const items = await ItemModel.findNearby(
            parseFloat(lat), parseFloat(lng),
            parseFloat(radius) || 10,
            parseInt(limit) || 20
        );
        res.json({ success: true, data: items });
    } catch (err) { next(err); }
};

/* ========== Get AI Match Results for a Lost Item ========== */
exports.getMatchResults = async (req, res, next) => {
    try {
        const matches = await ClaimModel.getMatches(req.params.itemId);
        const item = await ItemModel.findById(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.json({ success: true, data: { item, matches } });
    } catch (err) { next(err); }
};

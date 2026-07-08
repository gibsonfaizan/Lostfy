const axios = require('axios');
const ItemModel = require('../models/itemModel');
const ClaimModel = require('../models/claimModel');
const { NotificationModel } = require('../models/notificationModel');

/* ========== Create Item ========== */
exports.createItem = async (req, res, next) => {
    try {
        const { type, category, title, description, location_lat, location_lng, location_text, verification_questions } = req.body;

        // Build image URL from uploaded files
        let imageUrl = null;
        if (req.files && req.files.length > 0) {
            imageUrl = req.files.map(f => `/uploads/${f.filename}`).join(',');
        }

        const itemId = await ItemModel.create({
            user_id: req.user.id,
            type, category, title, description,
            location_lat, location_lng, location_text,
            image_url: imageUrl,
            ai_tags: [], ocr_text: null,
        });

        // Add verification questions for lost items
        if (type === 'lost' && verification_questions) {
            const questions = Array.isArray(verification_questions) ? verification_questions : JSON.parse(verification_questions);
            await ClaimModel.addQuestions(itemId, questions);
        }

        // Trigger AI processing in the background (or block for response)
        let aiTags = [];
        let ocrText = null;
        if (imageUrl) {
            try {
                const aiUrl = `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/api/process`;
                const aiRes = await axios.post(aiUrl, {
                    item_id: itemId,
                    image_paths: imageUrl.split(',')
                });

                if (aiRes.data && aiRes.data.tags) {
                    aiTags = aiRes.data.tags;
                    ocrText = aiRes.data.ocr_text;
                    // Update item with AI results and set status to active/matching
                    await ItemModel.update(itemId, {
                        ai_tags: aiTags,
                        ocr_text: ocrText
                    });
                }
            } catch (aiErr) {
                console.error('⚠️  AI Service integration failure:', aiErr.message);
                // System remains functional even if AI microservice is offline
            }
        }

        const item = await ItemModel.findById(itemId);
        res.status(201).json({ success: true, message: `${type === 'lost' ? 'Lost' : 'Found'} item reported`, data: item });
    } catch (err) { next(err); }
};

/* ========== Get Single Item ========== */
exports.getItem = async (req, res, next) => {
    try {
        const item = await ItemModel.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        // Include verification questions if the viewer owns the item
        let questions = [];
        if (req.user && req.user.id === item.user_id) {
            questions = await ClaimModel.getQuestions(item.id);
        }

        res.json({ success: true, data: { ...item, verification_questions: questions } });
    } catch (err) { next(err); }
};

/* ========== Update Item ========== */
exports.updateItem = async (req, res, next) => {
    try {
        const item = await ItemModel.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        if (item.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this item' });
        }

        await ItemModel.update(req.params.id, req.body);
        const updated = await ItemModel.findById(req.params.id);
        res.json({ success: true, message: 'Item updated', data: updated });
    } catch (err) { next(err); }
};

/* ========== Delete Item ========== */
exports.deleteItem = async (req, res, next) => {
    try {
        const item = await ItemModel.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        if (item.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this item' });
        }

        await ItemModel.delete(req.params.id);
        res.json({ success: true, message: 'Item deleted' });
    } catch (err) { next(err); }
};

/* ========== Search Items ========== */
exports.searchItems = async (req, res, next) => {
    try {
        const { type, category, status, q, lat, lng, radius, page, limit } = req.query;
        const results = await ItemModel.search({
            type, category, status,
            query: q,
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null,
            radius_km: radius ? parseFloat(radius) : 10,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
        });
        res.json({ success: true, data: results });
    } catch (err) { next(err); }
};

/* ========== Get My Items ========== */
exports.getMyItems = async (req, res, next) => {
    try {
        const { type } = req.query;
        const items = await ItemModel.findByUser(req.user.id, type);
        res.json({ success: true, data: items });
    } catch (err) { next(err); }
};

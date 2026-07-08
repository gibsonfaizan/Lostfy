/**
 * Admin Controller — Platform management, moderation, and logs
 */
const ItemModel = require('../models/itemModel');
const UserModel = require('../models/userModel');
const ClaimModel = require('../models/claimModel');
const { AdminLogModel, NotificationModel } = require('../models/notificationModel');

/* ========== Platform Stats ========== */
exports.getStats = async (req, res, next) => {
    try {
        const itemStats = await ItemModel.getStats();
        const userStats = await UserModel.findAll({ page: 1, limit: 1 });
        const stats = {
            ...itemStats,
            total_users: userStats.total,
            return_rate: itemStats.total_items > 0
                ? ((itemStats.closed_items / itemStats.total_items) * 100).toFixed(1) + '%'
                : '0%',
        };
        res.json({ success: true, data: stats });
    } catch (err) { next(err); }
};

/* ========== All Items (Paginated) ========== */
exports.getAllItems = async (req, res, next) => {
    try {
        const { page, limit, type, status } = req.query;
        const result = await ItemModel.findAll({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            type, status,
        });
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

/* ========== All Users (Paginated) ========== */
exports.getAllUsers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const result = await UserModel.findAll({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
        });
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

/* ========== All Claims ========== */
exports.getAllClaims = async (req, res, next) => {
    try {
        const { page, limit, status } = req.query;
        const claims = await ClaimModel.findAll({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            status,
        });
        res.json({ success: true, data: claims });
    } catch (err) { next(err); }
};

/* ========== Moderate Item (admin-level update) ========== */
exports.moderateItem = async (req, res, next) => {
    try {
        const { status } = req.body;
        const item = await ItemModel.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        await ItemModel.update(req.params.id, { status });
        await AdminLogModel.create({
            admin_id: req.user.id,
            action: 'moderate_item',
            details: `Set item #${req.params.id} status to ${status}`,
        });

        // Notify item owner
        await NotificationModel.create({
            user_id: item.user_id,
            title: 'Item Status Updated',
            message: `Your item "${item.title}" status was changed to "${status}" by admin.`,
        });

        res.json({ success: true, message: `Item status updated to ${status}` });
    } catch (err) { next(err); }
};

/* ========== Update User Role ========== */
exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const user = await UserModel.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        await UserModel.update(req.params.id, { role });
        await AdminLogModel.create({
            admin_id: req.user.id,
            action: 'update_role',
            details: `Changed user #${req.params.id} role to ${role}`,
        });

        res.json({ success: true, message: `User role updated to ${role}` });
    } catch (err) { next(err); }
};

/* ========== Get System Logs ========== */
exports.getLogs = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const logs = await AdminLogModel.findAll({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50,
        });
        res.json({ success: true, data: logs });
    } catch (err) { next(err); }
};

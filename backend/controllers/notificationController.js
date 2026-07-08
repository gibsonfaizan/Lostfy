/**
 * Notification Controller — In-app notification management
 */
const { NotificationModel } = require('../models/notificationModel');

/* ========== Get My Notifications ========== */
exports.getNotifications = async (req, res, next) => {
    try {
        const { unread } = req.query;
        const notifications = await NotificationModel.findByUser(req.user.id, {
            unreadOnly: unread === 'true',
        });
        const unreadCount = await NotificationModel.getUnreadCount(req.user.id);
        res.json({ success: true, data: { notifications, unreadCount } });
    } catch (err) { next(err); }
};

/* ========== Mark Notification as Read ========== */
exports.markRead = async (req, res, next) => {
    try {
        await NotificationModel.markRead(req.params.id, req.user.id);
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) { next(err); }
};

/* ========== Mark All as Read ========== */
exports.markAllRead = async (req, res, next) => {
    try {
        await NotificationModel.markAllRead(req.user.id);
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) { next(err); }
};

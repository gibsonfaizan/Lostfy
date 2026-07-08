/**
 * Claim Controller — Claim lifecycle, verification answers, meetings
 */
const ClaimModel = require('../models/claimModel');
const ItemModel = require('../models/itemModel');
const UserModel = require('../models/userModel');
const { NotificationModel } = require('../models/notificationModel');
const { v4: uuidv4 } = require('uuid');

/* ========== Create Claim ========== */
exports.createClaim = async (req, res, next) => {
    try {
        const { found_item_id, lost_item_id } = req.body;

        // Ensure found item exists and is active
        const foundItem = await ItemModel.findById(found_item_id);
        if (!foundItem) return res.status(404).json({ success: false, message: 'Found item does not exist' });
        if (foundItem.status !== 'active') return res.status(400).json({ success: false, message: 'Item is no longer claimable' });

        // Prevent claiming your own item
        if (foundItem.user_id === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot claim your own item' });
        }

        const claimId = await ClaimModel.create({
            lost_item_id, found_item_id, claimer_id: req.user.id,
        });

        // Notify the finder
        await NotificationModel.create({
            user_id: foundItem.user_id,
            title: 'New Claim Submitted',
            message: `${req.user.name} has claimed "${foundItem.title}". Review their answers.`,
        });

        const claim = await ClaimModel.findById(claimId);
        res.status(201).json({ success: true, message: 'Claim submitted', data: claim });
    } catch (err) { next(err); }
};

/* ========== Get Claim Details ========== */
exports.getClaim = async (req, res, next) => {
    try {
        const claim = await ClaimModel.findById(req.params.id);
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
        const answers = await ClaimModel.getAnswers(claim.id);
        res.json({ success: true, data: { ...claim, answers } });
    } catch (err) { next(err); }
};

/* ========== Submit Verification Answers ========== */
exports.submitAnswers = async (req, res, next) => {
    try {
        const { answers } = req.body; // [{ question_id, answer }]
        const claim = await ClaimModel.findById(req.params.id);
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
        if (claim.claimer_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await ClaimModel.submitAnswers(claim.id, answers);
        await ClaimModel.update(claim.id, { status: 'under_review' });

        res.json({ success: true, message: 'Answers submitted for review' });
    } catch (err) { next(err); }
};

/* ========== Approve / Reject Claim ========== */
exports.updateClaimStatus = async (req, res, next) => {
    try {
        const { status } = req.body; // 'approved' | 'rejected'
        const claim = await ClaimModel.findById(req.params.id);
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

        // Only item finder or admin can approve/reject
        const foundItem = await ItemModel.findById(claim.found_item_id);
        if (foundItem.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to review this claim' });
        }

        await ClaimModel.update(claim.id, { status });

        if (status === 'approved') {
            // Update item status
            await ItemModel.update(claim.found_item_id, { status: 'claimed' });
            // Increase claimer trust score
            await UserModel.updateTrustScore(claim.claimer_id, 5);

            // Notify claimer
            await NotificationModel.create({
                user_id: claim.claimer_id,
                title: 'Claim Approved! 🎉',
                message: `Your claim for "${foundItem.title}" was approved. Set up a meeting for handover.`,
            });
        } else {
            await NotificationModel.create({
                user_id: claim.claimer_id,
                title: 'Claim Rejected',
                message: `Your claim for "${foundItem.title}" was not approved.`,
            });
            await UserModel.updateTrustScore(claim.claimer_id, -2);
        }

        res.json({ success: true, message: `Claim ${status}` });
    } catch (err) { next(err); }
};

/* ========== Get My Claims ========== */
exports.getMyClaims = async (req, res, next) => {
    try {
        const claims = await ClaimModel.findByClaimer(req.user.id);
        res.json({ success: true, data: claims });
    } catch (err) { next(err); }
};

/* ========== Get Verification Questions ========== */
exports.getQuestions = async (req, res, next) => {
    try {
        const questions = await ClaimModel.getQuestions(req.params.itemId);
        res.json({ success: true, data: questions });
    } catch (err) { next(err); }
};

/* ========== Create Meeting ========== */
exports.createMeeting = async (req, res, next) => {
    try {
        const { meeting_time, meeting_location } = req.body;
        const claim = await ClaimModel.findById(req.params.id);
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

        const handshakeHash = uuidv4();
        const meetingId = await ClaimModel.createMeeting({
            claim_id: claim.id,
            meeting_time,
            meeting_location,
            handshake_hash: handshakeHash,
        });

        res.status(201).json({
            success: true,
            message: 'Meeting scheduled',
            data: { meeting_id: meetingId, handshake_hash: handshakeHash },
        });
    } catch (err) { next(err); }
};

/* ========== Verify Handshake (QR Scan) ========== */
exports.verifyHandshake = async (req, res, next) => {
    try {
        const { hash } = req.body;
        const isValid = await ClaimModel.verifyHandshake(req.params.id, hash);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid QR code or meeting already completed' });
        }

        // Mark item as closed
        const claim = await ClaimModel.findById(req.params.id);
        if (claim) {
            await ItemModel.update(claim.found_item_id, { status: 'closed' });
            await ClaimModel.update(claim.id, { status: 'completed' });
            await UserModel.updateTrustScore(claim.claimer_id, 10);
        }

        res.json({ success: true, message: 'Handover verified! Item successfully returned. 🎉' });
    } catch (err) { next(err); }
};

/* ========== Get AI Matches for a Lost Item ========== */
exports.getMatches = async (req, res, next) => {
    try {
        const matches = await ClaimModel.getMatches(req.params.itemId);
        res.json({ success: true, data: matches });
    } catch (err) { next(err); }
};

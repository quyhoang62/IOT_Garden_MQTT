/**
 * ============================================================================
 * FILE: routes/notificationRouter.js
 * MÔ TẢ: Router xử lý các routes liên quan đến thông báo
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middlewares/authMiddleware');

/**
 * GET /api/v1/notifications/settings
 * Lấy cài đặt thông báo của user hiện tại
 */
router.get('/settings', authenticate, notificationController.getNotificationSettings);

/**
 * PUT /api/v1/notifications/settings
 * Cập nhật cài đặt thông báo
 */
router.put('/settings', authenticate, notificationController.updateNotificationSettings);

/**
 * POST /api/v1/notifications/test-email
 * Gửi test email
 */
router.post('/test-email', authenticate, notificationController.sendTestEmail);

module.exports = router;









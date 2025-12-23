/**
 * ============================================================================
 * FILE: routes/scheduleRouter.js
 * MÔ TẢ: Router xử lý các routes liên quan đến lịch tưới
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

/**
 * GET /api/v1/schedules/device/:deviceId
 * Lấy tất cả lịch tưới theo Device ID
 */
router.get('/device/:deviceId', scheduleController.getSchedules);

/**
 * POST /api/v1/schedules
 * Tạo lịch tưới mới
 */
router.post('/', scheduleController.createSchedule);

/**
 * PUT /api/v1/schedules/:scheduleId
 * Cập nhật lịch tưới
 */
router.put('/:scheduleId', scheduleController.updateSchedule);

/**
 * DELETE /api/v1/schedules/:scheduleId
 * Xóa lịch tưới
 */
router.delete('/:scheduleId', scheduleController.deleteSchedule);

/**
 * POST /api/v1/schedules/:scheduleId/toggle
 * Toggle status của lịch (Active/Paused)
 */
router.post('/:scheduleId/toggle', scheduleController.toggleScheduleStatus);

module.exports = router;


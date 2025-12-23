/**
 * ============================================================================
 * FILE: routes/thresholdRouter.js
 * MÔ TẢ: Routes quản lý ngưỡng tưới tự động
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const thresholdController = require('../controllers/thresholdController');

// GET /api/v1/thresholds/:deviceId - Lấy ngưỡng theo Device ID
router.get('/:deviceId', thresholdController.getThreshold);

// PUT /api/v1/thresholds/:deviceId - Cập nhật ngưỡng
router.put('/:deviceId', thresholdController.updateThreshold);

// POST /api/v1/thresholds/:deviceId/toggle - Bật/tắt tưới tự động
router.post('/:deviceId/toggle', thresholdController.toggleAutoWatering);

module.exports = router;

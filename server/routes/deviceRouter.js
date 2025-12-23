/**
 * ============================================================================
 * FILE: routes/deviceRouter.js
 * MÔ TẢ: Routes quản lý thiết bị ESP32
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// GET /api/v1/devices - Lấy tất cả devices
router.get('/', deviceController.getAllDevices);

// Bỏ route getDevicesByGardenId vì không còn garden

// GET /api/v1/devices/:id - Lấy device theo ID
router.get('/:id', deviceController.getDeviceById);

// POST /api/v1/devices - Thêm device mới
router.post('/', deviceController.addDevice);

// PUT /api/v1/devices/:id - Cập nhật device
router.put('/:id', deviceController.updateDevice);

// DELETE /api/v1/devices/:id - Xóa device
router.delete('/:id', deviceController.deleteDevice);

module.exports = router;

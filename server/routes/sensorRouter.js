/**
 * ============================================================================
 * FILE: routes/sensorRouter.js
 * MÔ TẢ: Router xử lý các routes liên quan đến dữ liệu Sensor
 * ============================================================================
 * 
 * Router này định nghĩa các endpoints để truy xuất dữ liệu từ cảm biến IoT.
 * Hỗ trợ lấy dữ liệu từ 3 loại sensor: DHT20, Soil Moisture, và Water Pump.
 * 
 * BASE PATH: /api/v1 (được mount trong server.js)
 * 
 * ENDPOINTS:
 * ┌────────┬────────────────────────────────────┬────────────────────────────────┐
 * │ Method │ Endpoint                           │ Mô tả                          │
 * ├────────┼────────────────────────────────────┼────────────────────────────────┤
 * │ GET    │ /api/v1/sensor-data/:gardenId      │ Lấy tất cả sensor data (JOIN)  │
 * │ GET    │ /api/v1/soil-moisture/:deviceId    │ Lấy dữ liệu độ ẩm đất          │
 * │ GET    │ /api/v1/dht20/:deviceId            │ Lấy dữ liệu DHT20 (temp+humid) │
 * │ GET    │ /api/v1/water-pump/:deviceId       │ Lấy lịch sử máy bơm            │
 * └────────┴────────────────────────────────────┴────────────────────────────────┘
 * 
 * QUERY PARAMETERS (áp dụng cho tất cả endpoints):
 * - limit: Số lượng records tối đa (default: 10)
 * 
 * VÍ DỤ: GET /api/v1/dht20/1?limit=20
 * 
 * ============================================================================
 */

/**
 * Import Express và tạo Router instance
 */
const express = require('express');
const router = express.Router();

/**
 * Import sensorController chứa logic xử lý cho mỗi route
 */
const sensorController = require('../controllers/sensorController')

/**
 * ============================================================================
 * ROUTE: GET /api/v1/sensor-data/:gardenId
 * MÔ TẢ: Lấy dữ liệu kết hợp từ tất cả sensors của một garden
 * ============================================================================
 * 
 * URL PARAMS:
 * - :gardenId - ID của garden (number)
 * 
 * QUERY PARAMS:
 * - limit - Số lượng records (default: 10)
 * 
 * RESPONSE:
 * - Thành công (200):
 *   [{
 *     soil_moisture_Time, soil_moisture_Value,
 *     dht_Time, dht_Temp, dht_Humid,
 *     water_pump_Time, water_pump_Value
 *   }, ...]
 * - Invalid garden ID (400): { error: "Invalid garden ID" }
 * - Invalid limit (400): { error: "Invalid limit value" }
 * - Lỗi server (500): { error: "An error occurred while fetching sensor data" }
 * 
 * VÍ DỤ: GET /api/v1/sensor-data/1?limit=20
 * 
 * CẢNH BÁO: Query này JOIN 3 bảng, có thể chậm với dataset lớn
 */
router.get('/sensor-data/:deviceId', sensorController.getSensorData);

/**
 * ============================================================================
 * ROUTE: GET /api/v1/soil-moisture/:deviceId
 * MÔ TẢ: Lấy dữ liệu độ ẩm đất của một device
 * ============================================================================
 * 
 * URL PARAMS:
 * - :deviceId - ID của device (number)
 * 
 * QUERY PARAMS:
 * - limit - Số lượng records (default: 10)
 * - startDate - Ngày bắt đầu (optional, format: YYYY-MM-DD)
 * - endDate - Ngày kết thúc (optional, format: YYYY-MM-DD)
 * 
 * RESPONSE:
 * - Thành công (200):
 *   [{
 *     soil_moisture_Time: "2024-01-15 10:30:00",
 *     soil_moisture_Value: 45
 *   }, ...]
 * 
 * VÍ DỤ: GET /api/v1/soil-moisture/1?limit=50&startDate=2024-01-15&endDate=2024-01-16
 * 
 * LƯU Ý: Dữ liệu được sắp xếp theo thời gian mới nhất trước
 */
router.get('/soil-moisture/:deviceId', sensorController.getSoilMoistureData);

/**
 * ============================================================================
 * ROUTE: GET /api/v1/dht20/:deviceId
 * MÔ TẢ: Lấy dữ liệu nhiệt độ và độ ẩm không khí từ DHT20
 * ============================================================================
 * 
 * URL PARAMS:
 * - :deviceId - ID của device (number)
 * 
 * QUERY PARAMS:
 * - limit - Số lượng records (default: 10)
 * - startDate - Ngày bắt đầu (optional, format: YYYY-MM-DD)
 * - endDate - Ngày kết thúc (optional, format: YYYY-MM-DD)
 * 
 * RESPONSE:
 * - Thành công (200):
 *   [{
 *     dht_Time: "2024-01-15 10:30:00",
 *     dht_Temp: 28.5,    // Nhiệt độ (°C)
 *     dht_Humid: 65      // Độ ẩm không khí (%)
 *   }, ...]
 * 
 * VÍ DỤ: GET /api/v1/dht20/1?limit=100
 * 
 * USE CASE: Vẽ biểu đồ nhiệt độ/độ ẩm theo thời gian
 */
router.get('/dht20/:deviceId', sensorController.getDht20Data);

/**
 * ============================================================================
 * ROUTE: GET /api/v1/water-pump/:deviceId
 * MÔ TẢ: Lấy lịch sử hoạt động máy bơm (chỉ lấy lúc BẬT)
 * ============================================================================
 * 
 * URL PARAMS:
 * - :deviceId - ID của device (number)
 * 
 * QUERY PARAMS:
 * - limit - Số lượng records (default: 10)
 * 
 * RESPONSE:
 * - Thành công (200):
 *   [{
 *     water_pump_Time: "2024-01-15 10:30:00",
 *     water_pump_Value: 1    // Luôn = 1 (chỉ lấy lúc bật)
 *   }, ...]
 * 
 * VÍ DỤ: GET /api/v1/water-pump/1?limit=30
 * 
 * USE CASE:
 * - Xem lịch sử tưới nước
 * - Thống kê số lần tưới trong ngày/tuần/tháng
 */
router.get('/water-pump/:deviceId', sensorController.getWaterPumpData);

/**
 * Export router để mount trong server.js
 */
module.exports = router;
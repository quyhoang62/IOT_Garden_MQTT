/**
 * ============================================================================
 * FILE: routes/mqttRouter.js
 * MÔ TẢ: Router xử lý các routes liên quan đến MQTT và điều khiển thiết bị IoT
 * ============================================================================
 * 
 * Router này định nghĩa các endpoints để:
 * 1. Lấy dữ liệu real-time từ các sensors
 * 2. Điều khiển thiết bị (máy bơm)
 * 
 * BASE PATH: / (được mount ở root trong server.js)
 * 
 * ENDPOINTS:
 * ┌────────┬─────────────────────┬──────────────────────────────────────────────┐
 * │ Method │ Endpoint            │ Mô tả                                        │
 * ├────────┼─────────────────────┼──────────────────────────────────────────────┤
 * │ GET    │ /latest-message     │ Lấy giá trị mới nhất từ tất cả sensors       │
 * │ POST   │ /startPump          │ Bật máy bơm (tự tắt sau 10 giây)             │
 * └────────┴─────────────────────┴──────────────────────────────────────────────┘
 * 
 * MQTT COMMUNICATION:
 * - Client gọi API -> Server publish MQTT message -> IoT Device thực thi
 * - IoT Device publish data -> Server subscribe và cache -> Client poll API
 * 
 * ============================================================================
 */

/**
 * Import Express và tạo Router instance
 */
const express = require('express');
const router = express.Router();

/**
 * Import mqttController chứa logic xử lý MQTT
 */
const mqttController = require('../controllers/mqttController')

/**
 * ============================================================================
 * ROUTE: GET /latest-message
 * MÔ TẢ: Lấy giá trị mới nhất từ tất cả sensors
 * ============================================================================
 * 
 * Endpoint này trả về dữ liệu được cache trong memory,
 * được cập nhật mỗi khi server nhận message từ MQTT broker.
 * 
 * RESPONSE:
 * {
 *   "message": {
 *     "pump": 0,              // Trạng thái máy bơm (0=tắt, 1=bật)
 *     "air_temperature": 28.5, // Nhiệt độ không khí (°C)
 *     "air_humid": 65,        // Độ ẩm không khí (%)
 *     "soil_moisture": 45     // Độ ẩm đất (%)
 *   }
 * }
 * 
 * LƯU Ý:
 * - Giá trị có thể là null nếu chưa nhận được data từ sensor
 * - Đây là data real-time, không lấy từ database
 * 
 * USE CASE:
 * - Dashboard polling để hiển thị data real-time
 * - Mobile app hiển thị trạng thái hiện tại
 */
router.get('/latest-message', mqttController.getLatestMessage);

/**
 * ============================================================================
 * ROUTE: POST /startPump
 * MÔ TẢ: Bật máy bơm tưới nước (tự động tắt sau 10 giây)
 * ============================================================================
 * 
 * Endpoint này gửi command đến IoT device qua MQTT để bật máy bơm.
 * Sau 10 giây, server sẽ tự động gửi command tắt máy bơm.
 * 
 * REQUEST BODY:
 * {
 *   "pump": "pump1"    // ID hoặc tên máy bơm (dùng cho logging)
 * }
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Pump started" }
 * 
 * MQTT FLOW:
 * 1. Server publish '1' đến topic IOTGARDEN222/feeds/V1 -> Bật pump
 * 2. setTimeout 10 giây
 * 3. Server publish '0' đến topic IOTGARDEN222/feeds/V1 -> Tắt pump
 * 
 * THỜI GIAN TƯỚI: 10 giây (hardcoded trong controller)
 * 
 * CẢNH BÁO:
 * - Nếu server restart trong khi pump đang chạy, pump sẽ không tự tắt
 * - IoT device nên có watchdog để tự tắt pump nếu không nhận signal
 * 
 * USE CASE:
 * - User nhấn nút "Tưới nước" trên dashboard
 * - Trigger từ automation rule khi độ ẩm đất thấp
 */
router.post('/startPump', mqttController.startPump);

/**
 * ============================================================================
 * ROUTE: POST /controlRelay
 * MÔ TẢ: Điều khiển từng relay riêng biệt (V1 hoặc V2) với thời gian tùy chỉnh
 * ============================================================================
 * 
 * Endpoint này gửi command đến IoT device qua MQTT để điều khiển relay.
 * Hỗ trợ điều khiển V1, V2 riêng biệt hoặc cả hai cùng lúc với thời gian khác nhau.
 * 
 * REQUEST BODY:
 * {
 *   "relay": "V1" hoặc "V2" hoặc ["V1", "V2"],  // Relay cần điều khiển
 *   "duration": 10,                              // Thời gian (giây) - số hoặc object {V1: 10, V2: 15}
 *   "deviceId": 1,                               // Database ID của thiết bị
 *   "mode": "MANUAL"                             // Chế độ: MANUAL hoặc AUTO
 * }
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Relay(s) controlled", results: [...] }
 * 
 * MQTT FLOW:
 * 1. Server publish '1' đến topic IOTGARDEN{deviceId}/feeds/V1 hoặc V2 -> Bật relay
 * 2. setTimeout theo duration
 * 3. Server publish '0' đến topic tương ứng -> Tắt relay
 * 
 * VÍ DỤ:
 * - Bật V1 trong 10 giây: { relay: "V1", duration: 10, deviceId: 1 }
 * - Bật cả 2 relay với thời gian khác nhau: 
 *   { relay: ["V1", "V2"], duration: {V1: 10, V2: 15}, deviceId: 1 }
 */
router.post('/controlRelay', mqttController.controlRelay);

/**
 * ============================================================================
 * ROUTE: POST /stopRelay
 * MÔ TẢ: Dừng relay ngay lập tức
 * ============================================================================
 * 
 * REQUEST BODY:
 * {
 *   "relay": "V1" hoặc "V2" hoặc ["V1", "V2"],
 *   "deviceId": 1
 * }
 */
router.post('/stopRelay', mqttController.stopRelay);

/**
 * Export router để mount trong server.js
 */
module.exports = router;
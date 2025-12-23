/**
 * ============================================================================
 * FILE: routes/conditionRouter.js
 * MÔ TẢ: Router xử lý các routes liên quan đến Condition (Điều kiện tự động)
 * ============================================================================
 * 
 * Router này định nghĩa các endpoints để quản lý các điều kiện tự động hóa
 * cho hệ thống tưới tiêu thông minh IoT Garden.
 * 
 * BASE PATH: /api/v1/condition (được mount trong server.js)
 * 
 * ENDPOINTS:
 * ┌────────┬────────────────────────────────┬────────────────────────────────────┐
 * │ Method │ Endpoint                       │ Mô tả                              │
 * ├────────┼────────────────────────────────┼────────────────────────────────────┤
 * │ POST   │ /api/v1/condition/             │ Tạo condition mới                  │
 * │ GET    │ /api/v1/condition/:gardenId    │ Lấy conditions theo garden         │
 * │ PUT    │ /api/v1/condition/:gardenId    │ Cập nhật condition                 │
 * │ DELETE │ /api/v1/condition/:gardenId    │ Xóa condition                      │
 * └────────┴────────────────────────────────┴────────────────────────────────────┘
 * 
 * CONDITION FIELDS:
 * - condition_Amdat: Ngưỡng độ ẩm đất (Soil Moisture threshold)
 *   Ví dụ: 30 = Bật tưới khi độ ẩm đất < 30%
 * - condition_Temp: Ngưỡng nhiệt độ (Temperature threshold)
 *   Ví dụ: 35 = Bật quạt khi nhiệt độ > 35°C
 * - condition_Humid: Ngưỡng độ ẩm không khí (Humidity threshold)
 *   Ví dụ: 40 = Bật phun sương khi độ ẩm < 40%
 * 
 * ============================================================================
 */

/**
 * Import Express và tạo Router instance
 */
const express = require('express');

/**
 * Import conditionController chứa logic xử lý
 */
const conditionController = require('../controllers/conditionController');

const router = express.Router();

/**
 * ============================================================================
 * ROUTE: POST /api/v1/condition/
 * MÔ TẢ: Tạo condition mới cho garden
 * ============================================================================
 * 
 * REQUEST BODY:
 * {
 *   "condition_Amdat": 30,    // Ngưỡng độ ẩm đất (%)
 *   "condition_Temp": 35,     // Ngưỡng nhiệt độ (°C)
 *   "condition_Humid": 60,    // Ngưỡng độ ẩm không khí (%)
 *   "gardenId": 1             // ID garden liên kết
 * }
 * 
 * RESPONSE:
 * - Thành công (201): { message: "Condition created successfully", conditionId: <id> }
 * - Lỗi server (500): { error: "An error occurred while creating the condition" }
 */
router.post('/', conditionController.createCondition);

/**
 * ============================================================================
 * ROUTE: GET /api/v1/condition/:gardenId
 * MÔ TẢ: Lấy conditions của một garden
 * ============================================================================
 * 
 * URL PARAMS:
 * - :gardenId - ID của garden (number)
 * 
 * RESPONSE:
 * - Thành công (200):
 *   [{
 *     condition_ID: 1,
 *     condition_Amdat: 30,
 *     condition_Temp: 35,
 *     condition_Humid: 60,
 *     condition_GardenID: 1
 *   }]
 * - Lỗi server (500): { error: "An error occurred while fetching the condition" }
 * 
 * VÍ DỤ: GET /api/v1/condition/1
 */
router.get('/:gardenId', conditionController.getCondition);

/**
 * ============================================================================
 * ROUTE: PUT /api/v1/condition/:gardenId
 * MÔ TẢ: Cập nhật conditions của một garden
 * ============================================================================
 * 
 * URL PARAMS:
 * - :gardenId - ID của garden (number)
 * 
 * REQUEST BODY:
 * {
 *   "condition_Amdat": 25,    // Ngưỡng mới
 *   "condition_Temp": 30,
 *   "condition_Humid": 50
 * }
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Condition updated successfully" }
 * - Lỗi server (500): { error: "An error occurred while updating the condition" }
 * 
 * VÍ DỤ: PUT /api/v1/condition/1
 * 
 * USE CASE:
 * - User muốn thay đổi ngưỡng tưới tự động
 * - Điều chỉnh theo mùa (mùa hè tưới nhiều hơn)
 */
router.put('/:gardenId', conditionController.updateCondition);

/**
 * ============================================================================
 * ROUTE: DELETE /api/v1/condition/:gardenId
 * MÔ TẢ: Xóa tất cả conditions của một garden
 * ============================================================================
 * 
 * URL PARAMS:
 * - :gardenId - ID của garden (number)
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Condition deleted successfully" }
 * - Lỗi server (500): { error: "An error occurred while deleting the condition" }
 * 
 * VÍ DỤ: DELETE /api/v1/condition/1
 * 
 * USE CASE:
 * - Tắt hoàn toàn chế độ tự động
 * - Reset để cấu hình lại từ đầu
 */
router.delete('/:gardenId', conditionController.deleteCondition);

/**
 * Export router để mount trong server.js
 */
module.exports = router;
/**
 * ============================================================================
 * FILE: routes/gardenRouter.js
 * MÔ TẢ: Router xử lý các routes liên quan đến Garden (Vườn)
 * ============================================================================
 * 
 * Router này định nghĩa các endpoints REST API cho quản lý vườn.
 * Theo chuẩn RESTful API design.
 * 
 * BASE PATH: /api/v1/gardens (được mount trong server.js)
 * 
 * ENDPOINTS:
 * ┌────────┬──────────────────────────────────┬────────────────────────────────┐
 * │ Method │ Endpoint                         │ Mô tả                          │
 * ├────────┼──────────────────────────────────┼────────────────────────────────┤
 * │ GET    │ /api/v1/gardens/                 │ Lấy tất cả gardens             │
 * │ GET    │ /api/v1/gardens/:id              │ Lấy garden theo ID             │
 * │ POST   │ /api/v1/gardens/                 │ Tạo garden mới                 │
 * │ PUT    │ /api/v1/gardens/:id              │ Cập nhật garden                │
 * │ DELETE │ /api/v1/gardens/:id              │ Xóa garden                     │
 * └────────┴──────────────────────────────────┴────────────────────────────────┘
 * 
 * ============================================================================
 */

/**
 * Import gardenController chứa logic xử lý cho mỗi route
 */
const gardenController = require('../controllers/gardenController');

/**
 * Import Express và tạo Router instance
 */
const express = require('express');
const router = express.Router();

/**
 * ============================================================================
 * ROUTE: GET /api/v1/gardens/
 * MÔ TẢ: Lấy danh sách tất cả gardens trong hệ thống
 * ============================================================================
 * 
 * RESPONSE:
 * - Thành công (200): [{ garden_ID, garden_Name, ... }, ...]
 * - Lỗi server (500): { error: "Internal Server Error" }
 */
router.get('/', gardenController.getAllGardens);

/**
 * ============================================================================
 * ROUTE: GET /api/v1/gardens/:id
 * MÔ TẢ: Lấy thông tin garden theo ID
 * ============================================================================
 * 
 * URL PARAMS:
 * - :id - ID của garden (number)
 * 
 * RESPONSE:
 * - Thành công (200): { garden_ID, garden_Name, garden_Location, ... }
 * - Không tìm thấy (404): { error: "Garden not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * VÍ DỤ: GET /api/v1/gardens/1
 */
router.get('/:id', gardenController.getGardenById);


/**
 * ============================================================================
 * ROUTE: POST /api/v1/gardens/
 * MÔ TẢ: Tạo garden mới
 * ============================================================================
 * 
 * REQUEST BODY:
 * {
 *   "garden_Name": "My Garden",        // Tên vườn
 *   "garden_Location": "Ha Noi",      // Vị trí
 *   "garden_Status": "Active",        // Trạng thái
 *   "garden_Description": "...",      // Mô tả
 *   "garden_Area": 100,               // Diện tích (m²)
 *   "garden_Image": "https://...",     // URL hình ảnh
 *   "garden_Email": "user@example.com" // Email nhận thông báo
 * }
 * 
 * RESPONSE:
 * - Thành công (200): { insertId, affectedRows, ... }
 * - Lỗi server (500): { error: "Internal Server Error" }
 */
router.post('/', gardenController.addGarden);

/**
 * ============================================================================
 * ROUTE: DELETE /api/v1/gardens/:id
 * MÔ TẢ: Xóa garden theo ID
 * ============================================================================
 * 
 * URL PARAMS:
 * - :id - ID của garden cần xóa (number)
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Garden deleted successfully" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * VÍ DỤ: DELETE /api/v1/gardens/1
 * 
 * CẢNH BÁO: Cần xóa cascade dữ liệu sensor và condition trước
 */
router.delete('/:id', gardenController.deleteGarden);

/**
 * ============================================================================
 * ROUTE: PUT /api/v1/gardens/:id
 * MÔ TẢ: Cập nhật thông tin garden
 * ============================================================================
 * 
 * URL PARAMS:
 * - :id - ID của garden cần cập nhật (number)
 * 
 * REQUEST BODY:
 * {
 *   "garden_Location": "New Location",
 *   "garden_Status": "Inactive",
 *   "garden_Name": "New Name",
 *   "garden_Description": "New description",
 *   "garden_Area": 150,
 *   "garden_Image": "https://new-image.jpg"
 * }
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Garden updated successfully" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * VÍ DỤ: PUT /api/v1/gardens/1
 */
router.put('/:id', gardenController.updateGarden);

/**
 * Export router để mount trong server.js
 */
module.exports = router;

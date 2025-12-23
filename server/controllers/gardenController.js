/**
 * ============================================================================
 * FILE: controllers/gardenController.js
 * MÔ TẢ: Controller xử lý các thao tác liên quan đến Garden (Vườn)
 * ============================================================================
 * 
 * File này implement các chức năng quản lý vườn theo mô hình CRUD:
 * - Create: Tạo vườn mới
 * - Read: Lấy thông tin vườn (tất cả, theo ID)
 * - Update: Cập nhật thông tin vườn
 * - Delete: Xóa vườn
 * 
 * QUAN HỆ DỮ LIỆU:
 * - Mỗi Garden có nhiều Devices
 * - Mỗi Garden có nhiều Sensor data
 * - Mỗi Garden có thể có nhiều Condition (điều kiện tự động)
 * 
 * ============================================================================
 */

/**
 * Import gardenModel để thao tác với bảng tbl_garden trong database
 */
const gardenModel = require('../models/gardenModel')


/**
 * ============================================================================
 * FUNCTION: getAllGardens
 * MÔ TẢ: Lấy danh sách tất cả vườn trong hệ thống
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/gardens/
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): [ {garden1}, {garden2}, ... ]
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * LƯU Ý: Trong production, nên thêm pagination và authorization
 * để giới hạn user chỉ xem được vườn của mình
 */
const getAllGardens = async (req, res) => {
    try {
        // Sử dụng async/await thay vì Promise.then()
        const gardens = await gardenModel.getAllGardens();
        res.json(gardens);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * ============================================================================
 * FUNCTION: getGardenById
 * MÔ TẢ: Lấy thông tin chi tiết một vườn theo ID
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/gardens/:id
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - ID của vườn cần tìm
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { garden_ID, garden_Name, garden_Location, ... }
 * - Không tìm thấy (404): { error: "Garden not found" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 */
const getGardenById = async (req, res) => {
    try {
        const id = req.params.id;
        const garden = await gardenModel.getGardenById(id);
        
        if (!garden) {
            // Vườn không tồn tại
            return res.status(404).json({ error: 'Garden not found' });
        }
        
        res.json(garden);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


/**
 * ============================================================================
 * FUNCTION: addGarden
 * MÔ TẢ: Tạo vườn mới
 * ============================================================================
 * 
 * HTTP Method: POST
 * Endpoint: /api/v1/gardens/
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Thông tin vườn mới
 * @param {string} req.body.garden_Name - Tên vườn
 * @param {string} req.body.garden_Location - Vị trí vườn
 * @param {string} req.body.garden_Status - Trạng thái (Active/Inactive)
 * @param {string} req.body.garden_Description - Mô tả
 * @param {number} req.body.garden_Area - Diện tích (m2)
 * @param {string} req.body.garden_Image - URL hình ảnh
 * @param {string} req.body.garden_Email - Email nhận thông báo
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { insertId, affectedRows, ... }
 * - Lỗi server (500): { error: "Internal Server Error" }
 */
const addGarden = async (req, res) => {
    try {
        // req.body chứa thông tin vườn từ client
        const newGarden = await gardenModel.addGarden(req.body);
        res.json(newGarden);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * ============================================================================
 * FUNCTION: deleteGarden
 * MÔ TẢ: Xóa một vườn khỏi hệ thống
 * ============================================================================
 * 
 * HTTP Method: DELETE
 * Endpoint: /api/v1/gardens/:id
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - ID của vườn cần xóa
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Garden deleted successfully" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * CẢNH BÁO: Cần xóa cascade dữ liệu liên quan trước:
 * - Sensor data (tbl_soil_moisture, tbl_dht20, tbl_water_pump)
 * - Conditions (tbl_condition)
 */
const deleteGarden = async (req, res) => {
    try {
        id = req.params.id;
        await gardenModel.deleteGarden(id);
        res.json({ message: 'Garden deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * ============================================================================
 * FUNCTION: updateGarden
 * MÔ TẢ: Cập nhật thông tin vườn
 * ============================================================================
 * 
 * HTTP Method: PUT
 * Endpoint: /api/v1/gardens/:id
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.id - ID của vườn cần cập nhật
 * @param {Object} req.body - Thông tin mới của vườn
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Garden updated successfully" }
 * - Lỗi server (500): { error: "Internal Server Error" }
 * 
 * LƯU Ý: Các fields trong req.body sẽ ghi đè giá trị cũ
 * Chỉ gửi những fields cần thay đổi
 */
const updateGarden = async (req, res) => {
    try {
        id = req.params.id;
        body = req.body;
        await gardenModel.updateGarden(id, body);
        res.json({ message: 'Garden updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


/**
 * Export các controller functions để sử dụng trong routes
 */
module.exports = {
    getAllGardens,         // Lấy tất cả vườn
    getGardenById,         // Lấy vườn theo ID
    addGarden,             // Tạo vườn mới
    updateGarden,          // Cập nhật vườn
    deleteGarden           // Xóa vườn
}
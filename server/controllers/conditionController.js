/**
 * ============================================================================
 * FILE: controllers/conditionController.js
 * MÔ TẢ: Controller xử lý các điều kiện tự động hóa (Automation Conditions)
 * ============================================================================
 * 
 * File này quản lý các điều kiện để hệ thống IoT Garden tự động thực hiện
 * các hành động dựa trên giá trị cảm biến.
 * 
 * VÍ DỤ ĐIỀU KIỆN:
 * - Nếu độ ẩm đất (amdat) < 30% -> Bật máy bơm tưới nước
 * - Nếu nhiệt độ (temp) > 35°C -> Bật quạt thông gió
 * - Nếu độ ẩm không khí (humid) < 40% -> Bật phun sương
 * 
 * MỐI QUAN HỆ:
 * - Mỗi Garden có một bộ Condition riêng
 * - Conditions được lưu trong bảng tbl_condition
 * - Liên kết với Garden qua condition_GardenID
 * 
 * CÁC FIELDS CỦA CONDITION:
 * - condition_Amdat: Ngưỡng độ ẩm đất (Soil Moisture threshold)
 * - condition_Temp: Ngưỡng nhiệt độ (Temperature threshold)
 * - condition_Humid: Ngưỡng độ ẩm không khí (Air Humidity threshold)
 * 
 * ============================================================================
 */

/**
 * Import conditionModel để thao tác với bảng tbl_condition
 */
conditionModel = require('../models/conditionModel');

/**
 * ============================================================================
 * FUNCTION: createDefaultCondition
 * MÔ TẢ: Tạo điều kiện mặc định cho vườn mới
 * ============================================================================
 * 
 * Function này có thể được gọi khi tạo vườn mới để khởi tạo
 * các giá trị ngưỡng mặc định.
 * 
 * @param {number} gardenId - ID của vườn cần tạo condition
 * @returns {Promise} - Promise từ createCondition
 * 
 * DEFAULT VALUES:
 * - amdat: 'default value' (nên là số, ví dụ: 30)
 * - temp: 'default value' (nên là số, ví dụ: 35)
 * - humid: 'default value' (nên là số, ví dụ: 60)
 */
const createDefaultCondition = (gardenId) => {
    const defaultCondition = {
        amdat: 'default value',    // Ngưỡng độ ẩm đất mặc định
        temp: 'default value',     // Ngưỡng nhiệt độ mặc định
        humid: 'default value',    // Ngưỡng độ ẩm không khí mặc định
        gardenId: gardenId         // ID vườn liên kết
    };
    return conditionModel.createCondition(defaultCondition);
};


/**
 * ============================================================================
 * FUNCTION: createCondition
 * MÔ TẢ: Tạo điều kiện mới cho vườn
 * ============================================================================
 * 
 * HTTP Method: POST
 * Endpoint: /api/v1/condition/
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Thông tin điều kiện
 * @param {number|string} req.body.condition_Amdat - Ngưỡng độ ẩm đất
 * @param {number|string} req.body.condition_Temp - Ngưỡng nhiệt độ
 * @param {number|string} req.body.condition_Humid - Ngưỡng độ ẩm không khí
 * @param {number} req.body.gardenId - ID vườn
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (201): { message: "Condition created successfully", conditionId: <id> }
 * - Lỗi server (500): { error: "An error occurred while creating the condition" }
 */
const createCondition = async (req, res) => {
    try {
        // Tạo condition mới từ dữ liệu request body
        const condition = await conditionModel.createCondition(req.body);
        
        // Trả về status 201 Created với ID của condition mới
        res.status(201).json({
            message: 'Condition created successfully', 
            conditionId: condition.insertId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while creating the condition' });
    }
}

/**
 * ============================================================================
 * FUNCTION: getCondition
 * MÔ TẢ: Lấy điều kiện của một vườn theo Garden ID
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/condition/:gardenId
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.gardenId - ID của vườn
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): [ { condition_ID, condition_Amdat, condition_Temp, ... } ]
 * - Lỗi server (500): { error: "An error occurred while fetching the condition" }
 * 
 * LƯU Ý: Trả về array vì có thể có nhiều conditions cho 1 garden
 * (hoặc empty array nếu chưa có)
 */
const getCondition = async (req, res) => {
    try {
        const gardenId = req.params.gardenId;
        const condition = await conditionModel.getConditionByGardenId(gardenId);
        res.json(condition);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'An error occured while fetching the condition'});
    }
}

/**
 * ============================================================================
 * FUNCTION: updateCondition
 * MÔ TẢ: Cập nhật điều kiện của một vườn
 * ============================================================================
 * 
 * HTTP Method: PUT
 * Endpoint: /api/v1/condition/:gardenId
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.gardenId - ID của vườn cần cập nhật condition
 * @param {Object} req.body - Thông tin cập nhật
 * @param {number|string} req.body.condition_Amdat - Ngưỡng độ ẩm đất mới
 * @param {number|string} req.body.condition_Temp - Ngưỡng nhiệt độ mới
 * @param {number|string} req.body.condition_Humid - Ngưỡng độ ẩm không khí mới
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Condition updated successfully" }
 * - Lỗi server (500): { error: "An error occurred while updating the condition" }
 * 
 * USE CASE:
 * - User muốn thay đổi ngưỡng tưới tự động
 * - Điều chỉnh theo mùa (mùa hè cần tưới nhiều hơn)
 */
const updateCondition = async (req, res) => {
    try {
        /**
         * Spread operator (...) để merge req.body với gardenId
         * Đảm bảo gardenId từ URL được sử dụng (không phải từ body)
         */
        const updatedData = { ...req.body, gardenId: req.params.gardenId};
        
        await conditionModel.updateCondition(updatedData);
        res.json({message: 'Condition updated successfully'});
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'An error occured while updating the condition'});
    }
}

/**
 * ============================================================================
 * FUNCTION: deleteCondition
 * MÔ TẢ: Xóa điều kiện của một vườn
 * ============================================================================
 * 
 * HTTP Method: DELETE
 * Endpoint: /api/v1/condition/:gardenId
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.gardenId - ID của vườn cần xóa condition
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): { message: "Condition deleted successfully" }
 * - Lỗi server (500): { error: "An error occurred while deleting the condition" }
 * 
 * USE CASE:
 * - Tắt hoàn toàn chế độ tự động
 * - Reset để cấu hình lại từ đầu
 */
const deleteCondition = async (req, res) => {
    try {
        const gardenId = req.params.gardenId;
        await conditionModel.deleteCondition(gardenId);
        res.json({ message: 'Condition deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while deleting the condition' });
    }
};

/**
 * Export các controller functions để sử dụng trong routes
 */
module.exports = {
    createCondition,         // Tạo điều kiện mới
    getCondition,            // Lấy điều kiện theo garden ID
    updateCondition,         // Cập nhật điều kiện
    deleteCondition,         // Xóa điều kiện
    createDefaultCondition   // Tạo điều kiện mặc định (internal use)
} 
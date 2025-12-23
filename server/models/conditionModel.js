/**
 * ============================================================================
 * FILE: models/conditionModel.js
 * MÔ TẢ: Model xử lý các thao tác database cho Condition (Điều kiện tự động)
 * ============================================================================
 * 
 * File này quản lý các ngưỡng điều kiện để hệ thống IoT tự động thực hiện
 * các hành động khi sensor vượt ngưỡng.
 * 
 * BẢNG DATABASE: tbl_condition
 * ┌─────────────────────┬──────────────┬────────────────────────────────────────┐
 * │ Column              │ Type         │ Mô tả                                  │
 * ├─────────────────────┼──────────────┼────────────────────────────────────────┤
 * │ condition_ID        │ INT (PK)     │ ID tự động tăng                        │
 * │ condition_Amdat     │ VARCHAR/INT  │ Ngưỡng độ ẩm đất (Soil Moisture)       │
 * │ condition_Temp      │ VARCHAR/INT  │ Ngưỡng nhiệt độ (Temperature)          │
 * │ condition_Humid     │ VARCHAR/INT  │ Ngưỡng độ ẩm không khí (Humidity)      │
 * │ condition_GardenID  │ INT (FK)     │ ID garden liên kết                     │
 * └─────────────────────┴──────────────┴────────────────────────────────────────┘
 * 
 * LOGIC ĐIỀU KIỆN (ví dụ):
 * - IF soil_moisture < condition_Amdat THEN bật máy bơm
 * - IF temperature > condition_Temp THEN bật quạt
 * - IF air_humid < condition_Humid THEN bật phun sương
 * 
 * ============================================================================
 */

/**
 * Import database connection
 */
const db = require('./db');

/**
 * ============================================================================
 * HELPER FUNCTION: executeQuery
 * MÔ TẢ: Wrapper function để thực thi SQL query với Promise
 * ============================================================================
 * 
 * @param {string} query - SQL query string với placeholders
 * @param {Array} params - Array các giá trị để thay thế placeholders
 * @returns {Promise} - Promise resolve với result của query
 */
const executeQuery = (query, params) => {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, result) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

/**
 * ============================================================================
 * FUNCTION: createCondition
 * MÔ TẢ: Tạo điều kiện mới cho garden
 * ============================================================================
 * 
 * @param {Object} data - Object chứa thông tin điều kiện
 * @param {number|string} data.condition_Amdat - Ngưỡng độ ẩm đất
 * @param {number|string} data.condition_Temp - Ngưỡng nhiệt độ
 * @param {number|string} data.condition_Humid - Ngưỡng độ ẩm không khí
 * @param {number} data.gardenId - ID garden liên kết
 * @returns {Promise<Object>} - Promise resolve với result (chứa insertId)
 * 
 * SQL: INSERT INTO tbl_condition (...) VALUES (?, ?, ?, ?)
 * 
 * LƯU Ý: Query có 5 placeholder (?) nhưng chỉ có 4 values
 * Đây có thể là bug cần fix
 */
const createCondition = (data) => {
    const query = `INSERT INTO tbl_condition
    (condition_Amdat, condition_Temp, condition_Humid, condition_GardenID)
    VALUES (?, ?, ?, ?, ?)`; // BUG: 5 placeholders nhưng chỉ có 4 columns
    return executeQuery(query, [
        data.condition_Amdat,   // Ngưỡng độ ẩm đất
        data.condition_Temp,    // Ngưỡng nhiệt độ
        data.condition_Humid,   // Ngưỡng độ ẩm không khí
        data.gardenId           // ID garden
    ]);
};

/**
 * ============================================================================
 * FUNCTION: getConditionByGardenId
 * MÔ TẢ: Lấy điều kiện của một garden
 * ============================================================================
 * 
 * @param {number} gardenId - ID của garden cần lấy condition
 * @returns {Promise<Array>} - Promise resolve với array conditions
 * 
 * SQL: SELECT * FROM tbl_condition WHERE condition_GardenID = ?
 * 
 * LƯU Ý: Trả về Array vì có thể có nhiều conditions cho 1 garden
 * (hoặc empty array nếu chưa có condition)
 */
const getConditionByGardenId = (gardenId) => {
    const query = 'SELECT * FROM tbl_condition WHERE condition_GardenID = ?';
    return executeQuery(query, [gardenId]);
}

/**
 * ============================================================================
 * FUNCTION: updateCondition
 * MÔ TẢ: Cập nhật điều kiện của garden
 * ============================================================================
 * 
 * @param {Object} data - Object chứa thông tin cập nhật
 * @param {number|string} data.condition_Amdat - Ngưỡng độ ẩm đất mới
 * @param {number|string} data.condition_Temp - Ngưỡng nhiệt độ mới
 * @param {number|string} data.condition_Humid - Ngưỡng độ ẩm không khí mới
 * @param {number} data.gardenId - ID garden để identify condition
 * @returns {Promise<Object>} - Promise resolve với result
 * 
 * SQL: UPDATE tbl_condition SET ... WHERE condition_GardenID = ?
 * 
 * LƯU Ý: Cập nhật tất cả conditions của garden (theo gardenId)
 */
const updateCondition = (data) => {
    console.log('Received data', data);
    const query = `UPDATE tbl_condition
    SET condition_Amdat = ?, condition_Temp = ?, condition_Humid = ?
    WHERE condition_GardenID = ?
    `;
    return executeQuery(query, [
        data.condition_Amdat,   // SET condition_Amdat = ?
        data.condition_Temp,    // SET condition_Temp = ?
        data.condition_Humid,   // SET condition_Humid = ?
        data.gardenId           // WHERE condition_GardenID = ?
    ]);
};

/**
 * ============================================================================
 * FUNCTION: deleteCondition
 * MÔ TẢ: Xóa tất cả conditions của một garden
 * ============================================================================
 * 
 * @param {number} gardenId - ID của garden cần xóa conditions
 * @returns {Promise<Object>} - Promise resolve với result
 * 
 * SQL: DELETE FROM tbl_condition WHERE condition_GardenID = ?
 * 
 * LƯU Ý: Xóa TẤT CẢ conditions của garden, không phải theo condition_ID
 */
const deleteCondition = (gardenId) => {
    const query = 'DELETE FROM tbl_condition WHERE condition_GardenID = ?';
    return executeQuery(query, [gardenId]);
};

/**
 * Export các functions để controllers sử dụng
 */
module.exports = {
    createCondition,         // Tạo condition mới
    getConditionByGardenId,  // Lấy conditions theo garden
    updateCondition,         // Cập nhật condition
    deleteCondition          // Xóa condition
};
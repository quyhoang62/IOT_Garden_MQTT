/**
 * ============================================================================
 * FILE: models/gardenModel.js
 * MÔ TẢ: Model xử lý các thao tác database liên quan đến Garden (Vườn)
 * ============================================================================
 * 
 * File này implement Data Access Layer cho bảng tbl_garden.
 * Mỗi garden chứa các thiết bị IoT và dữ liệu cảm biến.
 * 
 * BẢNG DATABASE: tbl_garden
 * ┌─────────────────────┬──────────────┬────────────────────────────────────────┐
 * │ Column              │ Type         │ Mô tả                                  │
 * ├─────────────────────┼──────────────┼────────────────────────────────────────┤
 * │ garden_ID           │ INT (PK)     │ ID tự động tăng, khóa chính            │
 * │ garden_Name         │ VARCHAR      │ Tên vườn                               │
 * │ garden_Location     │ VARCHAR      │ Vị trí/địa chỉ của vườn                │
 * │ garden_Status       │ VARCHAR      │ Trạng thái (Active/Inactive)           │
 * │ garden_Description  │ TEXT         │ Mô tả chi tiết về vườn                 │
 * │ garden_Area         │ DECIMAL      │ Diện tích vườn (m²)                    │
 * │ garden_Image        │ VARCHAR      │ URL hình ảnh đại diện                  │
 * │ garden_Email        │ VARCHAR      │ Email để nhận thông báo                │
 * └─────────────────────┴──────────────┴────────────────────────────────────────┘
 * 
 * QUAN HỆ:
 * - tbl_garden (1) --< (n) tbl_device (Một garden có nhiều devices)
 * - tbl_garden (1) --< (n) tbl_sensor_data (Một garden có nhiều sensor records)
 * - tbl_garden (1) --< (n) tbl_condition (Một garden có nhiều conditions)
 * 
 * ============================================================================
 */

/**
 * Import database connection từ db.js
 */
const db = require('./db');

/**
 * CẤU TRÚC OBJECT GARDEN TRẢ VỀ:
 * {
 *   "garden_ID": 1,                           // ID của vườn
 *   "garden_Name": "My Garden",               // Tên vườn
 *   "garden_Location": "123 Main Street",     // Địa chỉ vườn
 *   "garden_Status": "Active",                // Trạng thái hoạt động
 *   "garden_Description": "A beautiful...",     // Mô tả
 *   "garden_Area": 500,                       // Diện tích (m²)
 *   "garden_Image": "https://example.com/...", // URL hình ảnh
 *   "garden_Email": "user@example.com"        // Email nhận thông báo
 * }
 */

/**
 * ============================================================================
 * HELPER FUNCTION: executeQuery
 * MÔ TẢ: Wrapper function để thực thi SQL query với Promise
 * ============================================================================
 * 
 * Function helper này wrap callback-based db.query() thành Promise-based
 * Giúp code clean hơn và dễ sử dụng với async/await
 * 
 * @param {string} query - SQL query string với placeholders (?)
 * @param {Array} params - Array các giá trị để thay thế placeholders
 * @returns {Promise} - Promise resolve với result của query
 * 
 * Ví dụ:
 * executeQuery('SELECT * FROM tbl_garden WHERE garden_ID = ?', [1])
 *   .then(results => console.log(results))
 *   .catch(err => console.error(err));
 */
const executeQuery = (query, params) => {
    return new Promise((resolve, reject) => {
        /**
         * db.query() là phương thức của mysql2 connection
         * Tự động escape parameters để tránh SQL Injection
         */
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
 * Garden Model Object
 * Chứa tất cả các phương thức CRUD cho bảng tbl_garden
 */
const Garden = {
    /**
     * ============================================================================
     * METHOD: getAllGardens
     * MÔ TẢ: Lấy danh sách tất cả gardens trong database
     * ============================================================================
     * 
     * @returns {Promise<Array>} - Promise resolve với array tất cả gardens
     * 
     * SQL: SELECT * FROM tbl_garden
     * 
     * LƯU Ý: Trong production, nên thêm pagination và filter theo user
     */
    getAllGardens: function () {
        return executeQuery('SELECT * FROM tbl_garden');
    },

    /**
     * ============================================================================
     * METHOD: getGardenById
     * MÔ TẢ: Lấy thông tin garden theo ID
     * ============================================================================
     * 
     * @param {number} id - ID của garden cần tìm
     * @returns {Promise<Object|undefined>} - Promise resolve với garden object
     * 
     * SQL: SELECT * FROM tbl_garden WHERE garden_ID = ?
     * 
     * LƯU Ý: .then(results => results[0]) để trả về object thay vì array
     */
    getGardenById: function (id) {
        return executeQuery('SELECT * FROM tbl_garden WHERE garden_ID = ?', [id])
            .then(results => results[0]); // Lấy phần tử đầu tiên (hoặc undefined)
    },


    /**
     * ============================================================================
     * METHOD: addGarden
     * MÔ TẢ: Thêm garden mới vào database
     * ============================================================================
     * 
     * @param {Object} garden - Object chứa thông tin garden mới
     * @param {string} garden.garden_Name - Tên vườn
     * @param {string} garden.garden_Location - Vị trí vườn
     * @param {string} garden.garden_Status - Trạng thái (Active/Inactive)
     * @param {string} garden.garden_Description - Mô tả
     * @param {number} garden.garden_Area - Diện tích (m²)
     * @param {string} garden.garden_Image - URL hình ảnh
     * @param {string} garden.garden_Email - Email nhận thông báo
     * @returns {Promise<Object>} - Promise resolve với result (chứa insertId)
     * 
     * SQL: INSERT INTO tbl_garden (...) VALUES (?, ?, ?, ?, ?, ?, ?)
     * 
     * RETURN VALUE:
     * {
     *   fieldCount: 0,
     *   affectedRows: 1,
     *   insertId: 5,      // ID của garden mới
     *   serverStatus: 2,
     *   warningCount: 0
     * }
     */
    addGarden: function (garden) {
        return executeQuery(
            'INSERT INTO tbl_garden (garden_Location, garden_Status, garden_Name, garden_Description, garden_Area, garden_Image, garden_Email) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                garden.garden_Location,     // Vị trí
                garden.garden_Status,       // Trạng thái
                garden.garden_Name,         // Tên vườn
                garden.garden_Description,  // Mô tả
                garden.garden_Area,         // Diện tích
                garden.garden_Image,        // URL hình ảnh
                garden.garden_Email         // Email nhận thông báo
            ]
        );
    },

    /**
     * ============================================================================
     * METHOD: deleteGarden
     * MÔ TẢ: Xóa garden khỏi database
     * ============================================================================
     * 
     * @param {number} id - ID của garden cần xóa
     * @returns {Promise<Object>} - Promise resolve với result (chứa affectedRows)
     * 
     * SQL: DELETE FROM tbl_garden WHERE garden_ID = ?
     * 
     * CẢNH BÁO: Cần xử lý cascade delete cho:
     * - tbl_soil_moisture (soil_moisture_GardenID)
     * - tbl_dht20 (dht_GardenID)
     * - tbl_water_pump (water_pump_GardenID)
     * - tbl_condition (condition_GardenID)
     */
    deleteGarden: function (id) {
        return executeQuery('DELETE FROM tbl_garden WHERE garden_ID = ?', [id]);
    },

    /**
     * ============================================================================
     * METHOD: updateGarden
     * MÔ TẢ: Cập nhật thông tin garden
     * ============================================================================
     * 
     * @param {number} id - ID của garden cần cập nhật
     * @param {Object} garden - Object chứa thông tin mới
     * @param {string} garden.garden_Location - Vị trí mới
     * @param {string} garden.garden_Status - Trạng thái mới
     * @param {string} garden.garden_Name - Tên mới
     * @param {string} garden.garden_Description - Mô tả mới
     * @param {number} garden.garden_Area - Diện tích mới
     * @param {string} garden.garden_Image - URL hình ảnh mới
     * @returns {Promise<Object>} - Promise resolve với result
     * 
     * SQL: UPDATE tbl_garden SET ... WHERE garden_ID = ?
     * 
     * LƯU Ý: 
     * - Tất cả fields đều được update, kể cả null
     */
    updateGarden: function (id, garden) {
        return executeQuery(
            'UPDATE tbl_garden SET garden_Location = ?, garden_Status = ?, garden_Name = ?, garden_Description = ?, garden_Area = ?, garden_Image = ?, garden_Email = ? WHERE garden_ID = ?',
            [
                garden.garden_Location,     // SET garden_Location = ?
                garden.garden_Status,       // SET garden_Status = ?
                garden.garden_Name,         // SET garden_Name = ?
                garden.garden_Description,  // SET garden_Description = ?
                garden.garden_Area,         // SET garden_Area = ?
                garden.garden_Image,        // SET garden_Image = ?
                garden.garden_Email,        // SET garden_Email = ?
                id                          // WHERE garden_ID = ?
            ]
        );
    }
};

/**
 * Export Garden model để các controllers sử dụng
 */
module.exports = Garden;

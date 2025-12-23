/**
 * ============================================================================
 * FILE: models/sensorModel.js
 * MÔ TẢ: Model xử lý dữ liệu từ các cảm biến IoT
 * ============================================================================
 * 
 * File này implement Data Access Layer cho 3 bảng sensor:
 * - tbl_soil_moisture: Dữ liệu độ ẩm đất
 * - tbl_dht20: Dữ liệu nhiệt độ và độ ẩm không khí
 * - tbl_water_pump: Lịch sử hoạt động máy bơm
 * 
 * CÁC BẢNG DATABASE:
 * 
 * tbl_soil_moisture (Độ ẩm đất):
 * ┌──────────────────────────┬──────────────┬──────────────────────────────────┐
 * │ Column                   │ Type         │ Mô tả                            │
 * ├──────────────────────────┼──────────────┼──────────────────────────────────┤
 * │ soil_moisture_ID         │ INT (PK)     │ ID tự động tăng                  │
 * │ soil_moisture_Time       │ DATETIME     │ Thời gian đo                     │
 * │ soil_moisture_Value      │ INT/FLOAT    │ Giá trị độ ẩm đất (%)            │
 * │ soil_moisture_GardenID   │ INT (FK)     │ ID garden liên kết               │
 * └──────────────────────────┴──────────────┴──────────────────────────────────┘
 * 
 * tbl_dht20 (Nhiệt độ & Độ ẩm không khí):
 * ┌──────────────────────────┬──────────────┬──────────────────────────────────┐
 * │ Column                   │ Type         │ Mô tả                            │
 * ├──────────────────────────┼──────────────┼──────────────────────────────────┤
 * │ dht_ID                   │ INT (PK)     │ ID tự động tăng                  │
 * │ dht_Time                 │ DATETIME     │ Thời gian đo                     │
 * │ dht_Temp                 │ FLOAT        │ Nhiệt độ (°C)                    │
 * │ dht_Humid                │ FLOAT        │ Độ ẩm không khí (%)              │
 * │ dht_GardenID             │ INT (FK)     │ ID garden liên kết               │
 * └──────────────────────────┴──────────────┴──────────────────────────────────┘
 * 
 * tbl_water_pump (Máy bơm nước):
 * ┌──────────────────────────┬──────────────┬──────────────────────────────────┐
 * │ Column                   │ Type         │ Mô tả                            │
 * ├──────────────────────────┼──────────────┼──────────────────────────────────┤
 * │ water_pump_ID            │ INT (PK)     │ ID tự động tăng                  │
 * │ water_pump_Time          │ DATETIME     │ Thời gian bật/tắt                │
 * │ water_pump_Value         │ TINYINT      │ Trạng thái (0=tắt, 1=bật)        │
 * │ water_pump_GardenID      │ INT (FK)     │ ID garden liên kết               │
 * └──────────────────────────┴──────────────┴──────────────────────────────────┘
 * 
 * ============================================================================
 */

/**
 * Import database connection
 */
const db = require('./db')

/**
 * ============================================================================
 * HELPER FUNCTION: executeQuery (Không sử dụng - legacy code)
 * MÔ TẢ: Wrapper function cũ để thực thi SQL query
 * ============================================================================
 * 
 * Function này đã được comment trong các phiên bản trước
 * và không được sử dụng trong code hiện tại.
 * Các functions bên dưới đều tự tạo Promise riêng.
 */
const executeQuery = (query, param) => {
    console.log('i did come here');
    return new Promise((resolve, reject) => {
        console.log('i did come inside promise');
        db.query(query, param, (err, result) => {
            if (err) {
                console.log('i did come inside err');
                console.error(err);
                reject(err);
            } else {
                console.log('i did come inside result');
                console.log(result);
                resolve(result);
            }
        })
    })
}

/**
 * ============================================================================
 * LEGACY CODE (Đã comment - không sử dụng)
 * Các phiên bản cũ không trả về Promise đúng cách
 * ============================================================================
 */

// const insertSoilMoisture = function (data) {
//     const query = 'INSERT INTO tbl_soil_moisture (soil_moisture_Time, soil_moisture_Value, soil_moisture_GardenID) VALUE (?, ?, ?)';
//     executeQuery(query, [data.timeStamp, data.value, data.gardenId]);
// };

// const insertDht20 = function (data) {
//     const query = 'INSERT INTO tbl_dht20 (dht_Time, dht_Temp, dht_Humid, dht_GardenID) VALUE (?, ?, ?, ?)';
//     executeQuery(query, [data.timeStamp, data.temp, data.humid, data.gardenId]);
// };

// const insertWaterPump = function (data) {
//     const query = 'INSERT INTO tbl_water_pump (water_pump_Time, water_pump_Value, water_pump_GardenID) VALUE (?, ?, ?)';
//     executeQuery(query, [data.timeStamp, data.value, data.gardenId]);
// };

// const getSensorDataByGardenId = function (gardenId, limit) {
//     const query = `
//             SELECT
//                 s.soil_moisture_Time AS soil_moisture_Time,
//                 s.soil_moisture_Value AS soil_moisture_Value,
//                 d.dht_Time AS dht_Time,
//                 d.dht_Temp AS dht_Temp,
//                 d.dht_Humid AS dht_Humid,
//                 w.water_pump_Time AS water_pump_Time,
//                 w.water_pump_Value AS water_pump_Value
//             FROM
//                 tbl_soil_moisture s
//             JOIN tbl_dht20 d ON s.soil_moisture_GardenID = d.dht_GardenID
//             JOIN tbl_water_pump w ON s.soil_moisture_GardenID = w.water_pump_GardenID
//             WHERE
//                 s.soil_moisture_GardenID = ? AND d.dht_GardenID = ? AND w.water_pump_GardenID = ?
//             LIMIT ?`;
//     executeQuery(query, [gardenId, gardenId, gardenId, limit]);
// };


/**
 * ============================================================================
 * FUNCTION: insertSoilMoisture
 * MÔ TẢ: Lưu dữ liệu độ ẩm đất vào database
 * ============================================================================
 * 
 * @param {Object} data - Object chứa dữ liệu cần lưu
 * @param {string} data.timeStamp - Thời gian đo (format: YYYY-MM-DD HH:mm:ss)
 * @param {number} data.value - Giá trị độ ẩm đất (0-100%)
 * @param {number} data.gardenId - ID garden liên kết
 * @returns {Promise<number>} - Promise resolve với insertId
 * 
 * ĐƯỢC GỌI TỪ: sensorController.insertSensorData()
 * KHI: Nhận message từ MQTT topic V5 (soil_moisture)
 * 
 * Ý NGHĨA GIÁ TRỊ:
 * - 0-30%: Đất khô - CẦN TƯỚI
 * - 30-60%: Đất ẩm vừa - TỐT
 * - 60-100%: Đất quá ẩm - KHÔNG CẦN TƯỚI
 */
const insertSoilMoisture = function (data) {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO tbl_soil_moisture (soil_moisture_Time, soil_moisture_Value, soil_moisture_DeviceID) VALUES (?, ?, ?)';
        db.query(query, [data.timeStamp, data.value, data.deviceId], (err, result) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                // Trả về ID của record vừa insert
                resolve(result.insertId);
            }
        });
    });
};

/**
 * ============================================================================
 * FUNCTION: insertDht20
 * MÔ TẢ: Lưu dữ liệu nhiệt độ và độ ẩm không khí từ DHT20
 * ============================================================================
 * 
 * @param {Object} data - Object chứa dữ liệu cần lưu
 * @param {string} data.timeStamp - Thời gian đo (format: YYYY-MM-DD HH:mm:ss)
 * @param {number} data.temp - Nhiệt độ không khí (°C), range: -40 to 80
 * @param {number} data.humid - Độ ẩm không khí (%), range: 0 to 100
 * @param {number} data.gardenId - ID garden liên kết
 * @returns {Promise<number>} - Promise resolve với insertId
 * 
 * ĐƯỢC GỌI TỪ: sensorController.insertDht20Data()
 * KHI: mqttModel nhận đủ cả temp (V3) và humid (V4) từ MQTT
 * 
 * DHT20 SENSOR:
 * - Accuracy: ±0.3°C (temp), ±3% (humid)
 * - Operating range: -40 to 80°C, 0 to 100% RH
 * - I2C interface
 */
const insertDht20 = function (data) {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO tbl_dht20 (dht_Time, dht_Temp, dht_Humid, dht_DeviceID) VALUES (?, ?, ?, ?)';
        db.query(query, [data.timeStamp, data.temp, data.humid, data.deviceId], (err, result) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(result.insertId);
            }
        });
    });
};

/**
 * ============================================================================
 * FUNCTION: insertWaterPump
 * MÔ TẢ: Lưu trạng thái máy bơm vào database
 * ============================================================================
 * 
 * @param {Object} data - Object chứa dữ liệu cần lưu
 * @param {string} data.timeStamp - Thời gian bật/tắt (format: YYYY-MM-DD HH:mm:ss)
 * @param {number} data.value - Trạng thái máy bơm (0=tắt, 1=bật)
 * @param {number} data.gardenId - ID garden liên kết
 * @returns {Promise<number>} - Promise resolve với insertId
 * 
 * ĐƯỢC GỌI TỪ: sensorController.insertSensorData()
 * KHI: Nhận message từ MQTT topic V1 (pump)
 * 
 * USE CASES:
 * - Ghi lại lịch sử tưới nước
 * - Thống kê số lần tưới, thời gian tưới
 * - Debug và monitoring
 */
const insertWaterPump = function (data) {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO tbl_water_pump (water_pump_Time, water_pump_Value, water_pump_DeviceID, water_pump_Mode, water_pump_Duration) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [data.timeStamp, data.value, data.deviceId, data.mode || 'MANUAL', data.duration || null], (err, result) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(result.insertId);
            }
        });
    });
};

/**
 * ============================================================================
 * FUNCTION: getSensorDataByDeviceId
 * MÔ TẢ: Lấy dữ liệu kết hợp từ cả 3 bảng sensor theo device
 * ============================================================================
 * 
 * @param {number} deviceId - ID của device cần lấy dữ liệu
 * @param {number} limit - Số lượng records tối đa trả về
 * @returns {Promise<Array>} - Promise resolve với array kết quả JOIN
 * 
 * SQL: SELECT ... FROM tbl_soil_moisture s
 *      JOIN tbl_dht20 d ON s.soil_moisture_DeviceID = d.dht_DeviceID
 *      JOIN tbl_water_pump w ON s.soil_moisture_DeviceID = w.water_pump_DeviceID
 *      WHERE ... LIMIT ?
 * 
 * RETURN DATA STRUCTURE:
 * [{
 *   soil_moisture_Time: "2024-01-15 10:30:00",
 *   soil_moisture_Value: 45,
 *   dht_Time: "2024-01-15 10:30:00",
 *   dht_Temp: 28.5,
 *   dht_Humid: 65,
 *   water_pump_Time: "2024-01-15 10:30:00",
 *   water_pump_Value: 0,
 *   water_pump_Mode: "MANUAL",
 *   water_pump_Duration: 10
 * }, ...]
 * 
 * CẢNH BÁO PERFORMANCE:
 * - JOIN 3 bảng có thể chậm với dataset lớn
 * - Nên thêm index cho các cột DeviceID
 * - Cân nhắc sử dụng các function riêng biệt thay vì JOIN
 */
const getSensorDataByDeviceId = function (deviceId, limit) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT
                s.soil_moisture_Time AS soil_moisture_Time,
                s.soil_moisture_Value AS soil_moisture_Value,
                d.dht_Time AS dht_Time,
                d.dht_Temp AS dht_Temp,
                d.dht_Humid AS dht_Humid,
                w.water_pump_Time AS water_pump_Time,
                w.water_pump_Value AS water_pump_Value,
                w.water_pump_Mode AS water_pump_Mode,
                w.water_pump_Duration AS water_pump_Duration
            FROM
                tbl_soil_moisture s
            JOIN tbl_dht20 d ON s.soil_moisture_DeviceID = d.dht_DeviceID
            JOIN tbl_water_pump w ON s.soil_moisture_DeviceID = w.water_pump_DeviceID
            WHERE
                s.soil_moisture_DeviceID = ? AND d.dht_DeviceID = ? AND w.water_pump_DeviceID = ?
            ORDER BY s.soil_moisture_Time DESC
            LIMIT ?`;
        db.query(query, [deviceId, deviceId, deviceId, limit], (err, result) => {
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
 * FUNCTION: getSoilMoistureDataByDeviceId
 * MÔ TẢ: Lấy dữ liệu độ ẩm đất của một device
 * ============================================================================
 * 
 * @param {number} deviceId - ID của device
 * @param {number} limit - Số lượng records tối đa
 * @param {string} startDate - Ngày bắt đầu (optional, format: YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (optional, format: YYYY-MM-DD)
 * @returns {Promise<Array>} - Promise resolve với array dữ liệu
 */
const getSoilMoistureDataByDeviceId = function (deviceId, limit, startDate = null, endDate = null) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT
                soil_moisture_Time,
                soil_moisture_Value
            FROM
                tbl_soil_moisture
            WHERE
                soil_moisture_DeviceID = ?`;
        
        const params = [deviceId];
        
        // Add date filters if provided
        if (startDate) {
            query += ` AND soil_moisture_Time >= ?`;
            params.push(startDate + ' 00:00:00');
        }
        if (endDate) {
            query += ` AND soil_moisture_Time <= ?`;
            params.push(endDate + ' 23:59:59');
        }
        
        query += ` ORDER BY soil_moisture_Time DESC LIMIT ?`;
        params.push(limit);
        
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
 * FUNCTION: getDht20DataByDeviceId
 * MÔ TẢ: Lấy dữ liệu DHT20 (nhiệt độ + độ ẩm không khí) của một device
 * ============================================================================
 * 
 * @param {number} deviceId - ID của device
 * @param {number} limit - Số lượng records tối đa
 * @param {string} startDate - Ngày bắt đầu (optional, format: YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (optional, format: YYYY-MM-DD)
 * @returns {Promise<Array>} - Promise resolve với array dữ liệu
 */
const getDht20DataByDeviceId = function (deviceId, limit, startDate = null, endDate = null) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT
                dht_Time,
                dht_Temp,
                dht_Humid
            FROM
                tbl_dht20
            WHERE
                dht_DeviceID = ?`;
        
        const params = [deviceId];
        
        // Add date filters if provided
        if (startDate) {
            query += ` AND dht_Time >= ?`;
            params.push(startDate + ' 00:00:00');
        }
        if (endDate) {
            query += ` AND dht_Time <= ?`;
            params.push(endDate + ' 23:59:59');
        }
        
        query += ` ORDER BY dht_Time DESC LIMIT ?`;
        params.push(limit);
        
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
 * FUNCTION: getWaterPumpDataByDeviceId
 * MÔ TẢ: Lấy lịch sử hoạt động máy bơm (chỉ lấy lúc BẬT)
 * ============================================================================
 * 
 * @param {number} deviceId - ID của device
 * @param {number} limit - Số lượng records tối đa
 * @returns {Promise<Array>} - Promise resolve với array dữ liệu
 * 
 * SQL: SELECT ... FROM tbl_water_pump
 *      WHERE water_pump_Value = 1 AND water_pump_DeviceID = ?
 *      ORDER BY water_pump_Time DESC
 *      LIMIT ?
 * 
 * RETURN DATA STRUCTURE:
 * [{
 *   water_pump_Time: "2024-01-15 10:30:00",
 *   water_pump_Value: 1,
 *   water_pump_Mode: "MANUAL",
 *   water_pump_Duration: 10
 * }, ...]
 * 
 * LƯU Ý:
 * - Chỉ lấy records có value = 1 (lúc bật máy bơm)
 * - Dùng để xem "khi nào đã tưới nước"
 */
const getWaterPumpDataByDeviceId = function (deviceId, limit) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT
                water_pump_Time,
                water_pump_Value,
                water_pump_Mode,
                water_pump_Duration
            FROM
                tbl_water_pump
            WHERE
                water_pump_Value = 1 AND
                water_pump_DeviceID = ?
            ORDER BY
                water_pump_Time DESC
            LIMIT ?`;
        db.query(query, [deviceId, limit], (err, result) => {
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
 * Export tất cả functions để controllers sử dụng
 */
module.exports = {
    insertSoilMoisture,              // Lưu dữ liệu độ ẩm đất
    insertDht20,                     // Lưu dữ liệu DHT20
    insertWaterPump,                 // Lưu trạng thái máy bơm
    getSensorDataByDeviceId,         // Lấy tất cả sensor data (JOIN)
    getDht20DataByDeviceId,          // Lấy dữ liệu DHT20
    getSoilMoistureDataByDeviceId,   // Lấy dữ liệu độ ẩm đất
    getWaterPumpDataByDeviceId       // Lấy lịch sử máy bơm
}
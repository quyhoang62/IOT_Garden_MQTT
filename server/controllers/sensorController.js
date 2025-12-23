/**
 * ============================================================================
 * FILE: controllers/sensorController.js
 * MÔ TẢ: Controller xử lý dữ liệu từ các cảm biến IoT
 * ============================================================================
 * 
 * File này quản lý việc lưu trữ và truy xuất dữ liệu từ các loại cảm biến:
 * 
 * CÁC LOẠI CẢM BIẾN:
 * ┌─────────────────┬────────────────────────────────────────────────────────┐
 * │ Cảm biến        │ Mô tả                                                  │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ DHT20           │ Cảm biến nhiệt độ và độ ẩm không khí                   │
 * │                 │ - temp: Nhiệt độ (°C), range: -40 to 80                │
 * │                 │ - humid: Độ ẩm (%), range: 0 to 100                    │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ Soil Moisture   │ Cảm biến độ ẩm đất                                     │
 * │                 │ - value: Độ ẩm đất (%), range: 0 to 100                │
 * │                 │ - Giá trị thấp = đất khô, cần tưới                     │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ Water Pump      │ Trạng thái máy bơm nước                                │
 * │                 │ - value: 0 = tắt, 1 = bật                              │
 * └─────────────────┴────────────────────────────────────────────────────────┘
 * 
 * LUỒNG DỮ LIỆU:
 * IoT Device -> MQTT Broker -> mqttModel -> sensorController -> sensorModel -> Database
 * 
 * ============================================================================
 */

/**
 * Import sensorModel để thao tác với các bảng sensor trong database
 * - tbl_soil_moisture: Lưu dữ liệu độ ẩm đất
 * - tbl_dht20: Lưu dữ liệu nhiệt độ và độ ẩm không khí
 * - tbl_water_pump: Lưu lịch sử hoạt động máy bơm
 */
const sensorModel = require('../models/sensorModel')

/**
 * Object mapping sensor type -> insert function
 * Dùng để gọi động function tương ứng với loại sensor
 * 
 * HIỆN TẠI KHÔNG SỬ DỤNG (đã thay thế bằng insertSensorData)
 */
const sensorActions = {
    'pump': sensorModel.insertWaterPump,
    'soil_moisture': sensorModel.insertSoilMoisture
};

/**
 * ============================================================================
 * FUNCTION: insertSensorData
 * MÔ TẢ: Lưu dữ liệu từ cảm biến vào database
 * ============================================================================
 * 
 * Function này được gọi từ mqttModel khi nhận được message từ MQTT broker.
 * Nó xác định loại sensor và gọi function insert tương ứng.
 * 
 * @param {string} sensor - Loại cảm biến ('pump' hoặc 'soil_moisture')
 * @param {Object} values - Object chứa dữ liệu cần lưu
 * @param {string} values.timeStamp - Thời gian ghi nhận (format: YYYY-MM-DD HH:mm:ss)
 * @param {number} values.value - Giá trị đo được
 * @param {number} values.gardenId - ID của vườn
 * @returns {Promise} - Promise resolve với insertId nếu thành công
 * 
 * ĐƯỢC GỌI TỪ: mqttModel.js khi nhận message từ MQTT
 * 
 * SUPPORTED SENSORS:
 * - 'pump': Lưu vào tbl_water_pump
 * - 'soil_moisture': Lưu vào tbl_soil_moisture
 */
const insertSensorData = (sensor, values) => {
    if (sensor === 'pump') {
        // Lưu trạng thái máy bơm (0 = tắt, 1 = bật)
        return sensorModel.insertWaterPump(values)
    } else if (sensor === 'soil_moisture') {
        // Lưu giá trị độ ẩm đất (%)
        return sensorModel.insertSoilMoisture(values)
    } else {
        // Loại sensor không được hỗ trợ
        return Promise.reject(new Error(`Unknown sensor type: ${sensor}`));
    }
}

/**
 * ============================================================================
 * FUNCTION: insertDht20Data
 * MÔ TẢ: Lưu dữ liệu từ cảm biến DHT20 (nhiệt độ + độ ẩm)
 * ============================================================================
 * 
 * DHT20 gửi dữ liệu qua 2 topic MQTT riêng biệt (V3 và V4).
 * mqttModel buffer 2 giá trị này và gọi function này khi có đủ cả 2.
 * 
 * @param {Object} tempValue - Object chứa dữ liệu nhiệt độ
 * @param {string} tempValue.timeStamp - Thời gian ghi nhận
 * @param {number} tempValue.value - Giá trị nhiệt độ (°C)
 * @param {number} tempValue.gardenId - ID vườn
 * @param {Object} humidValue - Object chứa dữ liệu độ ẩm
 * @param {number} humidValue.value - Giá trị độ ẩm (%)
 * @returns {Promise} - Promise resolve với insertId
 * 
 * ĐƯỢC GỌI TỪ: mqttModel.js khi đã nhận đủ cả temp và humid
 * 
 * LÝ DO KẾT HỢP:
 * - DHT20 đo đồng thời cả nhiệt độ và độ ẩm
 * - Lưu cùng 1 record để dễ query và phân tích
 * - Tiết kiệm số lượng records trong database
 */
const insertDht20Data = (tempValue, humidValue) => {
    /**
     * Spread operator để tạo object mới:
     * - Lấy tất cả properties từ tempValue (timeStamp, gardenId)
     * - Thêm temp và humid từ 2 giá trị riêng biệt
     */
    return sensorModel.insertDht20({ 
        ...tempValue, 
        temp: tempValue.value,    // Nhiệt độ từ tempValue
        humid: humidValue.value   // Độ ẩm từ humidValue
    });
};

/**
 * ============================================================================
 * FUNCTION: getSensorData
 * MÔ TẢ: Lấy tất cả dữ liệu sensor của một vườn (JOIN 3 bảng)
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/sensor-data/:gardenId
 * Query params: ?limit=<number> (default: 10)
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.gardenId - ID của vườn
 * @param {string} req.query.limit - Số lượng records tối đa (mặc định: 10)
 * @param {Object} res - Express response object
 * 
 * RESPONSE:
 * - Thành công (200): Array of combined sensor data
 *   [{
 *     soil_moisture_Time, soil_moisture_Value,
 *     dht_Time, dht_Temp, dht_Humid,
 *     water_pump_Time, water_pump_Value
 *   }, ...]
 * - Invalid gardenId (400): { error: "Invalid garden ID" }
 * - Invalid limit (400): { error: "Invalid limit value" }
 * - Lỗi server (500): { error: "An error occurred while fetching sensor data" }
 * 
 * LƯU Ý: Query này JOIN 3 bảng nên có thể chậm với dataset lớn
 */
const getSensorData = (req, res) => {
    const deviceId = req.params.deviceId;
    
    // Validate deviceId phải là số
    if (isNaN(deviceId)) {
        return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    // Parse limit từ query string, mặc định là 10
    const limit = parseInt(req.query.limit) || 10;
    
    // Validate limit phải là số dương
    if (isNaN(limit) || limit <= 0) {
        return res.status(400).json({ error: 'Invalid limit value' });
    }
    
    // Query database và trả về kết quả
    sensorModel.getSensorDataByDeviceId(deviceId, limit)
        .then(sensorData => {
            res.json(sensorData);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'An error occurred while fetching sensor data' })
        });
}

/**
 * ============================================================================
 * FUNCTION: getSoilMoistureData
 * MÔ TẢ: Lấy dữ liệu độ ẩm đất của một vườn
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/soil-moisture/:gardenId
 * Query params: ?limit=<number> (default: 10)
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.gardenId - ID của vườn
 * @param {string} req.query.limit - Số lượng records tối đa
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * RESPONSE:
 * - Thành công (200): [{ soil_moisture_Time, soil_moisture_Value }, ...]
 * - Lỗi: Truyền cho error handling middleware
 * 
 * DỮ LIỆU TRẢ VỀ:
 * - soil_moisture_Time: Thời gian đo
 * - soil_moisture_Value: Giá trị độ ẩm đất (%)
 * - Sắp xếp: Mới nhất trước (ORDER BY DESC)
 */
const getSoilMoistureData = async (req, res, next) => {
    try {
        const deviceId = req.params.deviceId;
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;
        
        const data = await sensorModel.getSoilMoistureDataByDeviceId(deviceId, limit, startDate, endDate);
        res.status(200).json(data);
    } catch (err) {
        // Truyền lỗi cho error handling middleware
        next(err)
    }
}

/**
 * ============================================================================
 * FUNCTION: getDht20Data
 * MÔ TẢ: Lấy dữ liệu nhiệt độ và độ ẩm không khí từ DHT20
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/dht20/:gardenId
 * Query params: ?limit=<number> (default: 10)
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.gardenId - ID của vườn
 * @param {string} req.query.limit - Số lượng records tối đa
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * RESPONSE:
 * - Thành công (200): [{ dht_Time, dht_Temp, dht_Humid }, ...]
 * - Lỗi: Truyền cho error handling middleware
 * 
 * DỮ LIỆU TRẢ VỀ:
 * - dht_Time: Thời gian đo
 * - dht_Temp: Nhiệt độ không khí (°C)
 * - dht_Humid: Độ ẩm không khí (%)
 * - Sắp xếp: Mới nhất trước (ORDER BY DESC)
 */
const getDht20Data = async (req, res, next) => {
    try {
        const deviceId = req.params.deviceId;
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;
        
        const data = await sensorModel.getDht20DataByDeviceId(deviceId, limit, startDate, endDate);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
}

/**
 * ============================================================================
 * FUNCTION: getWaterPumpData
 * MÔ TẢ: Lấy lịch sử hoạt động máy bơm của một vườn
 * ============================================================================
 * 
 * HTTP Method: GET
 * Endpoint: /api/v1/water-pump/:gardenId
 * Query params: ?limit=<number> (default: 10)
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.gardenId - ID của vườn
 * @param {string} req.query.limit - Số lượng records tối đa
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * RESPONSE:
 * - Thành công (200): [{ water_pump_Time, water_pump_Value }, ...]
 * - Lỗi: Truyền cho error handling middleware
 * 
 * DỮ LIỆU TRẢ VỀ:
 * - water_pump_Time: Thời gian bật/tắt máy bơm
 * - water_pump_Value: Trạng thái (chỉ lấy value = 1, tức là lúc BẬT)
 * - Sắp xếp: Mới nhất trước (ORDER BY DESC)
 * 
 * USE CASE:
 * - Xem lịch sử tưới nước
 * - Thống kê số lần tưới trong ngày/tuần/tháng
 * - Phân tích lượng nước sử dụng
 */
const getWaterPumpData = async (req, res, next) => {
    try {
        const deviceId = req.params.deviceId;
        const limit = parseInt(req.query.limit) || 10;
        
        const data = await sensorModel.getWaterPumpDataByDeviceId(deviceId, limit);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
}


/**
 * Export các controller functions
 */
module.exports = {
    insertSensorData,     // Lưu dữ liệu pump hoặc soil moisture
    insertDht20Data,      // Lưu dữ liệu DHT20 (temp + humid)
    getSensorData,        // Lấy tất cả sensor data (JOIN 3 bảng)
    getSoilMoistureData,  // Lấy dữ liệu độ ẩm đất
    getDht20Data,         // Lấy dữ liệu DHT20
    getWaterPumpData      // Lấy lịch sử máy bơm
}
/**
 * ============================================================================
 * FILE: server.js
 * MÔ TẢ: File chính của ứng dụng server - Entry point của hệ thống IOT Garden
 * ============================================================================
 * Server này xử lý tất cả các API request từ client, bao gồm:
 * - Quản lý người dùng (User management)
 * - Xác thực đăng nhập/đăng ký (Authentication)
 * - Giao tiếp với thiết bị IoT qua MQTT
 * - Quản lý dữ liệu cảm biến (Sensor data)
 * - Quản lý điều kiện tự động (Automation conditions)
 * - Quản lý thiết bị (Device management)
 * ============================================================================
 */

// ============================================================================
// PHẦN 1: IMPORT CÁC MODULE CẦN THIẾT
// ============================================================================

/**
 * Express.js - Framework web phổ biến nhất cho Node.js
 * Cung cấp các công cụ để tạo web server và xử lý HTTP requests
 * Tài liệu: https://expressjs.com/
 */
const express = require('express')

/**
 * Import các Router modules - Mỗi router xử lý một nhóm API endpoints riêng biệt
 * Việc chia nhỏ routes giúp code dễ quản lý và bảo trì hơn (Separation of Concerns)
 */


/**
 * mqttRouter - Xử lý giao tiếp với thiết bị IoT thông qua giao thức MQTT
 * MQTT (Message Queuing Telemetry Transport) là giao thức nhẹ, 
 * phù hợp cho các thiết bị IoT với băng thông hạn chế
 */
const mqttRouter = require('./routes/mqttRouter')


/**
 * sensorRouter - Xử lý dữ liệu từ các cảm biến
 * Ví dụ: Đọc nhiệt độ, độ ẩm, độ ẩm đất...
 */
const sensorRouter = require('./routes/sensorRouter')

// Bỏ gardenRouter - không còn quản lý garden




/**
 * deviceRouter - Xử lý quản lý thiết bị ESP32
 * Bao gồm: Thêm, sửa, xóa, xem danh sách thiết bị
 */
const deviceRouter = require('./routes/deviceRouter')

/**
 * thresholdRouter - Xử lý ngưỡng tưới tự động
 * Bao gồm: Đặt ngưỡng, bật/tắt tưới tự động
 */
const thresholdRouter = require('./routes/thresholdRouter')

/**
 * scheduleRouter - Xử lý lịch tưới tự động
 * Bao gồm: Tạo, sửa, xóa, xem lịch tưới
 */
const scheduleRouter = require('./routes/scheduleRouter')

/**
 * body-parser - Middleware để parse (phân tích) body của HTTP requests
 * Chuyển đổi dữ liệu raw từ request thành JavaScript object
 * Hỗ trợ: JSON, URL-encoded, raw, text
 */
const bodyParser = require('body-parser');

// ============================================================================
// PHẦN 2: KHỞI TẠO ỨNG DỤNG EXPRESS
// ============================================================================

/**
 * Tạo instance của Express application
 * 'app' là object chính để cấu hình server, định nghĩa routes và middleware
 */
const app = express();

/**
 * Định nghĩa cổng (port) mà server sẽ lắng nghe
 * PORT 5000 được sử dụng cho development
 * Trong production, thường sử dụng biến môi trường: process.env.PORT || 5000
 */
const PORT = 5000;

// ============================================================================
// PHẦN 3: CẤU HÌNH MIDDLEWARE
// ============================================================================

/**
 * Middleware là các function được thực thi TRƯỚC khi request đến route handler
 * Các middleware được thực thi theo thứ tự khai báo (từ trên xuống dưới)
 */

/**
 * bodyParser.urlencoded() - Parse dữ liệu từ HTML forms
 * - extended: false -> Sử dụng thư viện 'querystring' (đơn giản hơn)
 * - extended: true -> Sử dụng thư viện 'qs' (hỗ trợ nested objects)
 * 
 * Ví dụ input: "name=John&age=30"
 * Output: { name: "John", age: "30" }
 */
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * bodyParser.json() - Parse dữ liệu JSON từ request body
 * Đây là middleware quan trọng nhất cho REST API
 * 
 * Ví dụ input: '{"name": "John", "age": 30}'
 * Output: { name: "John", age: 30 }
 * 
 * Sau khi parse, dữ liệu có thể truy cập qua req.body
 */
app.use(bodyParser.json());


// ============================================================================
// PHẦN 4: ĐỊNH NGHĨA CÁC ROUTES (API ENDPOINTS)
// ============================================================================

/**
 * Route test cơ bản để kiểm tra server có hoạt động không
 * 
 * HTTP Method: GET
 * URL: /api/test
 * Response: JSON object chứa mảng users
 * 
 * Sử dụng để:
 * - Kiểm tra server đã start thành công
 * - Test kết nối từ client (Frontend/Postman)
 * - Debug trong quá trình phát triển
 * 
 * @param {Object} req - Request object (chứa thông tin request từ client)
 * @param {Object} res - Response object (dùng để gửi response về client)
 */
app.get("/api/test", (req, res) => {
    res.json({ "users": ["userOne", "userTwo", "userThree"] });
});


/**
 * Mount mqttRouter vào root path "/"
 * 
 * Router này xử lý giao tiếp với các thiết bị IoT qua giao thức MQTT
 * Được mount ở root để linh hoạt trong việc định nghĩa các endpoints
 * 
 * Các chức năng có thể bao gồm:
 * - Publish message đến thiết bị (bật/tắt đèn, bơm...)
 * - Subscribe để nhận dữ liệu từ thiết bị
 * - Quản lý kết nối MQTT
 */
app.use("/", mqttRouter);


/**
 * Mount sensorRouter vào đường dẫn /api/v1
 * 
 * Xử lý dữ liệu cảm biến từ thiết bị IoT:
 * - GET /api/v1/sensors -> Lấy dữ liệu tất cả cảm biến
 * - GET /api/v1/sensors/:id -> Lấy dữ liệu cảm biến theo ID
 * - POST /api/v1/sensors -> Lưu dữ liệu cảm biến mới
 * - GET /api/v1/sensors/history -> Lấy lịch sử dữ liệu cảm biến
 * 
 * Các loại cảm biến thường gặp trong IoT Garden:
 * - Nhiệt độ (Temperature)
 * - Độ ẩm không khí (Humidity)
 * - Độ ẩm đất (Soil Moisture)
 */
app.use('/api/v1', sensorRouter);

// Bỏ gardenRouter - không còn quản lý garden, chỉ quản lý device




/**
 * Mount deviceRouter tại /api/v1/devices
 * Endpoints:
 * - GET /api/v1/devices - Lấy tất cả devices
 * - GET /api/v1/devices/:id - Lấy device theo ID
 * - GET /api/v1/devices - Lấy tất cả devices
 * - POST /api/v1/devices - Thêm device mới
 * - PUT /api/v1/devices/:id - Cập nhật device
 * - DELETE /api/v1/devices/:id - Xóa device
 */
app.use('/api/v1/devices', deviceRouter);

/**
 * Mount thresholdRouter tại /api/v1/thresholds
 * Endpoints:
 * - GET /api/v1/thresholds/:deviceId - Lấy ngưỡng theo Device ID
 * - PUT /api/v1/thresholds/:deviceId - Cập nhật ngưỡng
 * - POST /api/v1/thresholds/:deviceId/toggle - Bật/tắt tưới tự động
 */
app.use('/api/v1/thresholds', thresholdRouter);

/**
 * Mount scheduleRouter tại /api/v1/schedules
 * Endpoints:
 * - GET /api/v1/schedules/garden/:gardenId - Lấy lịch tưới theo Garden ID
 * - POST /api/v1/schedules - Tạo lịch tưới mới
 * - PUT /api/v1/schedules/:scheduleId - Cập nhật lịch tưới
 * - DELETE /api/v1/schedules/:scheduleId - Xóa lịch tưới
 * - POST /api/v1/schedules/:scheduleId/toggle - Toggle status lịch
 */
app.use('/api/v1/schedules', scheduleRouter);

// ============================================================================
// PHẦN 5: KHỞI ĐỘNG SERVER
// ============================================================================

/**
 * Khởi động Express server và lắng nghe các kết nối đến
 * 
 * app.listen() thực hiện:
 * 1. Tạo HTTP server
 * 2. Bind server vào PORT được chỉ định
 * 3. Bắt đầu lắng nghe các incoming connections
 * 
 * Callback function được gọi khi server đã sẵn sàng nhận requests
 * 
 * Biến 'server' lưu trữ instance của HTTP server, có thể dùng để:
 * - Đóng server: server.close()
 * - Tích hợp WebSocket: require('socket.io')(server)
 * - Lấy địa chỉ server: server.address()
 * 
 * @returns {http.Server} Instance của HTTP server
 */
const server = app.listen(PORT, () => { 
    console.log(`Server started on port ${PORT} `) 
});

/**
 * ============================================================================
 * PHẦN 6: KHỞI ĐỘNG SCHEDULED JOBS
 * ============================================================================
 */

/**
 * Khởi động scheduled job để kiểm tra và thực thi lịch tưới tự động
 */
const scheduleService = require('./services/scheduleService');
scheduleService.startScheduleJob();

/**
 * ============================================================================
 * TÓM TẮT KIẾN TRÚC API:
 * ============================================================================
 * 
 * Base URL: http://localhost:5000
 * 
 * API Versioning: /api/v1 (phiên bản 1)
 * 
 * Endpoints:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Method │ Endpoint              │ Mô tả                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ GET    │ /api/test             │ Test server connection                │
 * │ *      │ /api/v1/users/*       │ Quản lý người dùng                    │
 * │ *      │ /api/v1/login         │ Đăng nhập                             │
 * │ *      │ /api/v1/register      │ Đăng ký                               │
 * │ *      │ /api/v1/sensors/*     │ Dữ liệu cảm biến                      │
 * │ *      │ /api/v1/condition/*   │ Điều kiện tự động                     │
 * │ *      │ /api/v1/devices/*     │ Quản lý thiết bị                      │
 * │ *      │ /*                    │ MQTT communication                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ============================================================================
 */
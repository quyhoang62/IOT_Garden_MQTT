# 📋 Changelog - Major System Update

Tài liệu tóm tắt tất cả các thay đổi lớn trong hệ thống IoT Garden.

## ✅ Đã hoàn thành

### 1. ✅ Sửa lỗi "Tưới ngay" - Garden ID mapping

**Vấn đề:** Khi ấn "Tưới ngay", server gửi đến topic cố định `IOTGARDEN222/feeds/V1` thay vì topic đúng theo `gardenId`.

**Giải pháp:**
- ✅ Sửa `mqttController.js` để map `gardenId` → `deviceId` (MQTT ID)
- ✅ Tạo topic động: `IOTGARDEN{deviceId}/feeds/V1`
- ✅ Tạo `deviceController.getDeviceIdByGardenId()` để lookup từ database

**Files đã sửa:**
- `server/controllers/mqttController.js`
- `server/controllers/deviceController.js` (mới)

---

### 2. ✅ Thêm tính năng ngưỡng tưới tự động

**Tính năng:** Hệ thống tự động tưới khi cảm biến vượt ngưỡng.

**Giải pháp:**
- ✅ Tạo bảng `tbl_watering_threshold` trong database
- ✅ Tạo `thresholdModel.js` và `thresholdController.js`
- ✅ Tích hợp `checkAndAutoWater()` vào `mqttModel.js` khi nhận sensor data
- ✅ Thêm UI trong `Irrigation.js` để đặt ngưỡng

**Files đã tạo:**
- `server/models/thresholdModel.js`
- `server/controllers/thresholdController.js`
- `server/routes/thresholdRouter.js`
- `server/migrations/add_device_management.sql`

**Files đã sửa:**
- `server/models/mqttModel.js` - Tích hợp auto-watering
- `client/src/components/Irrigation/Irrigation.js` - UI đặt ngưỡng

**API Endpoints:**
- `GET /api/v1/thresholds/:gardenId` - Lấy ngưỡng
- `PUT /api/v1/thresholds/:gardenId` - Cập nhật ngưỡng
- `POST /api/v1/thresholds/:gardenId/toggle` - Bật/tắt tưới tự động

---

### 3. ✅ Quản lý thiết bị (Device Management)

**Tính năng:** Thêm/bớt thiết bị ESP32 động.

**Giải pháp:**
- ✅ Tạo bảng `tbl_device` trong database
- ✅ Tạo `deviceModel.js` và `deviceController.js`
- ✅ Thêm routes `/api/v1/devices`
- ✅ Sửa Settings để hiển thị và quản lý devices

**Files đã tạo:**
- `server/models/deviceModel.js`
- `server/controllers/deviceController.js`
- `server/routes/deviceRouter.js`
- `server/migrations/add_device_management.sql`

**Files đã sửa:**
- `server/server.js` - Thêm deviceRouter và thresholdRouter
- `client/src/components/Settings/Settings.js` - UI quản lý thiết bị

**API Endpoints:**
- `GET /api/v1/devices` - Lấy tất cả devices
- `GET /api/v1/devices/:id` - Lấy device theo ID
- `GET /api/v1/devices/garden/:gardenId` - Lấy devices theo Garden ID
- `POST /api/v1/devices` - Thêm device mới
- `PUT /api/v1/devices/:id` - Cập nhật device
- `DELETE /api/v1/devices/:id` - Xóa device

---

### 4. ✅ Cập nhật thông tin người dùng

**Tính năng:** Cho phép thay đổi thông tin user và lưu vào database.

**Giải pháp:**
- ✅ Sửa `Settings.js` để lấy đúng thông tin user từ API
- ✅ Gọi `PUT /api/v1/users/:id` để cập nhật
- ✅ Thêm fields: Phone, Address

**Files đã sửa:**
- `client/src/components/Settings/Settings.js`

---

### 5. ✅ Sửa ngôn ngữ và bỏ múi giờ

**Tính năng:** Chuyển đổi ngôn ngữ tiếng Anh/Tiếng Việt, bỏ phần múi giờ.

**Giải pháp:**
- ✅ Thêm state `language` và lưu vào localStorage
- ✅ Bỏ phần múi giờ trong Settings
- ✅ Reload page khi đổi ngôn ngữ (có thể cải thiện sau với i18n)

**Files đã sửa:**
- `client/src/components/Settings/Settings.js`

---

### 6. ✅ Email đăng ký = Email cảnh báo

**Tính năng:** Email nhập khi đăng ký sẽ được dùng làm email nhận cảnh báo.

**Giải pháp:**
- ✅ Sửa `SignUp.js` để thêm email field
- ✅ Sửa `authController.js` để nhận email và tạo notification settings
- ✅ Sửa `userModel.js` để lưu email vào database

**Files đã sửa:**
- `client/src/components/SignUp.js`
- `server/controllers/authController.js`
- `server/models/userModel.js`

---

## 📝 Cần thực hiện thêm

### Database Migration

**Chạy SQL migration để cập nhật database:**

```sql
-- File: server/migrations/add_device_management.sql
-- Chạy file này trong MySQL để:
-- 1. Tạo bảng tbl_device
-- 2. Tạo bảng tbl_watering_threshold
-- 3. Cập nhật tbl_user (bỏ ADMIN role)
-- 4. Tạo device mặc định cho garden hiện có
```

**Cách chạy:**
```bash
mysql -u your_username -p iot_garden_database < server/migrations/add_device_management.sql
```

Hoặc import qua phpMyAdmin.

---

## 🔄 Các thay đổi Database

### Bảng mới:

1. **tbl_device** - Quản lý thiết bị ESP32
   - `device_ID` (PK)
   - `device_Name`
   - `device_MQTT_ID` (unique) - ID trong MQTT topic
   - `device_GardenID` (FK)
   - `device_Status` (ACTIVE/INACTIVE/OFFLINE)
   - `device_Location`
   - `device_Description`

2. **tbl_watering_threshold** - Ngưỡng tưới tự động
   - `threshold_ID` (PK)
   - `threshold_GardenID` (FK, unique)
   - `threshold_Temp_Min/Max`
   - `threshold_Humidity_Min/Max`
   - `threshold_SoilMoisture_Min/Max`
   - `threshold_Enabled`
   - `threshold_Duration`

### Bảng đã sửa:

1. **tbl_user**
   - Bỏ role ADMIN (chỉ còn USER)
   - Email được lưu khi đăng ký

2. **tbl_garden**
   - Thêm `garden_DeviceID` (FK) để map với device

---

## 🚀 Hướng dẫn triển khai

### 1. Chạy Database Migration

```bash
cd server
mysql -u root -p iot_garden_database < migrations/add_device_management.sql
```

### 2. Khởi động lại Server

```bash
cd server
npm install  # Nếu có dependencies mới
npm run dev
```

### 3. Khởi động lại Client

```bash
cd client
npm start
```

### 4. Test các tính năng mới

1. **Test tưới ngay:**
   - Vào "Quản lí tưới" → Ấn "Tưới ngay"
   - Kiểm tra log server: Topic phải là `IOTGARDEN{gardenId}/feeds/V1`

2. **Test ngưỡng tưới:**
   - Vào "Quản lí tưới" → Đặt ngưỡng → Lưu
   - Khi sensor data vượt ngưỡng, hệ thống tự động tưới

3. **Test quản lý thiết bị:**
   - Vào "Cài đặt" → "Quản lý thiết bị"
   - Thêm thiết bị mới với MQTT ID khác
   - Xóa thiết bị

4. **Test cập nhật user:**
   - Vào "Cài đặt" → "Tài khoản"
   - Sửa thông tin → Lưu
   - Kiểm tra database đã cập nhật

---

## ⚠️ Lưu ý quan trọng

1. **Database Migration:** PHẢI chạy migration SQL trước khi sử dụng các tính năng mới.

2. **Device ID:** Mỗi ESP32 cần có `device_MQTT_ID` unique. Không được trùng lặp.

3. **Garden ID vs Device ID:** 
   - Hiện tại: `gardenId = deviceId` (giống nhau)
   - Trong tương lai có thể khác nhau (1 garden có nhiều devices)

4. **Auto-watering:** Chỉ hoạt động khi:
   - `threshold_Enabled = true`
   - Có đủ cả 3 giá trị: temperature, humidity, soilMoisture
   - Một trong các giá trị vượt ngưỡng

5. **Email:** Email đăng ký sẽ tự động được dùng làm `notification_email` trong notification settings.

---

## 📊 Tóm tắt Files

### Backend (Server):
- ✅ `server/controllers/mqttController.js` - Sửa map gardenId → deviceId
- ✅ `server/controllers/deviceController.js` - Mới
- ✅ `server/controllers/thresholdController.js` - Mới
- ✅ `server/models/deviceModel.js` - Mới
- ✅ `server/models/thresholdModel.js` - Mới
- ✅ `server/models/mqttModel.js` - Tích hợp auto-watering
- ✅ `server/models/userModel.js` - Thêm email parameter
- ✅ `server/routes/deviceRouter.js` - Mới
- ✅ `server/routes/thresholdRouter.js` - Mới
- ✅ `server/server.js` - Thêm routes mới
- ✅ `server/migrations/add_device_management.sql` - Mới

### Frontend (Client):
- ✅ `client/src/components/Settings/Settings.js` - Cập nhật user, quản lý thiết bị, ngôn ngữ
- ✅ `client/src/components/Irrigation/Irrigation.js` - Thêm ngưỡng tưới
- ✅ `client/src/components/SignUp.js` - Thêm email field

---

## 🎯 Kết quả

Sau khi hoàn thành, hệ thống sẽ có:
- ✅ Tưới ngay hoạt động đúng với gardenId
- ✅ Tưới tự động theo ngưỡng cảm biến
- ✅ Quản lý thiết bị động (thêm/bớt)
- ✅ Cập nhật thông tin user
- ✅ Chuyển đổi ngôn ngữ
- ✅ Email đăng ký = email cảnh báo









## 📚 Thiết Kế API, CSDL và UI/UX – IoT Garden

File này mô tả chi tiết **API Backend cung cấp cho Frontend**, **sơ đồ Database** và **luồng giao diện người dùng (UI/UX Flow)**.

---

## 1. Thiết Kế API (API Specification)

### 1.1. Quy ước chung

- **Base URL Backend**: `http://<server-host>:<port>`
- **Base path REST**: `/api/v1`
- **Format dữ liệu**: `JSON`
- **Authentication**:
  - Một số API yêu cầu **JWT** trong header: `Authorization: Bearer <token>`
- **Múi giờ / thời gian**:
  - Thời gian trao đổi dạng `YYYY-MM-DD HH:mm:ss` hoặc ISO string.

---

### 1.2. Nhóm API Authentication (`authRouter`)

- **Đăng nhập**
  - **Method**: `POST`
  - **Path**: `/api/v1/login`
  - **Body**:
    ```json
    {
      "username": "string",
      "password": "string",
      "rememberMe": true
    }
    ```
  - **Response 200**:
    ```json
    { "token": "<jwt-token>" }
    ```

- **Đăng ký**
  - **Method**: `POST`
  - **Path**: `/api/v1/signup`
  - **Body**:
    ```json
    {
      "name": "string",
      "username": "string",
      "password": "string"
    }
    ```
  - **Response 200**:
    ```json
    { "token": "<jwt-token>" }
    ```

- **Lấy thông tin user đang đăng nhập** 🔒
  - **Method**: `GET`
  - **Path**: `/api/v1/user`
  - **Header**: `Authorization: Bearer <token>`
  - **Response 200** (ví dụ):
    ```json
    {
      "id": 1,
      "username": "johndoe",
      "iat": 1699999999,
      "exp": 1700086399
    }
    ```

---

### 1.3. Nhóm API User (`userRouter`)

- **Lấy tất cả user**
  - `GET /api/v1/users/getall`

- **Lấy user theo ID**
  - `GET /api/v1/users/:id`

- **Lấy user theo username**
  - `GET /api/v1/users/getname/:name`

- **Tạo user (dùng nội bộ, không hash password)**
  - `POST /api/v1/users/create`

- **Cập nhật user**
  - `PUT /api/v1/users/:id`

- **Xóa user**
  - `DELETE /api/v1/users/:id`

- **Lấy data vườn + sensor của user đang đăng nhập** 🔒
  - `GET /api/v1/users/garden/data`
  - Dùng cho **Dashboard cá nhân**.

---

### 1.4. Nhóm API Garden (`gardenRouter`)

- **Lấy danh sách vườn**
  - `GET /api/v1/gardens/`

- **Lấy chi tiết vườn**
  - `GET /api/v1/gardens/:id`

- **Tạo vườn mới**
  - `POST /api/v1/gardens/`

- **Cập nhật vườn**
  - `PUT /api/v1/gardens/:id`

- **Xóa vườn**
  - `DELETE /api/v1/gardens/:id`

---

### 1.5. Nhóm API Thiết Bị (`deviceRouter`)

- **Lấy tất cả thiết bị**
  - `GET /api/v1/devices`

- **Lấy thiết bị theo ID**
  - `GET /api/v1/devices/:id`

- **Thêm thiết bị mới**
  - `POST /api/v1/devices`

- **Cập nhật thiết bị**
  - `PUT /api/v1/devices/:id`

- **Xóa thiết bị**
  - `DELETE /api/v1/devices/:id`

---

### 1.6. Nhóm API Sensor (`sensorRouter`)

Áp dụng query `?limit=<number>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` cho một số API.

- **Dữ liệu tổng hợp sensor theo thiết bị**
  - `GET /api/v1/sensor-data/:deviceId`
  - Trả về JOIN: soil, dht, water pump.

- **Dữ liệu độ ẩm đất**
  - `GET /api/v1/soil-moisture/:deviceId`

- **Dữ liệu DHT20 (nhiệt độ + độ ẩm không khí)**
  - `GET /api/v1/dht20/:deviceId`

- **Lịch sử máy bơm**
  - `GET /api/v1/water-pump/:deviceId`

---

### 1.7. Nhóm API Ngưỡng Tưới Tự Động (`thresholdRouter`)

Base path trong server: `/api/v1/thresholds`

- **Lấy ngưỡng của 1 thiết bị**
  - `GET /api/v1/thresholds/:deviceId`

- **Cập nhật ngưỡng**
  - `PUT /api/v1/thresholds/:deviceId`
  - Body gồm các trường như: `threshold_SoilMoisture_Min/Max`, `threshold_Enabled`, `threshold_Duration`, `threshold_Pump`, ...

- **Bật / Tắt tưới tự động**
  - `POST /api/v1/thresholds/:deviceId/toggle`

---

### 1.8. Nhóm API Condition (ngưỡng điều kiện tổng hợp) (`conditionRouter`)

Base path: `/api/v1/condition`

- **Tạo condition mới**
  - `POST /api/v1/condition/`

- **Lấy condition theo garden**
  - `GET /api/v1/condition/:gardenId`

- **Cập nhật condition**
  - `PUT /api/v1/condition/:gardenId`

- **Xóa condition**
  - `DELETE /api/v1/condition/:gardenId`

Các trường chính: `condition_Amdat`, `condition_Temp`, `condition_Humid`, liên kết với `gardenId`.

---

### 1.9. Nhóm API Lịch Tưới (`scheduleRouter`)

Base path: `/api/v1/schedules`

- **Lấy lịch tưới theo thiết bị**
  - `GET /api/v1/schedules/device/:deviceId`

- **Tạo lịch tưới**
  - `POST /api/v1/schedules`

- **Cập nhật lịch tưới**
  - `PUT /api/v1/schedules/:scheduleId`

- **Xóa lịch tưới**
  - `DELETE /api/v1/schedules/:scheduleId`

- **Bật/Tắt 1 lịch tưới**
  - `POST /api/v1/schedules/:scheduleId/toggle`

---

### 1.10. Nhóm API MQTT / Điều Khiển Real-time (`mqttRouter`)

Base path được mount ở root: `/`

- **Lấy giá trị sensor mới nhất (cache RAM)**
  - `GET /latest-message`
  - Dùng cho dashboard cập nhật nhanh.

- **Bật bơm với thời gian cố định (10s)**
  - `POST /startPump`

- **Điều khiển relay linh hoạt**
  - `POST /controlRelay`
  - Body (ví dụ):
    ```json
    {
      "relay": "V1",
      "duration": 10,
      "deviceId": 1,
      "mode": "MANUAL"
    }
    ```

- **Dừng relay ngay lập tức**
  - `POST /stopRelay`

---

### 1.11. Nhóm API Thông Báo (`notificationRouter`)

Base path: `/api/v1/notifications` – tất cả đều 🔒.

- **Lấy cài đặt thông báo**
  - `GET /api/v1/notifications/settings`

- **Cập nhật cài đặt thông báo**
  - `PUT /api/v1/notifications/settings`

- **Gửi email test**
  - `POST /api/v1/notifications/test-email`

---

## 2. Thiết Kế Cơ Sở Dữ Liệu (Database Diagram)

### 2.1. Các bảng chính

- **tbl_device**
  - Lưu thông tin thiết bị ESP32.
  - Trường chính: `device_ID (PK)`, `device_Name`, `device_MQTT_ID (UQ)`, `device_Status`, `device_Location`, `device_Email`.

- **tbl_dht20**
  - Dữ liệu nhiệt độ & độ ẩm không khí.
  - `dht_ID (PK)`, `dht_Time`, `dht_Temp`, `dht_Humid`, `dht_DeviceID (FK → tbl_device)`.

- **tbl_soil_moisture**
  - Dữ liệu độ ẩm đất.
  - `soil_moisture_ID (PK)`, `soil_moisture_Time`, `soil_moisture_Value`, `soil_moisture_DeviceID (FK)`.

- **tbl_water_pump**
  - Lịch sử bật/tắt bơm.
  - `water_pump_ID (PK)`, `water_pump_Time`, `water_pump_Value`, `water_pump_Mode`, `water_pump_Duration`, `water_pump_DeviceID (FK)`.

- **tbl_watering_threshold**
  - Ngưỡng tưới tự động theo thiết bị.
  - `threshold_ID (PK)`, `threshold_DeviceID (FK, UQ)`, các trường Min/Max cho `Temp`, `Humidity`, `SoilMoisture`, `threshold_Enabled`, `threshold_Duration`, `threshold_Pump`.

- **tbl_irrigation_schedule**
  - Lịch tưới theo thời gian.
  - `schedule_ID (PK)`, `schedule_DeviceID (FK)`, `schedule_Days`, `schedule_Time`, `schedule_Duration`, `schedule_Status`, `schedule_Pump`.

- **tbl_condition**
  - Bộ điều kiện cảnh báo/ngưỡng tổng hợp.
  - `condition_ID (PK)`, `condition_Amdat`, `condition_Temp`, `condition_Humid`, `condition_DeviceID (FK)`.

- **tbl_user**, **tbl_garden**
  - Quản lý user và vườn, liên kết đến thiết bị/sensor theo từng người dùng.

### 2.2. Quan hệ chính (ERD mô tả)

- **1 Device → N Record DHT20**
  - `tbl_device (1) ──→ (N) tbl_dht20`
- **1 Device → N Record Soil Moisture**
  - `tbl_device (1) ──→ (N) tbl_soil_moisture`
- **1 Device → N Record Water Pump**
  - `tbl_device (1) ──→ (N) tbl_water_pump`
- **1 Device → 1 Watering Threshold**
  - `tbl_device (1) ──→ (1) tbl_watering_threshold` (UQ theo `threshold_DeviceID`)
- **1 Device → N Irrigation Schedule**
  - `tbl_device (1) ──→ (N) tbl_irrigation_schedule`
- **1 Device → 1 Condition**
  - `tbl_device (1) ──→ (1) tbl_condition`
- **1 User → N Garden → N Device**
  - Mỗi user có thể có nhiều vườn, mỗi vườn quản lý nhiều thiết bị.

### 2.3. Ràng buộc & lưu ý

- **PK / FK / UQ** được sử dụng để đảm bảo toàn vẹn dữ liệu.
- Có thể cấu hình **CASCADE DELETE**:
  - Khi xóa `tbl_device`, tự động xóa dữ liệu sensor, water pump, threshold, schedule liên quan.
- Index nên được tạo trên:
  - Các trường `*_DeviceID`, `schedule_DeviceID`, `dht_Time`, `soil_moisture_Time` để tối ưu truy vấn lịch sử.

---

## 3. Thiết Kế Giao Diện & Luồng Người Dùng (UI/UX Flow)

### 3.1. Nhân vật chính (User Persona)

- **Người dùng cuối / Chủ vườn**:
  - Muốn xem nhanh tình trạng vườn, điều khiển tưới, cấu hình ngưỡng & lịch tưới, nhận cảnh báo qua email.

---

### 3.2. Luồng Đăng Nhập & Khởi Tạo Phiên

1. Người dùng mở ứng dụng web → hiển thị **màn hình Login**.
2. Nhập `username` + `password` → gọi `POST /api/v1/login`.
3. Nếu thành công:
   - Lưu `token` ở localStorage/sessionStorage tùy `rememberMe`.
   - Điều hướng sang **Dashboard**.
4. Nếu chưa có tài khoản:
   - Chọn **Đăng ký** → gọi `POST /api/v1/signup` → tự đăng nhập và chuyển sang Dashboard.

---

### 3.3. Luồng Dashboard (Xem trạng thái vườn)

1. Frontend gọi:
   - `GET /api/v1/users/garden/data` (lấy thông tin vườn + sensor theo user),
   - Hoặc `GET /latest-message` để lấy số liệu real-time.
2. Dashboard hiển thị:
   - Thông tin vườn (tên, vị trí, ảnh, trạng thái).
   - Thông số: nhiệt độ, độ ẩm không khí, độ ẩm đất, trạng thái bơm.
   - Biểu đồ lịch sử (gọi `GET /api/v1/dht20/:deviceId`, `/soil-moisture/:deviceId`, `/water-pump/:deviceId`).
3. Người dùng có thể:
   - Chọn mốc thời gian (hôm nay/7 ngày/30 ngày) → frontend thêm query `startDate`, `endDate`.

---

### 3.4. Luồng Điều Khiển Thủ Công (Manual Irrigation Flow)

1. User mở tab **“Thủ công”** trong trang tưới.
2. Giao diện hiển thị:
   - Nút Bật/Tắt cho từng bơm (V1, V2).
   - Input thời gian tưới (giây/phút).
3. Khi user nhấn “Bật bơm”:
   - Frontend gửi `POST /controlRelay` với:
     - `relay`: `"V1"` hoặc `"V2"` hoặc `["V1","V2"]`
     - `duration`: số giây (hoặc object cho từng relay)
     - `deviceId`, `mode: "MANUAL"`.
4. Backend publish MQTT, đồng thời lưu lịch sử tưới vào `tbl_water_pump`.
5. Giao diện:
   - Hiển thị trạng thái đang tưới + thời gian đếm ngược.
   - Có thể cung cấp nút “Dừng ngay” → `POST /stopRelay`.

---

### 3.5. Luồng Cấu Hình Tưới Tự Động (Auto Mode Flow)

1. User mở tab **“Cảm biến / Tự động”** trong trang tưới.
2. Gọi `GET /api/v1/thresholds/:deviceId` để lấy cấu hình hiện tại.
3. UI hiển thị:
   - Toggle **Bật/Tắt tưới tự động**.
   - Các input ngưỡng: `độ ẩm đất Min/Max`, (có thể thêm Temp/Humidity), `thời lượng tưới`, `chọn bơm`.
4. Khi user thay đổi và nhấn Lưu:
   - Gửi `PUT /api/v1/thresholds/:deviceId` với giá trị mới.
5. Khi user chỉ muốn bật/tắt:
   - Gửi `POST /api/v1/thresholds/:deviceId/toggle`.
6. Backend:
   - Lưu cấu hình vào `tbl_watering_threshold`.
   - Service/middleware (hoặc `thresholdController`) kiểm tra dữ liệu sensor mới và quyết định bật/tắt bơm.

---

### 3.6. Luồng Quản Lý Lịch Tưới (Schedule Flow)

1. User mở màn hình **Lịch tưới**.
2. Frontend gọi `GET /api/v1/schedules/device/:deviceId`.
3. UI cho phép:
   - Thêm lịch tưới mới → `POST /api/v1/schedules`.
   - Chỉnh sửa lịch hiện có → `PUT /api/v1/schedules/:scheduleId`.
   - Bật/Tắt một lịch → `POST /api/v1/schedules/:scheduleId/toggle`.
   - Xóa lịch → `DELETE /api/v1/schedules/:scheduleId`.
4. Hệ thống background (cron / `scheduleService`) sẽ duyệt các lịch **Active** và gửi lệnh tưới qua MQTT đúng thời điểm.

---

### 3.7. Luồng Cấu Hình Thông Báo (Notification Flow)

1. User mở màn hình **Cài đặt thông báo**.
2. Gọi `GET /api/v1/notifications/settings` (có token).
3. UI hiển thị các tuỳ chọn:
   - Nhận email khi:
     - Độ ẩm đất quá thấp,
     - Thiết bị offline,
     - Tưới tự động đã kích hoạt X lần/ngày, v.v.
4. Khi user thay đổi cài đặt:
   - Gửi `PUT /api/v1/notifications/settings`.
5. User có thể nhấn nút **“Gửi email test”**:
   - Gửi `POST /api/v1/notifications/test-email`.
   - Hệ thống gửi email dùng `emailService`.

---

### 3.8. Luồng Quản Lý Vườn & Thiết Bị

- **Quản lý vườn (Gardens)**:
  - Màn hình danh sách vườn:
    - Gọi `GET /api/v1/gardens/`.
  - Thêm/sửa/xóa vườn tương ứng với `POST/PUT/DELETE /api/v1/gardens`.

- **Quản lý thiết bị (Devices)**:
  - Màn hình danh sách thiết bị trong 1 vườn hoặc toàn hệ thống:
    - Gọi `GET /api/v1/devices`.
  - Thêm thiết bị mới → `POST /api/v1/devices`.
  - Cập nhật / xóa thiết bị → `PUT` / `DELETE /api/v1/devices/:id`.

---

## 4. Tóm Tắt

- Backend cung cấp bộ API REST đầy đủ cho **auth**, **user**, **garden**, **device**, **sensor**, **threshold/condition**, **schedule**, **MQTT control** và **notification**.
- Cơ sở dữ liệu MySQL được chuẩn hoá quanh thực thể **Device** và lịch sử cảm biến/tưới, đảm bảo dễ mở rộng.
- UI/UX flow tập trung vào các hành vi chính: **đăng nhập → xem trạng thái → điều khiển tưới → cấu hình tự động & lịch → nhận thông báo**, phù hợp cho quản lý vườn thông minh từ xa.


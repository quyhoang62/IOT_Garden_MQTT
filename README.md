# 🌱 Hệ Thống IoT Garden - Tài Liệu Kỹ Thuật

## 📋 Mục Lục

1. [Tổng Quan Hệ Thống](#tổng-quan-hệ-thống)
2. [Luồng Hoạt Động Chính](#luồng-hoạt-động-chính)
3. [Lưu Đồ Thuật Toán (Flowchart)](#lưu-đồ-thuật-toán-flowchart)
4. [Backend & Database](#backend--database)
5. [Tính Năng Ứng Dụng](#tính-năng-ứng-dụng)
6. [Sơ Đồ Thực Thể Kết Hợp (ERD)](#sơ-đồ-thực-thể-kết-hợp-erd)

---

## 🎯 Tổng Quan Hệ Thống

Hệ thống IoT Garden là một giải pháp tự động hóa tưới tiêu thông minh sử dụng ESP32, kết nối qua WiFi và MQTT để quản lý vườn cây từ xa.

### Các Thành Phần Chính:

- **ESP32**: Thiết bị IoT đọc cảm biến và điều khiển relay
- **Cảm Biến**:
  - DHT11: Nhiệt độ và độ ẩm không khí
  - Soil Moisture Sensor: Độ ẩm đất
- **Relay Module**: Điều khiển máy bơm nước (2 relay)
- **OLED Display**: Hiển thị thông tin trạng thái
- **Backend Server**: Node.js + Express xử lý dữ liệu
- **Database**: MySQL lưu trữ dữ liệu cảm biến
- **Frontend**: React.js hiển thị dashboard và điều khiển

---

## 🔄 Luồng Hoạt Động Chính

### 1. Khởi Động Hệ Thống

```
ESP32 Boot → Khởi tạo cảm biến → Kết nối WiFi → Kết nối MQTT → Sẵn sàng
```

### 2. Vòng Lặp Chính (Main Loop)

Hệ thống hoạt động theo chu kỳ:

1. **Đọc Cảm Biến** (mỗi 5 giây)
   - Đọc DHT11 (nhiệt độ, độ ẩm không khí)
   - Đọc Soil Moisture Sensor (độ ẩm đất)
   - Xử lý nhiễu và validate dữ liệu

2. **Gửi Dữ Liệu Lên MQTT** (mỗi 10 giây)
   - Publish nhiệt độ → `IOTGARDEN{ID}/feeds/V3`
   - Publish độ ẩm không khí → `IOTGARDEN{ID}/feeds/V4`
   - Publish độ ẩm đất → `IOTGARDEN{ID}/feeds/V5`

3. **Nhận Lệnh Điều Khiển** (real-time)
   - Subscribe topic `IOTGARDEN{ID}/feeds/V1` để nhận lệnh bật/tắt bơm
   - Subscribe topic `IOTGARDEN{ID}/config` để nhận cấu hình ngưỡng tự động

4. **Kiểm Tra Kết Nối**
   - Duy trì kết nối WiFi
   - Duy trì kết nối MQTT
   - Tự động reconnect nếu mất kết nối

5. **Cập Nhật Màn Hình OLED** (mỗi 1 giây)
   - Hiển thị thông số cảm biến
   - Hiển thị trạng thái bơm
   - Hiển thị trạng thái kết nối

---

## 📊 Lưu Đồ Thuật Toán (Flowchart)

### 1. Quy Trình Hoạt Động Chính

```
┌─────────────────┐
│   START (Boot)  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ Khởi tạo OLED Display  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Khởi tạo Sensors        │
│ - DHT11                 │
│ - Soil Moisture         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Khởi tạo Relays         │
│ - Relay 1 (Pump 1)      │
│ - Relay 2 (Pump 2)      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Kết nối WiFi            │
│ - SSID & Password       │
│ - Retry nếu thất bại    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Kết nối MQTT Broker     │
│ - Server: io.adafruit   │
│ - Subscribe topics      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   MAIN LOOP             │
│   (Vòng lặp chính)      │
└────────┬────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ Đọc cảm biến    │  │ Kiểm tra kết nối│
│ (mỗi 5s)        │  │ WiFi & MQTT     │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│ Gửi data MQTT   │  │ Reconnect nếu   │
│ (mỗi 10s)       │  │ mất kết nối     │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └──────────┬──────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Cập nhật OLED Display │
         │ (mỗi 1s)             │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Kiểm tra Auto Timer  │
         │ (Tắt bơm nếu hết tg) │
         └──────────┬───────────┘
                    │
                    └─────► [Quay lại MAIN LOOP]
```

### 2. Quy Trình Đọc Cảm Biến và Xử Lý Nhiễu

```
┌──────────────────────┐
│  Đọc Cảm Biến        │
│  (Timer: 5 giây)     │
└──────────┬───────────┘
           │
           ├─────────────────┐
           │                 │
           ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│ Đọc DHT11        │  │ Đọc Soil Moisture│
│ - Temperature    │  │ - Analog A0       │
│ - Humidity       │  │ - ADC: 0-4095    │
└────────┬─────────┘  └────────┬─────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐  ┌──────────────────┐
│ Validate DHT11  │  │ Convert ADC      │
│ - Range check    │  │ to Percentage    │
│ - NaN check      │  │ - Dry: 4095 (0%) │
│ - Timeout check  │  │ - Wet: 0 (100%)  │
└────────┬─────────┘  └────────┬─────────┘
         │                      │
         ├──────────────────────┤
         │                      │
         ▼                      ▼
┌──────────────────────────────┐
│  Xử Lý Nhiễu                │
│                              │
│  1. Moving Average Filter    │
│     - Lưu N giá trị gần nhất│
│     - Tính trung bình        │
│                              │
│  2. Outlier Detection        │
│     - So sánh với giá trị TB │
│     - Loại bỏ giá trị bất   │
│       thường (> ±20%)        │
│                              │
│  3. Range Validation         │
│     - Temp: -40°C to 80°C    │
│     - Humidity: 0% to 100%  │
│     - Soil: 0% to 100%      │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Lưu Dữ Liệu Đã Xử Lý        │
│  - isValid = true/false      │
│  - temperature               │
│  - humidity                  │
│  - soilMoisture              │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Return SensorData Object    │
└──────────────────────────────┘
```

### 3. Quy Trình Kết Nối WiFi/MQTT và Gửi Dữ Liệu

```
┌──────────────────────┐
│  Kết Nối WiFi        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────┐
│ WiFi.begin(SSID, PASS)  │
│ - Mode: WIFI_STA         │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Retry Loop (30 lần)     │
│  - Delay 500ms           │
│  - Check WiFi.status()   │
└──────────┬───────────────┘
           │
           ├─────────────┐
           │             │
           ▼             ▼
    ┌──────────┐  ┌──────────────┐
    │ Thành    │  │ Thất bại     │
    │ công     │  │ - Hiển thị   │
    │          │  │   lỗi OLED   │
    └────┬─────┘  └──────────────┘
         │
         ▼
┌──────────────────────────┐
│  Lấy IP Address          │
│  - WiFi.localIP()        │
│  - Log RSSI signal       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Kết Nối MQTT Broker     │
│  - Server: io.adafruit   │
│  - Port: 1883            │
│  - Username & Password   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Subscribe Topics        │
│  - IOTGARDEN{ID}/feeds/V1│
│    (Điều khiển bơm)     │
│  - IOTGARDEN{ID}/config  │
│    (Cấu hình ngưỡng)    │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  MAIN LOOP:              │
│                          │
│  ┌────────────────────┐  │
│  │ Mỗi 10 giây:      │  │
│  │                    │  │
│  │ 1. Lấy sensor data │  │
│  │ 2. Validate data   │  │
│  │ 3. Publish MQTT:   │  │
│  │    - V3: Temp      │  │
│  │    - V4: Humidity  │  │
│  │    - V5: Soil      │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ Real-time:         │  │
│  │                    │  │
│  │ - Nhận lệnh V1     │  │
│  │ - Nhận config      │  │
│  │ - Callback xử lý   │  │
│  └────────────────────┘  │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Server Nhận Dữ Liệu      │
│  - mqttModel.js           │
│  - Parse topic & message  │
│  - Lưu vào database       │
└──────────────────────────┘
```

### 4. Quy Trình Điều Khiển Tự Động

```
┌──────────────────────────┐
│  Server Nhận Sensor Data │
│  từ MQTT                 │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Lưu vào Database         │
│  - tbl_dht20             │
│  - tbl_soil_moisture     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Kiểm Tra Auto Mode      │
│  - threshold_Enabled = 1?│
└──────────┬───────────────┘
           │
           ├─────────────┐
           │             │
           ▼             ▼
    ┌──────────┐  ┌──────────────┐
    │ Tắt      │  │ Bật         │
    │ (Skip)   │  │ (Tiếp tục)  │
    └──────────┘  └──────┬───────┘
                         │
                         ▼
          ┌──────────────────────────┐
          │  Lấy Ngưỡng từ Database   │
          │  - threshold_SoilMoisture │
          │    _Min (T_low)           │
          │  - threshold_SoilMoisture │
          │    _Max (T_high)          │
          │  - threshold_Duration     │
          └──────────┬─────────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │  So Sánh Giá Trị         │
          │                          │
          │  IF soilMoisture < Min:  │
          │     → BẬT BƠM            │
          │                          │
          │  IF soilMoisture > Max:  │
          │     → TẮT BƠM            │
          └──────────┬───────────────┘
                     │
                     ├─────────────────┐
                     │                 │
                     ▼                 ▼
          ┌──────────────────┐  ┌──────────────────┐
          │ Cần Tưới         │  │ Không Cần Tưới   │
          │ (soilMoisture    │  │ (soilMoisture    │
          │  < Min)          │  │  > Max)          │
          └──────────┬───────┘  └──────────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │  Gửi Lệnh MQTT           │
          │  - Topic: V1             │
          │  - Message: "1" (Bật)    │
          │  - Duration: threshold_  │
          │    Duration              │
          └──────────┬───────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │  ESP32 Nhận Lệnh         │
          │  - Callback function     │
          │  - Bật relay             │
          │  - Set timer tự tắt      │
          └──────────┬───────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │  Lưu Lịch Sử             │
          │  - tbl_water_pump        │
          │  - Mode: "AUTO"          │
          │  - Duration               │
          └──────────────────────────┘
```

---

## 🗄️ Backend & Database

### Database: MySQL

Hệ thống sử dụng **MySQL** để lưu trữ dữ liệu cảm biến và cấu hình.

#### Các Bảng Chính:

1. **tbl_device**
   - Lưu thông tin thiết bị ESP32
   - `device_ID`, `device_Name`, `device_MQTT_ID`, `device_Status`

2. **tbl_dht20**
   - Lưu dữ liệu nhiệt độ và độ ẩm không khí
   - `dht_ID`, `dht_Time`, `dht_Temp`, `dht_Humid`, `dht_DeviceID`

3. **tbl_soil_moisture**
   - Lưu dữ liệu độ ẩm đất
   - `soil_moisture_ID`, `soil_moisture_Time`, `soil_moisture_Value`, `soil_moisture_DeviceID`

4. **tbl_water_pump**
   - Lưu lịch sử hoạt động máy bơm
   - `water_pump_ID`, `water_pump_Time`, `water_pump_Value`, `water_pump_DeviceID`, `water_pump_Mode`, `water_pump_Duration`

5. **tbl_watering_threshold**
   - Lưu ngưỡng tưới tự động
   - `threshold_ID`, `threshold_DeviceID`, `threshold_SoilMoisture_Min/Max`, `threshold_Enabled`, `threshold_Duration`

6. **tbl_irrigation_schedule**
   - Lưu lịch tưới theo thời gian
   - `schedule_ID`, `schedule_DeviceID`, `schedule_Days`, `schedule_Time`, `schedule_Duration`

### Server Xử Lý

#### Kiến Trúc Backend:

```
┌─────────────────────────────────────────┐
│         MQTT Broker (Ohstem)            │
│  - io.adafruit.com:1883                 │
└──────────────┬──────────────────────────┘
               │
               │ MQTT Messages
               │
               ▼
┌─────────────────────────────────────────┐
│         Node.js Server                  │
│  ┌──────────────────────────────────┐  │
│  │  mqttModel.js                     │  │
│  │  - Subscribe topics               │  │
│  │  - Parse messages                 │  │
│  │  - Buffer DHT data                │  │
│  └──────────┬─────────────────────────┘  │
│             │                            │
│             ▼                            │
│  ┌──────────────────────────────────┐  │
│  │  sensorController.js             │  │
│  │  - insertSensorData()            │  │
│  │  - insertDht20Data()             │  │
│  └──────────┬─────────────────────────┘  │
│             │                            │
│             ▼                            │
│  ┌──────────────────────────────────┐  │
│  │  sensorModel.js                  │  │
│  │  - insertSoilMoisture()          │  │
│  │  - insertDht20()                 │  │
│  │  - insertWaterPump()             │  │
│  └──────────┬─────────────────────────┘  │
│             │                            │
│             ▼                            │
│  ┌──────────────────────────────────┐  │
│  │  thresholdController.js          │  │
│  │  - checkAndAutoWater()           │  │
│  │  - So sánh với ngưỡng            │  │
│  │  - Gửi lệnh MQTT nếu cần         │  │
│  └──────────┬─────────────────────────┘  │
│             │                            │
│             ▼                            │
│  ┌──────────────────────────────────┐  │
│  │  MySQL Database                  │  │
│  │  - Lưu trữ dữ liệu               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### Luồng Xử Lý Dữ Liệu:

1. **Nhận Dữ Liệu từ MQTT**
   - `mqttModel.js` subscribe các topic
   - Parse topic để xác định device và sensor type
   - Buffer dữ liệu DHT (temp + humid) để insert cùng lúc

2. **Lưu Vào Database**
   - `sensorController.js` xác định loại sensor
   - Gọi `sensorModel.js` để insert vào bảng tương ứng
   - Validate và format dữ liệu trước khi lưu

3. **Kiểm Tra Điều Khiển Tự Động**
   - Sau khi lưu `soil_moisture`, gọi `checkAndAutoWater()`
   - So sánh với ngưỡng trong `tbl_watering_threshold`
   - Nếu vượt ngưỡng, gửi lệnh MQTT để bật bơm

4. **API Endpoints**
   - `GET /api/v1/sensors/:deviceId` - Lấy dữ liệu cảm biến
   - `GET /api/v1/thresholds/:deviceId` - Lấy ngưỡng
   - `PUT /api/v1/thresholds/:deviceId` - Cập nhật ngưỡng
   - `POST /api/v1/mqtt/control` - Điều khiển thủ công

---

## 📱 Tính Năng Ứng Dụng

### 1. Hiển Thị Thông Số Thời Gian Thực

**Vị trí**: Dashboard, HomeScreen

**Tính năng**:
- Hiển thị 3 thông số chính:
  - 🌡️ **Nhiệt độ không khí** (°C)
  - 💧 **Độ ẩm không khí** (%)
  - 🌱 **Độ ẩm đất** (%)
- Cập nhật tự động mỗi 10 giây (theo chu kỳ gửi MQTT)
- So sánh với ngưỡng cảnh báo
- Hiển thị trạng thái kết nối (Online/Offline)

**Cách hoạt động**:
```
Frontend → API GET /api/v1/sensors/latest → Database → Hiển thị
```

### 2. Nút Bấm Điều Khiển Thủ Công (Manual Mode)

**Vị trí**: Irrigation Page → Tab "Thủ công"

**Tính năng**:
- **Bơm 1 (Relay 1)**
  - Nút "Bật" / "Tắt"
  - Chọn thời lượng tưới (phút)
  - Chọn khu vực tưới
  - Hiển thị thời gian còn lại

- **Bơm 2 (Relay 2)**
  - Tương tự Bơm 1
  - Hoạt động độc lập

**Cách hoạt động**:
```
User Click → Frontend → API POST /api/v1/mqtt/control
→ mqttController.js → Publish MQTT Topic V1
→ ESP32 nhận lệnh → Bật/tắt relay → Lưu vào database
```

**Luồng điều khiển**:
```
┌──────────────┐
│ User Click   │
│ "Bật Bơm 1" │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Frontend gửi API│
│ POST /mqtt/     │
│ control         │
│ {               │
│   deviceId: 1,  │
│   pump: "V1",   │
│   value: 1,     │
│   duration: 600 │
│ }               │
└──────┬──────────┘
       │
       ▼
┌──────────────────┐
│ mqttController  │
│ - Map deviceId  │
│   → MQTT ID     │
│ - Publish topic │
│   IOTGARDEN1/   │
│   feeds/V1      │
└──────┬──────────┘
       │
       ▼
┌──────────────────┐
│ ESP32 nhận lệnh  │
│ - Callback       │
│ - Bật relay      │
│ - Set timer      │
└──────────────────┘
```

### 3. Cài Đặt Ngưỡng Tự Động (Auto Mode)

**Vị trí**: Irrigation Page → Tab "Cảm biến"

**Tính năng**:
- **Bật/Tắt Tưới Tự Động**
  - Toggle switch để kích hoạt
  - Khi bật, hệ thống tự động tưới khi vượt ngưỡng

- **Cài Đặt Ngưỡng**:
  - 🌡️ **Nhiệt độ**: Min/Max (°C)
  - 💧 **Độ ẩm không khí**: Min/Max (%)
  - 🌱 **Độ ẩm đất**: Min/Max (%)
    - **Min (T_low)**: Ngưỡng thấp → Kích hoạt bơm
    - **Max (T_high)**: Ngưỡng cao → Tắt bơm

- **Thời Lượng Tưới**: Thời gian bơm chạy (giây)

- **Chọn Bơm**: V1, V2, hoặc ALL

**Cách hoạt động**:
```
User Set Threshold → API PUT /api/v1/thresholds/:deviceId
→ thresholdModel.js → Lưu vào database
→ Publish MQTT Topic: IOTGARDEN{ID}/config
→ ESP32 nhận config → Lưu vào bộ nhớ
→ Khi đọc sensor, ESP32 tự kiểm tra và điều khiển
```

**Ví dụ Ngưỡng**:
```
Độ ẩm đất Min: 30%  → Khi < 30% → BẬT BƠM
Độ ẩm đất Max: 70%  → Khi > 70% → TẮT BƠM
Duration: 10 giây    → Bơm chạy 10 giây mỗi lần
```

### 4. Biểu Đồ Lịch Sử (Charts)

**Vị trí**: Dashboard, History Page

**Tính năng**:
- **Biểu Đồ Đường (Line Chart)**
  - Hiển thị xu hướng theo thời gian
  - 3 đường: Nhiệt độ, Độ ẩm không khí, Độ ẩm đất
  - Có thể zoom và pan

- **Lọc Thời Gian**
  - Hôm nay
  - 7 ngày qua
  - 30 ngày qua
  - Tùy chọn (start date - end date)

- **Export Dữ Liệu**
  - Xuất CSV
  - In biểu đồ

**Cách hoạt động**:
```
Frontend → API GET /api/v1/sensors/:deviceId?startDate=&endDate=
→ sensorModel.js → Query database với WHERE clause
→ Trả về array dữ liệu → Chart.js render
```

**Cấu trúc Dữ Liệu**:
```json
[
  {
    "time": "2024-01-15 10:00:00",
    "temperature": 28.5,
    "humidity": 65,
    "soilMoisture": 45
  },
  ...
]
```

---

## 🗂️ Sơ Đồ Thực Thể Kết Hợp (ERD)

```
┌─────────────────────────────────────────────────────────────────┐
│                        ERD - IoT Garden System                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   tbl_device         │
├──────────────────────┤
│ device_ID (PK)       │◄─────┐
│ device_Name          │      │
│ device_MQTT_ID (UQ)  │      │
│ device_Status        │      │
│ device_Location      │      │
│ device_Email         │      │
└──────────────────────┘      │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ tbl_dht20        │  │tbl_soil_moisture │  │ tbl_water_pump   │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ dht_ID (PK)      │  │soil_moisture_ID  │  │water_pump_ID (PK)│
│ dht_Time         │  │soil_moisture_Time│  │water_pump_Time   │
│ dht_Temp         │  │soil_moisture_    │  │water_pump_Value  │
│ dht_Humid        │  │  Value           │  │water_pump_Mode   │
│ dht_DeviceID(FK) │  │soil_moisture_    │  │water_pump_       │
│                  │  │  DeviceID (FK)   │  │  Duration        │
└──────────────────┘  └──────────────────┘  │water_pump_       │
                                             │  DeviceID (FK)   │
                                             └──────────────────┘
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│tbl_watering_     │  │tbl_irrigation_   │  │ tbl_condition    │
│  threshold       │  │  schedule        │  │                  │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│threshold_ID (PK) │  │schedule_ID (PK)  │  │condition_ID (PK) │
│threshold_DeviceID│  │schedule_DeviceID │  │condition_Amdat   │
│  (FK, UQ)        │  │  (FK)            │  │condition_Temp    │
│threshold_Temp_   │  │schedule_Pump     │  │condition_Humid   │
│  Min/Max         │  │schedule_Days     │  │condition_DeviceID│
│threshold_Humidity│  │schedule_Time     │  │  (FK)            │
│  _Min/Max        │  │schedule_Hour24   │  │                  │
│threshold_Soil    │  │schedule_Minute   │  │                  │
│  Moisture_Min/Max│  │schedule_Duration │  │                  │
│threshold_Enabled │  │schedule_Status   │  │                  │
│threshold_Duration│  │                  │  │                  │
│threshold_Pump    │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

CHÚ THÍCH:
- PK: Primary Key
- FK: Foreign Key
- UQ: Unique Constraint
- Mối quan hệ: 1 Device → N Sensors/Thresholds/Schedules
```

### Mô Tả Quan Hệ:

1. **tbl_device** (1) ──→ (N) **tbl_dht20**
   - Một device có nhiều bản ghi nhiệt độ/độ ẩm theo thời gian

2. **tbl_device** (1) ──→ (N) **tbl_soil_moisture**
   - Một device có nhiều bản ghi độ ẩm đất theo thời gian

3. **tbl_device** (1) ──→ (N) **tbl_water_pump**
   - Một device có nhiều bản ghi lịch sử bơm

4. **tbl_device** (1) ──→ (1) **tbl_watering_threshold**
   - Một device có một bộ ngưỡng tưới tự động (Unique)

5. **tbl_device** (1) ──→ (N) **tbl_irrigation_schedule**
   - Một device có nhiều lịch tưới theo thời gian

6. **tbl_device** (1) ──→ (1) **tbl_condition**
   - Một device có một bộ điều kiện cảnh báo

### Ràng Buộc (Constraints):

- **CASCADE DELETE**: Khi xóa device, tất cả dữ liệu liên quan tự động xóa
- **UNIQUE**: `device_MQTT_ID` phải duy nhất
- **UNIQUE**: `threshold_DeviceID` chỉ có 1 bản ghi per device

---

## 📝 Tóm Tắt

Hệ thống IoT Garden là một giải pháp hoàn chỉnh từ phần cứng (ESP32) đến phần mềm (Backend + Frontend), sử dụng MQTT để giao tiếp real-time và MySQL để lưu trữ dữ liệu lâu dài. Hệ thống hỗ trợ điều khiển thủ công, tự động theo ngưỡng, và lịch tưới, giúp quản lý vườn cây một cách thông minh và tiết kiệm.

---

**Tài liệu được tạo bởi:** Hệ thống IoT Garden  
**Phiên bản:** 1.0  
**Ngày cập nhật:** 2024
# IOT_Garden_MQTT

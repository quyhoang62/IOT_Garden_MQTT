# ESP32 IoT Garden System

Hệ thống ESP32 cho IoT Garden với cấu trúc modular, hỗ trợ nhiều thiết bị.

## 📋 Tính năng

- ✅ Đọc dữ liệu từ DHT11 (nhiệt độ, độ ẩm không khí)
- ✅ Đọc dữ liệu từ cảm biến độ ẩm đất (Soil Moisture Sensor V1.2)
- ✅ Nhận lệnh từ server qua MQTT để bật/tắt bơm (relay D32, D23)
- ✅ Hiển thị thông tin lên màn hình OLED 0.96"
- ✅ Hỗ trợ nhiều ESP32 (multi-device)
- ✅ Cấu trúc modular, dễ bảo trì và nâng cấp

## 📁 Cấu trúc File

```
ESP32/
├── IOT_Garden_ESP32.ino    # File chính
├── config.h                # Cấu hình WiFi, MQTT, pins
├── sensor_handler.h/cpp    # Module xử lý cảm biến
├── relay_handler.h/cpp     # Module điều khiển relay
├── mqtt_handler.h/cpp      # Module giao tiếp MQTT
├── oled_display.h/cpp      # Module hiển thị OLED
└── README.md               # File này
```

## 🔧 Cài đặt

### 1. Cài đặt thư viện Arduino

Mở Arduino IDE và cài đặt các thư viện sau:

```
- WiFi (có sẵn trong ESP32)
- PubSubClient (by Nick O'Leary)
- ArduinoJson (by Benoit Blanchon)
- DHT sensor library (by Adafruit)
- Adafruit SSD1306 (for OLED)
- Adafruit GFX Library (for OLED)
```

**Cách cài:**

1. Mở Arduino IDE
2. Vào `Sketch` → `Include Library` → `Manage Libraries`
3. Tìm và cài đặt từng thư viện trên

### 2. Cấu hình

Mở file `config.h` và cấu hình:

```cpp
// 1. Đặt DEVICE_ID cho mỗi ESP32 (1, 2, 3, ...)
#define DEVICE_ID 1

// 2. Cấu hình WiFi
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// 3. Cấu hình MQTT
#define MQTT_SERVER "io.adafruit.com"
#define MQTT_USERNAME "YOUR_ADAFRUIT_USERNAME"
#define MQTT_PASSWORD "YOUR_ADAFRUIT_KEY"
```

### 3. Kết nối phần cứng

#### DHT11 Sensor

- VCC → 3.3V
- GND → GND
- DATA → GPIO 4 (DHT_PIN)

#### Soil Moisture Sensor V1.2

- VCC → 3.3V
- GND → GND
- A0 → GPIO 36 (A0) - Analog pin

#### Relay Module

- Relay 1 (Pump 1) → GPIO 32 (RELAY_PUMP_1_PIN)
- Relay 2 (Pump 2) → GPIO 23 (RELAY_PUMP_2_PIN)
- VCC → 5V
- GND → GND

#### OLED Display 0.96"

- VCC → 3.3V
- GND → GND
- SDA → GPIO 21 (OLED_SDA_PIN)
- SCL → GPIO 22 (OLED_SCL_PIN)

## 🚀 Sử dụng

1. Mở file `IOT_Garden_ESP32.ino` trong Arduino IDE
2. Chọn board: `Tools` → `Board` → `ESP32 Dev Module`
3. Chọn port: `Tools` → `Port` → (chọn port COM của ESP32)
4. Upload code lên ESP32

## 📡 MQTT Topics

Hệ thống sử dụng các topic sau (theo format từ server):

```
IOTGARDEN{DEVICE_ID}/feeds/V1  → Điều khiển máy bơm (0 = OFF, 1 = ON)
IOTGARDEN{DEVICE_ID}/feeds/V3  → Nhiệt độ không khí (°C)
IOTGARDEN{DEVICE_ID}/feeds/V4  → Độ ẩm không khí (%)
IOTGARDEN{DEVICE_ID}/feeds/V5  → Độ ẩm đất (%)
```

**Ví dụ với DEVICE_ID = 1:**

- `IOTGARDEN1/feeds/V1` - Điều khiển bơm
- `IOTGARDEN1/feeds/V3` - Nhiệt độ
- `IOTGARDEN1/feeds/V4` - Độ ẩm không khí
- `IOTGARDEN1/feeds/V5` - Độ ẩm đất

2. **Upload code** lên ESP32 mới

3. **Server tự động nhận diện** device mới qua topic pattern









# 📡 MQTT Message Format - IoT Garden System

Tài liệu mô tả chi tiết format bản tin MQTT giữa ESP32 và Server.

## 📋 Tổng quan

Hệ thống sử dụng MQTT protocol để giao tiếp giữa ESP32 và Server:
- **ESP32 → Server**: Gửi dữ liệu cảm biến (temperature, humidity, soil moisture)
- **Server → ESP32**: Gửi lệnh điều khiển relay (bật/tắt bơm)

---

## 🔄 Luồng giao tiếp

```
┌─────────────┐                    ┌──────────────┐                    ┌─────────────┐
│   ESP32     │  ──Publish──►      │  MQTT Broker │  ──Subscribe──►      │   Server   │
│             │  Sensor Data       │  (Ohstem)    │  Sensor Data        │            │
│             │ ◄──Publish───      │              │ ◄──Subscribe───     │            │
│             │  Relay Control     │              │  Relay Control      │            │
└─────────────┘                    └──────────────┘                    └─────────────┘
```

---

## 📤 ESP32 → Server (Publish Sensor Data)

### Topic Format
```
IOTGARDEN{DEVICE_ID}/feeds/{FEED_NAME}
```

**Ví dụ với DEVICE_ID = 1:**
- `IOTGARDEN1/feeds/V3` - Nhiệt độ
- `IOTGARDEN1/feeds/V4` - Độ ẩm không khí
- `IOTGARDEN1/feeds/V5` - Độ ẩm đất

### Message Format

#### 1. Nhiệt độ (V3)
```json
Topic: IOTGARDEN1/feeds/V3
Message: "25.5"
Format: String (số thực, 1 chữ số thập phân)
Unit: °C
Example: "25.5", "30.0", "22.3"
```

**Code ESP32:**
```cpp
String topic = "IOTGARDEN1/feeds/V3";
String message = String(temperature, 1);  // "25.5"
mqttClient.publish(topic.c_str(), message.c_str());
```

#### 2. Độ ẩm không khí (V4)
```json
Topic: IOTGARDEN1/feeds/V4
Message: "65.0"
Format: String (số thực, 1 chữ số thập phân)
Unit: %
Range: 0-100
Example: "65.0", "80.5", "45.2"
```

**Code ESP32:**
```cpp
String topic = "IOTGARDEN1/feeds/V4";
String message = String(humidity, 1);  // "65.0"
mqttClient.publish(topic.c_str(), message.c_str());
```

#### 3. Độ ẩm đất (V5)
```json
Topic: IOTGARDEN1/feeds/V5
Message: "45"
Format: String (số nguyên)
Unit: %
Range: 0-100
Example: "45", "80", "30"
```

**Code ESP32:**
```cpp
String topic = "IOTGARDEN1/feeds/V5";
String message = String(soilMoisture);  // "45"
mqttClient.publish(topic.c_str(), message.c_str());
```

### Tần suất gửi
- **Mặc định**: Mỗi 10 giây (10000ms)
- **Có thể điều chỉnh**: Trong `config.h` → `MQTT_PUBLISH_INTERVAL`

---

## 📥 Server → ESP32 (Publish Relay Control)

### Topic Format
```
IOTGARDEN{DEVICE_ID}/feeds/V1
```

**Ví dụ với DEVICE_ID = 1:**
- `IOTGARDEN1/feeds/V1` - Điều khiển relay

### Message Format

#### Điều khiển Relay (V1)
```json
Topic: IOTGARDEN1/feeds/V1
Message: "1" hoặc "0"
Format: String (số nguyên)
Values:
  - "1" = Bật relay (bơm ON)
  - "0" = Tắt relay (bơm OFF)
```

**Code Server (Node.js):**
```javascript
// Bật relay
mqttClient.publish('IOTGARDEN1/feeds/V1', '1', (err) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Pump turned ON');
  }
});

// Tắt relay
mqttClient.publish('IOTGARDEN1/feeds/V1', '0', (err) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Pump turned OFF');
  }
});
```

**Code ESP32 (Subscribe):**
```cpp
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  if (String(topic) == "IOTGARDEN1/feeds/V1") {
    int value = message.toInt();
    if (value == 1) {
      // Bật relay
      relays.turnOn();
    } else if (value == 0) {
      // Tắt relay
      relays.turnOff();
    }
  }
}
```

### Tự động tắt sau thời gian
Server tự động gửi lệnh tắt sau khoảng thời gian chỉ định:

```javascript
// Bật relay
mqttClient.publish('IOTGARDEN1/feeds/V1', '1');

// Tự động tắt sau 10 giây
setTimeout(() => {
  mqttClient.publish('IOTGARDEN1/feeds/V1', '0');
}, 10000);
```

---

## 📊 Ví dụ bản tin thực tế

### ESP32 gửi dữ liệu cảm biến

**Lần 1: Gửi nhiệt độ**
```
Topic: IOTGARDEN1/feeds/V3
Message: "25.5"
QoS: 0
Retain: false
```

**Lần 2: Gửi độ ẩm không khí**
```
Topic: IOTGARDEN1/feeds/V4
Message: "65.0"
QoS: 0
Retain: false
```

**Lần 3: Gửi độ ẩm đất**
```
Topic: IOTGARDEN1/feeds/V5
Message: "45"
QoS: 0
Retain: false
```

### Server gửi lệnh điều khiển

**Bật bơm:**
```
Topic: IOTGARDEN1/feeds/V1
Message: "1"
QoS: 0
Retain: false
```

**Tắt bơm (sau 10 giây):**
```
Topic: IOTGARDEN1/feeds/V1
Message: "0"
QoS: 0
Retain: false
```

---

## 🔍 Server xử lý bản tin nhận được

Khi Server nhận được message từ ESP32, nó xử lý như sau:

### 1. Parse Message
```javascript
const data = JSON.parse(message.toString());
// Hoặc đơn giản là number: 25.5
```

### 2. Xác định loại sensor từ topic
```javascript
let sensor = topic.split("/").pop(); // "V3", "V4", "V5"
```

### 3. Lưu vào database
```javascript
if (sensor === "V3") {
  // Lưu nhiệt độ vào tbl_dht20
  sensorController.insertDht20Data(timestamp, temperature, humidity);
} else if (sensor === "V4") {
  // Lưu độ ẩm không khí vào tbl_dht20
  sensorController.insertDht20Data(timestamp, temperature, humidity);
} else if (sensor === "V5") {
  // Lưu độ ẩm đất vào tbl_soil_moisture
  sensorController.insertSensorData("soil_moisture", { value, timestamp });
}
```

---

## 🛠️ Cấu hình MQTT

### ESP32 (config.h)
```cpp
#define MQTT_SERVER "io.adafruit.com"
#define MQTT_PORT 1883
#define MQTT_USERNAME "YOUR_USERNAME"
#define MQTT_PASSWORD "YOUR_PASSWORD"
#define DEVICE_ID 1
```

### Server (.env)
```env
BROKER_LINK=mqtt://io.adafruit.com:1883
FEED_NAME=YOUR_FEED_NAME
FEED_AIR_TEMP_NAME=IOTGARDEN222/feeds/V3
FEED_AIR_HUMID_NAME=IOTGARDEN222/feeds/V4
FEED_SOIL_MOISTURE_NAME=IOTGARDEN222/feeds/V5
FEED_PUMP_NAME=IOTGARDEN222/feeds/V1
```

---

## ⚠️ Lưu ý quan trọng

1. **Message Format**: Tất cả messages đều là **String**, không phải JSON
   - ✅ Đúng: `"25.5"`, `"1"`, `"0"`
   - ❌ Sai: `{"value": 25.5}`, `1`, `0` (không có dấu ngoặc kép)

2. **Topic Pattern**: Phải đúng format `IOTGARDEN{DEVICE_ID}/feeds/{FEED}`
   - ✅ Đúng: `IOTGARDEN1/feeds/V3`
   - ❌ Sai: `IOTGARDEN1/V3`, `IOTGARDEN/feeds/V3`

3. **Device ID**: Mỗi ESP32 phải có DEVICE_ID riêng
   - ESP32 #1: `IOTGARDEN1/feeds/...`
   - ESP32 #2: `IOTGARDEN2/feeds/...`
   - ESP32 #3: `IOTGARDEN3/feeds/...`

4. **QoS Level**: Mặc định QoS = 0 (at most once)
   - Không đảm bảo delivery
   - Phù hợp cho sensor data (gửi thường xuyên)

5. **Retain Flag**: Mặc định `false`
   - Không lưu message cuối cùng
   - Mỗi lần subscribe chỉ nhận message mới

---

## 🧪 Test MQTT Messages

### Sử dụng MQTT Client (MQTT.fx, mosquitto_pub)

**Test gửi sensor data (giả lập ESP32):**
```bash
# Nhiệt độ
mosquitto_pub -h io.adafruit.com -p 1883 -u YOUR_USERNAME -P YOUR_PASSWORD \
  -t "IOTGARDEN1/feeds/V3" -m "25.5"

# Độ ẩm không khí
mosquitto_pub -h io.adafruit.com -p 1883 -u YOUR_USERNAME -P YOUR_PASSWORD \
  -t "IOTGARDEN1/feeds/V4" -m "65.0"

# Độ ẩm đất
mosquitto_pub -h io.adafruit.com -p 1883 -u YOUR_USERNAME -P YOUR_PASSWORD \
  -t "IOTGARDEN1/feeds/V5" -m "45"
```

**Test điều khiển relay (giả lập Server):**
```bash
# Bật relay
mosquitto_pub -h io.adafruit.com -p 1883 -u YOUR_USERNAME -P YOUR_PASSWORD \
  -t "IOTGARDEN1/feeds/V1" -m "1"

# Tắt relay
mosquitto_pub -h io.adafruit.com -p 1883 -u YOUR_USERNAME -P YOUR_PASSWORD \
  -t "IOTGARDEN1/feeds/V1" -m "0"
```

---

## 📝 Tóm tắt

| Hướng | Topic | Message | Mô tả |
|-------|-------|---------|-------|
| ESP32 → Server | `IOTGARDEN{ID}/feeds/V3` | `"25.5"` | Nhiệt độ (°C) |
| ESP32 → Server | `IOTGARDEN{ID}/feeds/V4` | `"65.0"` | Độ ẩm không khí (%) |
| ESP32 → Server | `IOTGARDEN{ID}/feeds/V5` | `"45"` | Độ ẩm đất (%) |
| Server → ESP32 | `IOTGARDEN{ID}/feeds/V1` | `"1"` | Bật relay |
| Server → ESP32 | `IOTGARDEN{ID}/feeds/V1` | `"0"` | Tắt relay |

---

## 🔗 Tài liệu tham khảo

- [MQTT Protocol Specification](http://mqtt.org/)
- [PubSubClient Library](https://github.com/knolleary/pubsubclient)
- [Ohstem MQTT Documentation](https://ohstem.vn/)









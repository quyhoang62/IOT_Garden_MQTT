/**
 * ============================================================================
 * FILE: config.h
 * MÔ TẢ: File cấu hình chung cho ESP32 IoT Garden
 * ============================================================================
 */

#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ============================================================================
// DEVICE CONFIGURATION
// ============================================================================
// Mỗi ESP32 cần có DEVICE_ID riêng (1, 2, 3, ...)
// Thay đổi giá trị này cho mỗi ESP32 trong hệ thống
#define DEVICE_ID 1

// ============================================================================
// WIFI CONFIGURATION
// ============================================================================
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ============================================================================
// MQTT CONFIGURATION
// ============================================================================
// Sử dụng Ohstem MQTT Broker (hoặc broker khác)
#define MQTT_SERVER "io.adafruit.com"  // Hoặc MQTT broker của bạn
#define MQTT_PORT 1883
#define MQTT_USERNAME "YOUR_ADAFRUIT_USERNAME"  // Hoặc MQTT username
#define MQTT_PASSWORD "YOUR_ADAFRUIT_KEY"       // Hoặc MQTT password

// MQTT Topics - Format: IOTGARDEN{DEVICE_ID}/feeds/{FEED}
// Feed names theo server mqttModel.js
#define FEED_PUMP "V1"           // Máy bơm (relay control)
#define FEED_TEMPERATURE "V3"    // Nhiệt độ không khí
#define FEED_HUMIDITY "V4"       // Độ ẩm không khí
#define FEED_SOIL_MOISTURE "V5"  // Độ ẩm đất

// ============================================================================
// PIN CONFIGURATION
// ============================================================================
// Relay pins
#define RELAY_PUMP_1_PIN 32   // Relay 1 (D32) - Máy bơm chính
#define RELAY_PUMP_2_PIN 23   // Relay 2 (D23) - Máy bơm phụ (hoặc backup)

// DHT11 Sensor
#define DHT_PIN 4              // Chân kết nối DHT11
#define DHT_TYPE DHT11

// Soil Moisture Sensor
#define SOIL_MOISTURE_PIN A0   // Chân analog đọc độ ẩm đất (GPIO 36 trên ESP32)

// OLED Display (I2C)
#define OLED_SDA_PIN 21        // SDA pin
#define OLED_SCL_PIN 22        // SCL pin
#define OLED_ADDRESS 0x3C       // I2C address của OLED 0.96"

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================
#define SENSOR_READ_INTERVAL 5000    // Đọc cảm biến mỗi 5 giây (5000ms)
#define MQTT_PUBLISH_INTERVAL 10000  // Gửi data lên MQTT mỗi 10 giây (10000ms)
#define OLED_UPDATE_INTERVAL 1000     // Cập nhật màn hình mỗi 1 giây (1000ms)

// ============================================================================
// SENSOR CALIBRATION
// ============================================================================
// Soil Moisture Sensor calibration
// ESP32 ADC: 0-4095 (12-bit)
#define SOIL_MOISTURE_DRY 4095      // Giá trị khi đất khô (0% - ADC max)
#define SOIL_MOISTURE_WET 0         // Giá trị khi đất ướt (100% - ADC min)

// ============================================================================
// DEBUG CONFIGURATION
// ============================================================================
#define DEBUG_SERIAL Serial
#define DEBUG_BAUD_RATE 115200
#define ENABLE_DEBUG true

// Debug macros
#if ENABLE_DEBUG
  #define DEBUG_PRINT(x) DEBUG_SERIAL.print(x)
  #define DEBUG_PRINTLN(x) DEBUG_SERIAL.println(x)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
#endif

#endif // CONFIG_H









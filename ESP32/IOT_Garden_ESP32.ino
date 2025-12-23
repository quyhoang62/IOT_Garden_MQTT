/**
 * ============================================================================
 * FILE: IOT_Garden_ESP32.ino
 * MÔ TẢ: Code chính cho ESP32 IoT Garden System
 * ============================================================================
 * 
 * HỆ THỐNG:
 * - Đọc dữ liệu từ DHT11 (nhiệt độ, độ ẩm không khí)
 * - Đọc dữ liệu từ cảm biến độ ẩm đất (Soil Moisture Sensor V1.2)
 * - Nhận lệnh từ server qua MQTT để bật/tắt bơm (relay D32, D23)
 * - Hiển thị thông tin lên màn hình OLED 0.96"
 * - Hỗ trợ nhiều ESP32 (multi-device)
 * 
 * CẤU TRÚC MODULE:
 * - config.h: Cấu hình WiFi, MQTT, pins
 * - sensor_handler.h/cpp: Xử lý cảm biến
 * - relay_handler.h/cpp: Điều khiển relay
 * - mqtt_handler.h/cpp: Giao tiếp MQTT
 * - oled_display.h/cpp: Hiển thị OLED
 * 
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "sensor_handler.h"
#include "relay_handler.h"
#include "mqtt_handler.h"
#include "oled_display.h"

// ============================================================================
// GLOBAL OBJECTS
// ============================================================================
SensorHandler sensors(DHT_PIN, SOIL_MOISTURE_PIN);
RelayHandler relays(RELAY_PUMP_1_PIN, RELAY_PUMP_2_PIN);
MQTTHandler mqttHandler;
OLEDDisplay oledDisplay;

// ============================================================================
// TIMING VARIABLES
// ============================================================================
unsigned long lastSensorRead = 0;
unsigned long lastMQTTPublish = 0;
unsigned long lastOLEDUpdate = 0;

// ============================================================================
// SETUP: Khởi tạo hệ thống
// ============================================================================
void setup() {
  // Initialize Serial for debugging
  Serial.begin(DEBUG_BAUD_RATE);
  delay(1000);
  
  DEBUG_PRINTLN("\n\n==========================================");
  DEBUG_PRINTLN("  IOT GARDEN ESP32 - Device ID: " + String(DEVICE_ID));
  DEBUG_PRINTLN("==========================================\n");
  
  // Initialize OLED Display
  DEBUG_PRINTLN("[Setup] Initializing OLED display...");
  oledDisplay.begin();
  oledDisplay.showBootScreen(DEVICE_ID);
  delay(2000);
  
  // Initialize Sensors
  DEBUG_PRINTLN("[Setup] Initializing sensors...");
  sensors.begin();
  delay(1000);
  
  // Initialize Relays
  DEBUG_PRINTLN("[Setup] Initializing relays...");
  relays.begin();
  delay(500);
  
  // Connect to WiFi
  DEBUG_PRINTLN("[Setup] Connecting to WiFi...");
  oledDisplay.showStatus("Connecting WiFi...");
  connectWiFi();
  
  // Initialize MQTT
  DEBUG_PRINTLN("[Setup] Initializing MQTT...");
  oledDisplay.showStatus("Connecting MQTT...");
  mqttHandler.begin();
  mqttHandler.setRelayCallback([](int value) {
    relays.setStateFromMQTT(value);
  });
  
  // Initial sensor read
  sensors.readSensors();
  
  DEBUG_PRINTLN("\n[Setup] System initialized successfully!");
  DEBUG_PRINTLN("==========================================\n");
  
  oledDisplay.showStatus("System Ready!");
  delay(1000);
}

// ============================================================================
// LOOP: Vòng lặp chính
// ============================================================================
void loop() {
  unsigned long currentTime = millis();
  
  // 1. Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    DEBUG_PRINTLN("[WiFi] Connection lost, reconnecting...");
    connectWiFi();
  }
  
  // 2. Maintain MQTT connection
  mqttHandler.loop();
  
  // 3. Read sensors periodically
  if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
    if (sensors.readSensors()) {
      lastSensorRead = currentTime;
    }
  }
  
  // 4. Publish sensor data to MQTT periodically
  if (currentTime - lastMQTTPublish >= MQTT_PUBLISH_INTERVAL) {
    publishSensorData();
    lastMQTTPublish = currentTime;
  }
  
  // 5. Update relay status (check auto-off timer)
  relays.update();
  
  // 6. Update OLED display periodically
  if (currentTime - lastOLEDUpdate >= OLED_UPDATE_INTERVAL) {
    updateOLEDDisplay();
    lastOLEDUpdate = currentTime;
  }
  
  // Small delay to prevent watchdog issues
  delay(10);
}

// ============================================================================
// CONNECT WIFI: Kết nối WiFi
// ============================================================================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  DEBUG_PRINT("[WiFi] Connecting");
  int attempts = 0;
  
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    DEBUG_PRINT(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    DEBUG_PRINTLN("\n[WiFi] Connected!");
    DEBUG_PRINTLN("[WiFi] IP Address: " + WiFi.localIP().toString());
    DEBUG_PRINTLN("[WiFi] RSSI: " + String(WiFi.RSSI()) + " dBm");
  } else {
    DEBUG_PRINTLN("\n[WiFi] Connection failed!");
    oledDisplay.showError("WiFi Failed!");
  }
}

// ============================================================================
// PUBLISH SENSOR DATA: Gửi dữ liệu cảm biến lên MQTT
// ============================================================================
void publishSensorData() {
  SensorData data = sensors.getData();
  
  if (!data.isValid) {
    DEBUG_PRINTLN("[MQTT] Sensor data not valid, skipping publish");
    return;
  }
  
  // Publish temperature (V3)
  String tempTopic = mqttHandler.getTopic(FEED_TEMPERATURE);
  mqttHandler.publish(tempTopic, String(data.temperature, 1));
  DEBUG_PRINTLN("[MQTT] Published temperature: " + String(data.temperature, 1) + "°C");
  
  // Publish humidity (V4)
  String humidTopic = mqttHandler.getTopic(FEED_HUMIDITY);
  mqttHandler.publish(humidTopic, String(data.humidity, 1));
  DEBUG_PRINTLN("[MQTT] Published humidity: " + String(data.humidity, 1) + "%");
  
  // Publish soil moisture (V5)
  String soilTopic = mqttHandler.getTopic(FEED_SOIL_MOISTURE);
  mqttHandler.publish(soilTopic, String(data.soilMoisture));
  DEBUG_PRINTLN("[MQTT] Published soil moisture: " + String(data.soilMoisture) + "%");
}

// ============================================================================
// UPDATE OLED DISPLAY: Cập nhật màn hình OLED
// ============================================================================
void updateOLEDDisplay() {
  SensorData sensorData = sensors.getData();
  PumpStatus pumpStatus = relays.getStatus();
  bool mqttConnected = mqttHandler.isConnected();
  bool wifiConnected = (WiFi.status() == WL_CONNECTED);
  
  oledDisplay.updateDisplay(
    sensorData.temperature,
    sensorData.humidity,
    sensorData.soilMoisture,
    pumpStatus.isRunning,
    mqttConnected,
    wifiConnected,
    DEVICE_ID
  );
}









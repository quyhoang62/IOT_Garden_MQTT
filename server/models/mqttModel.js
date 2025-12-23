/**
 * ============================================================================
 * FILE: models/mqttModel.js
 * MÔ TẢ: Module quản lý kết nối và giao tiếp MQTT với thiết bị IoT
 * ============================================================================
 * 
 * File này là TRÁI TIM của hệ thống IoT, chịu trách nhiệm:
 * 1. Kết nối đến MQTT Broker (Ohstem)
 * 2. Subscribe các topic để nhận dữ liệu từ sensors
 * 3. Xử lý và lưu trữ dữ liệu vào database
 * 4. Cung cấp client để publish commands đến thiết bị
 * 
 * GIAO THỨC MQTT (Message Queuing Telemetry Transport):
 * - Giao thức messaging nhẹ, thiết kế cho IoT
 * - Sử dụng mô hình Publish/Subscribe
 * - Hoạt động trên TCP/IP, port mặc định 1883 (hoặc 8883 cho TLS)
 * 
 * KIẾN TRÚC HỆ THỐNG:
 * ┌─────────────────┐                      ┌─────────────────────┐
 * │   ESP32/        │  publish sensor data │   MQTT Broker       │
 * │   Arduino       │ ──────────────────►  │   (Ohstem)          │
 * │   (IoT Device)  │                      │                     │
 * │                 │ ◄────────────────── │                     │
 * │                 │  subscribe commands │                     │
 * └─────────────────┘                      └──────────┬──────────┘
 *                                                     │
 *                                          subscribe  │ publish
 *                                                     ▼
 *                                          ┌─────────────────────┐
 *                                          │   Node.js Server    │
 *                                          │   (mqttModel.js)    │
 *                                          │                     │
 *                                          │   - Nhận sensor data│
 *                                          │   - Lưu vào MySQL   │
 *                                          │   - Gửi commands    │
 *                                          └─────────────────────┘
 * 
 * MQTT TOPICS (Ohstem):
 * ┌────────────────────────────────┬────────────┬────────────────────────────┐
 * │ Topic                          │ Feed ID    │ Mô tả                      │
 * ├────────────────────────────────┼────────────┼────────────────────────────┤
 * │ IOTGARDEN222/feeds/V1          │ V1         │ Điều khiển máy bơm (0/1)   │
 * │ IOTGARDEN222/feeds/V3          │ V3         │ Nhiệt độ không khí (°C)    │
 * │ IOTGARDEN222/feeds/V4          │ V4         │ Độ ẩm không khí (%)        │
 * │ IOTGARDEN222/feeds/V5          │ V5         │ Độ ẩm đất (%)              │
 * └────────────────────────────────┴────────────┴────────────────────────────┘
 * 
 * BIẾN MÔI TRƯỜNG CẦN CẤU HÌNH (.env):
 * - BROKER_LINK: URL của MQTT broker (mqtt://...)
 * - FEED_NAME: Username/Feed name trên Ohstem
 * - FEED_AIR_TEMP_NAME: Topic nhiệt độ không khí
 * - FEED_AIR_HUMID_NAME: Topic độ ẩm không khí
 * - FEED_SOIL_MOISTURE_NAME: Topic độ ẩm đất
 * - FEED_PUMP_NAME: Topic điều khiển máy bơm
 * 
 * ============================================================================
 */

/**
 * Load biến môi trường từ file .env
 * Chứa thông tin kết nối MQTT broker
 */
require("dotenv").config();

/**
 * Import thư viện mqtt
 * Thư viện client MQTT phổ biến nhất cho Node.js
 * Tài liệu: https://github.com/mqttjs/MQTT.js
 */
const mqtt = require("mqtt");

/**
 * Import sensorController để lưu dữ liệu vào database
 * Khi nhận được message từ MQTT, sẽ gọi controller để insert vào MySQL
 */
const sensorController = require("../controllers/sensorController");

/**
 * Import thresholdController để kiểm tra và tự động tưới
 */
const thresholdController = require("../controllers/thresholdController");

/**
 * Import deviceModel để map deviceId (MQTT ID) sang device database ID
 */
const deviceModel = require("./deviceModel");

/**
 * Import moment-timezone để xử lý thời gian
 * Sử dụng timezone Việt Nam (Asia/Ho_Chi_Minh) cho consistent
 */
const moment = require("moment-timezone");

/**
 * Tên broker để hiển thị trong log messages
 */
const brokerName = "Broker Server";

/**
 * OFFLINE_MODE: Flag để tắt kết nối MQTT khi development offline
 * - true: Không kết nối MQTT (development/testing offline)
 * - false: Kết nối MQTT bình thường (production)
 */
const OFFLINE_MODE = false;

/**
 * MQTT client instance
 * Sẽ được khởi tạo khi OFFLINE_MODE = false
 * Export ra ngoài để mqttController có thể publish messages
 */
let client = null;

/**
 * Object lưu trữ giá trị MỚI NHẤT từ mỗi sensor
 * 
 * Được cập nhật mỗi khi nhận message từ MQTT
 * Dùng để API /latest-message trả về real-time data
 * 
 * @property {number|null} pump - Trạng thái máy bơm (0 hoặc 1)
 * @property {number|null} air_temperature - Nhiệt độ không khí (°C)
 * @property {number|null} air_humid - Độ ẩm không khí (%)
 * @property {number|null} soil_moisture - Độ ẩm đất (%)
 */
let latestMessages = {
  pump: null,
  air_temperature: null,
  air_humid: null,
  soil_moisture: null,
};

/**
 * Buffer để kết hợp dữ liệu DHT20
 * 
 * DHT20 gửi nhiệt độ và độ ẩm qua 2 topic riêng biệt (V3 và V4)
 * Buffer này lưu tạm giá trị cho đến khi nhận đủ CẢ HAI
 * Sau đó mới insert vào database dưới dạng 1 record
 * 
 * Cấu trúc: { garden_1: { air_temperature: {...}, air_humid: {...} }, ... }
 * 
 * LOGIC:
 * 1. Nhận V3 (temp) -> lưu vào dhtBuffer[garden_X].air_temperature
 * 2. Nhận V4 (humid) -> lưu vào dhtBuffer[garden_X].air_humid
 * 3. Khi cả 2 đều có giá trị -> insert vào tbl_dht20
 * 4. Reset cả 2 về null
 */
let dhtBuffer = {};

/**
 * ============================================================================
 * KHỞI TẠO KẾT NỐI MQTT (khi OFFLINE_MODE = false)
 * ============================================================================
 */
if (!OFFLINE_MODE) {
  console.log("Setting up username and password!");
  
  /**
   * Tạo kết nối đến MQTT Broker
   * 
   * mqtt.connect(url, options)
   * - url: URL của broker (từ biến môi trường BROKER_LINK)
   * - options.username: Feed name/API key
   * - options.password: Password (có thể để trống cho Ohstem)
   * 
   * Kết nối này sẽ được giữ suốt vòng đời của ứng dụng
   * Thư viện mqtt.js tự động reconnect khi mất kết nối
   */
  client = mqtt.connect(process.env.BROKER_LINK, {
    username: process.env.FEED_NAME,
    password: "",
  });

  console.log("Connecting to Ohstem!");
  
  /**
   * ============================================================================
   * EVENT: 'connect'
   * Xảy ra khi kết nối thành công đến MQTT broker
   * ============================================================================
   */
  client.on("connect", () => {
    console.log("Connected to Ohstem MQTT Broker");
    
    /**
     * Subscribe các topics để nhận dữ liệu từ sensors
     * 
     * Subscribe cả wildcard và cụ thể để đảm bảo nhận được messages
     * Một số MQTT broker không hỗ trợ wildcard, nên subscribe cụ thể
     */
    
    // Subscribe wildcard (nếu broker hỗ trợ)
    try {
      client.subscribe("IOTGARDEN+/feeds/V3", (err) => {
        if (err) console.log("[MQTT] Wildcard subscribe failed for V3, will use specific topics");
      });
      client.subscribe("IOTGARDEN+/feeds/V4", (err) => {
        if (err) console.log("[MQTT] Wildcard subscribe failed for V4, will use specific topics");
      });
      client.subscribe("IOTGARDEN+/feeds/V5", (err) => {
        if (err) console.log("[MQTT] Wildcard subscribe failed for V5, will use specific topics");
      });
      client.subscribe("IOTGARDEN+/feeds/V1", (err) => {
        if (err) console.log("[MQTT] Wildcard subscribe failed for V1, will use specific topics");
      });
      client.subscribe("IOTGARDEN+/feeds/V2", (err) => {
        if (err) console.log("[MQTT] Wildcard subscribe failed for V2, will use specific topics");
      });
    } catch (e) {
      console.log("[MQTT] Wildcard not supported, using specific topics");
    }
    
    // Subscribe cụ thể cho các device ID phổ biến (1-10)
    // Có thể mở rộng thêm nếu cần
    for (let deviceId = 1; deviceId <= 10; deviceId++) {
      const baseTopic = `IOTGARDEN${deviceId}/feeds/`;
      client.subscribe(baseTopic + "V3", (err) => {
        if (!err) console.log(`[MQTT] Subscribed to ${baseTopic}V3`);
      });
      client.subscribe(baseTopic + "V4", (err) => {
        if (!err) console.log(`[MQTT] Subscribed to ${baseTopic}V4`);
      });
      client.subscribe(baseTopic + "V5", (err) => {
        if (!err) console.log(`[MQTT] Subscribed to ${baseTopic}V5`);
      });
      client.subscribe(baseTopic + "V1", (err) => {
        if (!err) console.log(`[MQTT] Subscribed to ${baseTopic}V1`);
      });
      client.subscribe(baseTopic + "V2", (err) => {
        if (!err) console.log(`[MQTT] Subscribed to ${baseTopic}V2`);
      });
    }
    
    // Vẫn subscribe topic cũ từ .env để backward compatibility
    if (process.env.FEED_AIR_TEMP_NAME) {
      client.subscribe(process.env.FEED_AIR_TEMP_NAME, (err) => {
        if (!err) console.log(`[MQTT] Subscribed to ${process.env.FEED_AIR_TEMP_NAME}`);
      });
    }
    if (process.env.FEED_AIR_HUMID_NAME) {
      client.subscribe(process.env.FEED_AIR_HUMID_NAME, (err) => {
        if (!err) console.log(`[MQTT] Subscribed to ${process.env.FEED_AIR_HUMID_NAME}`);
      });
    }
    if (process.env.FEED_SOIL_MOISTURE_NAME) {
      client.subscribe(process.env.FEED_SOIL_MOISTURE_NAME, (err) => {
        if (!err) console.log(`[MQTT] Subscribed to ${process.env.FEED_SOIL_MOISTURE_NAME}`);
      });
    }
    if (process.env.FEED_PUMP_NAME) {
      client.subscribe(process.env.FEED_PUMP_NAME, (err) => {
        if (!err) console.log(`[MQTT] Subscribed to ${process.env.FEED_PUMP_NAME}`);
      });
    }
    
    console.log("[MQTT] Subscription completed. Listening for messages...");
  });

  /**
   * ============================================================================
   * EVENT: 'message'
   * Xảy ra khi nhận được message từ bất kỳ topic đã subscribe
   * ============================================================================
   * 
   * @param {string} topic - Topic mà message đến từ
   * @param {Buffer} message - Nội dung message (dạng Buffer, cần chuyển thành string)
   * 
   * LUỒNG XỬ LÝ:
   * 1. Parse message JSON
   * 2. Tạo timestamp theo timezone VN
   * 3. Xác định loại sensor từ topic
   * 4. Lưu vào database thông qua sensorController
   * 5. Cập nhật latestMessages
   */
  client.on("message", (topic, message) => {
    // Log để debug
    console.log(`[MQTT] Received message on topic: ${topic}, payload: ${message.toString()}`);
    
    /**
     * Parse message - ESP32 gửi string đơn giản (ví dụ: "25.5", "45")
     * Có thể là JSON hoặc plain string/number
     */
    let data;
    const messageStr = message.toString().trim();
    
    try {
      // Thử parse như JSON trước
      data = JSON.parse(messageStr);
      // Nếu là JSON object, lấy value
      if (typeof data === 'object' && data.value !== undefined) {
        data = data.value;
      }
    } catch (e) {
      // Nếu không phải JSON, parse như number
      const numValue = parseFloat(messageStr);
      if (!isNaN(numValue)) {
        data = numValue;
      } else {
        // Nếu không phải number, giữ nguyên string
        data = messageStr;
      }
    }
    
    console.log(`[MQTT] Parsed data: ${data} (type: ${typeof data})`);
    
    /**
     * Tạo timestamp theo múi giờ Việt Nam
     * Format: YYYY-MM-DD HH:mm:ss (phù hợp với MySQL DATETIME)
     */
    const timestamp = moment()
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DD HH:mm:ss");
    
    /**
     * Extract device ID và sensor type từ topic
     * Topic format: IOTGARDEN{DEVICE_ID}/feeds/{SENSOR}
     * Ví dụ: IOTGARDEN1/feeds/V3
     *   - deviceId = "1" (MQTT ID)
     *   - sensor = "V3"
     */
    const topicParts = topic.split("/");
    let deviceMqttId = null;
    let sensor = null;
    
    if (topicParts.length >= 3) {
      // Extract device ID từ "IOTGARDEN1" -> "1"
      const gardenPart = topicParts[0]; // "IOTGARDEN1"
      const deviceMatch = gardenPart.match(/IOTGARDEN(\d+)/);
      if (deviceMatch) {
        deviceMqttId = parseInt(deviceMatch[1]);
      }
      
      // Extract sensor type
      sensor = topicParts[2]; // "V3", "V4", "V5", "V1"
    } else {
      // Fallback: lấy phần cuối nếu format không đúng
      sensor = topicParts[topicParts.length - 1];
    }
    
    // Map device MQTT ID sang device database ID
    // Sử dụng async/await trong callback (cần wrap trong async function)
    (async () => {
      let deviceDbId = null;
      
      if (deviceMqttId) {
        try {
          // Lấy device từ database bằng MQTT ID
          const device = await deviceModel.getDeviceByMQTTId(deviceMqttId);
          if (device && device.device_ID) {
            deviceDbId = device.device_ID;
            console.log(`[MQTT] Mapped Device MQTT ID ${deviceMqttId} -> Device DB ID ${deviceDbId}`);
          } else {
            console.warn(`[MQTT] Device with MQTT ID ${deviceMqttId} not found in database`);
            // Nếu device chưa có trong DB, có thể tự động tạo hoặc bỏ qua
            return;
          }
        } catch (error) {
          console.error(`[MQTT] Error mapping device ${deviceMqttId} to DB ID:`, error);
          return;
        }
      } else {
        console.warn(`[MQTT] No device MQTT ID found in topic: ${topic}`);
        return;
      }
      
      console.log(`[MQTT] Received from Device MQTT ID ${deviceMqttId} (DB ID: ${deviceDbId}): ${sensor} = ${data}`);
      
      /**
       * Tạo object chứa dữ liệu để lưu vào database
       */
      const values = { timeStamp: timestamp, value: data, deviceId: deviceDbId };
      
      /**
       * Map Feed ID sang tên sensor dễ đọc
       * V1 -> pump (máy bơm)
       * V3 -> air_temperature (nhiệt độ không khí)
       * V4 -> air_humid (độ ẩm không khí)
       * V5 -> soil_moisture (độ ẩm đất)
       */
      let sensorName = sensor;
      if (sensor == "V1") {
        sensorName = "pump";
      } else if (sensor == "V3") {
        sensorName = "air_temperature";
      } else if (sensor == "V4") {
        sensorName = "air_humid";
      } else if (sensor == "V5") {
        sensorName = "soil_moisture";
      }

      /**
       * XỬ LÝ DỮ LIỆU DHT20 (nhiệt độ + độ ẩm không khí)
       * 
       * DHT20 gửi 2 giá trị riêng biệt qua V3 và V4
       * Cần đợi đủ cả 2 rồi mới insert vào database
       * 
       * Lưu ý: Buffer được chia theo deviceId để tránh trộn lẫn data giữa các devices
       */
      if (sensorName === "air_temperature" || sensorName === "air_humid") {
        // Tạo key buffer theo deviceId để tránh trộn lẫn
        const bufferKey = `device_${deviceDbId}`;
        if (!dhtBuffer[bufferKey]) {
          dhtBuffer[bufferKey] = {
            air_temperature: null,
            air_humid: null
          };
        }
        
        // Lưu vào buffer theo deviceId
        dhtBuffer[bufferKey][sensorName] = values;
        
        // Kiểm tra nếu đã có đủ cả temp và humid cho device này
        if (dhtBuffer[bufferKey].air_temperature && dhtBuffer[bufferKey].air_humid) {
          /**
           * Gọi sensorController để insert cả 2 giá trị cùng lúc
           * insertDht20Data sẽ lưu vào bảng tbl_dht20
           */
          sensorController
            .insertDht20Data(dhtBuffer[bufferKey].air_temperature, dhtBuffer[bufferKey].air_humid)
            .then((insertId) => {
              console.log(`[MQTT] Inserted DHT20 data for Device ${deviceDbId} with ID: ${insertId}`);
              
              // Lấy temperature và humidity từ buffer để kiểm tra auto-watering
              const tempValue = parseFloat(dhtBuffer[bufferKey].air_temperature.value) || 0;
              const humidValue = parseFloat(dhtBuffer[bufferKey].air_humid.value) || 0;
              
              // Lấy soil moisture mới nhất từ latestMessages cho device này
              const deviceKey = `device_${deviceDbId}`;
              const soilValue = latestMessages[deviceKey]?.soil_moisture || null;
              
              // Kiểm tra và tự động tưới nếu cần (chỉ khi có đủ cả 3 giá trị)
              if (soilValue !== null && !isNaN(soilValue)) {
                thresholdController.checkAndAutoWater(deviceDbId, {
                  temperature: tempValue,
                  humidity: humidValue,
                  soilMoisture: parseFloat(soilValue)
                });
              }
              
              // Reset buffer sau khi insert thành công
              dhtBuffer[bufferKey].air_temperature = null;
              dhtBuffer[bufferKey].air_humid = null;
            })
            .catch((err) => console.error(`[MQTT] Error inserting DHT20 data for Device ${deviceDbId}:`, err));
        }
      } else {
        /**
         * XỬ LÝ DỮ LIỆU SENSOR KHÁC (pump, soil_moisture)
         * 
         * Các sensor này gửi data độc lập
         * Insert ngay vào database mỗi khi nhận được
         */
        sensorController
          .insertSensorData(sensorName, values)
          .then((insertId) => {
            console.log(`Inserted ${sensorName} data with ID: ${insertId}`);
            
            // Nếu là soil_moisture, kiểm tra auto-watering với data hiện có
            if (sensorName === "soil_moisture") {
              // Lấy temperature và humidity từ buffer của device này
              const bufferKey = `device_${deviceDbId}`;
              const tempValue = dhtBuffer[bufferKey]?.air_temperature?.value || null;
              const humidValue = dhtBuffer[bufferKey]?.air_humid?.value || null;
              const soilValue = parseFloat(data) || 0;
              
              // Kiểm tra và tự động tưới nếu có đủ cả 3 giá trị
              if (tempValue !== null && humidValue !== null && !isNaN(tempValue) && !isNaN(humidValue)) {
                thresholdController.checkAndAutoWater(deviceDbId, {
                  temperature: parseFloat(tempValue),
                  humidity: parseFloat(humidValue),
                  soilMoisture: soilValue
                });
              }
            }
          })
          .catch((err) => console.error(`Error inserting ${sensorName} data: `, err));
      }

      // Cập nhật latestMessages để API /latest-message có data mới nhất
      // Lưu theo device để hỗ trợ nhiều thiết bị
      const deviceKey = `device_${deviceDbId}`;
      if (!latestMessages[deviceKey]) {
        latestMessages[deviceKey] = {};
      }
      latestMessages[deviceKey][sensorName] = data;
      
      // Giữ cấu trúc cũ cho backward compatibility (device đầu tiên)
      if (deviceDbId === 1 || Object.keys(latestMessages).length === 1) {
        latestMessages[sensorName] = data;
      }
      
      console.log(`[MQTT] Processed: Device MQTT ID ${deviceMqttId} (DB ID: ${deviceDbId}), Sensor ${sensorName}, Value ${data}`);
    })(); // Đóng async IIFE
  });

  /**
   * ============================================================================
   * EVENT: 'error'
   * Xảy ra khi có lỗi kết nối MQTT
   * ============================================================================
   * 
   * @param {Error} error - Object lỗi
   * 
   * Các lỗi thường gặp:
   * - ECONNREFUSED: Broker không chạy hoặc sai URL
   * - ENOTFOUND: Không tìm thấy host
   * - Timeout: Mạng chậm hoặc firewall chặn
   */
  client.on("error", (error) => {
    console.error(`[MQTT] Error connecting to ${brokerName}:`, error);
  });

  /**
   * ============================================================================
   * EVENT: 'offline'
   * Xảy ra khi mất kết nối MQTT
   * ============================================================================
   */
  client.on("offline", () => {
    console.error("[MQTT] Client went offline");
  });

  /**
   * ============================================================================
   * EVENT: 'reconnect'
   * Xảy ra khi client reconnect
   * ============================================================================
   */
  client.on("reconnect", () => {
    console.log("[MQTT] Reconnecting to broker...");
  });

  /**
   * ============================================================================
   * EVENT: 'close'
   * Xảy ra khi connection đóng
   * ============================================================================
   */
  client.on("close", () => {
    console.log("[MQTT] Connection closed");
  });
}

/**
 * ============================================================================
 * EXPORT MODULE
 * ============================================================================
 * 
 * Export các thành phần để các module khác sử dụng:
 * 
 * 1. getLatestMessages(): Function trả về object chứa giá trị mới nhất của sensors
 *    - Được gọi bởi mqttController.getLatestMessage()
 *    - Trả về: { pump, air_temperature, air_humid, soil_moisture }
 * 
 * 2. client: MQTT client instance
 *    - Được gọi bởi mqttController.startPump() để publish commands
 *    - Sử dụng: client.publish(topic, message)
 */
module.exports = {
  /**
   * Function trả về dữ liệu mới nhất từ tất cả sensors
   * @returns {Object} Object chứa latest sensor values
   */
  getLatestMessages: () => latestMessages,

  /**
   * Getter cho MQTT client (tránh race condition khi client còn null)
   * Sử dụng: const client = mqttModel.getClient();
   */
  getClient: () => client,

  /**
   * BACKWARD COMPATIBILITY:
   * Giữ property `client` để không phá vỡ code cũ, nhưng khuyến nghị dùng getClient()
   */
  client,
};

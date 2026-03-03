# 🛠️ Công Nghệ và Thư Viện Sử Dụng – IoT Garden

File này liệt kê chi tiết tất cả các **công nghệ, framework, thư viện và công cụ** được sử dụng trong dự án IoT Garden.

---

## 📋 Mục Lục

1. [Backend (Server)](#1-backend-server)
2. [Frontend (Client)](#2-frontend-client)
3. [Database](#3-database)
4. [IoT / Embedded Systems](#4-iot--embedded-systems)
5. [Giao Thức & Communication](#5-giao-thức--communication)
6. [Công Cụ Phát Triển](#6-công-cụ-phát-triển)
7. [Tóm Tắt](#7-tóm-tắt)

---

## 1. Backend (Server)

### 1.1. Runtime & Framework

- **Node.js**
  - Runtime JavaScript phía server
  - Phiên bản: LTS (Long Term Support)
  - Mục đích: Xây dựng server API RESTful

- **Express.js** (`^4.18.2`)
  - Framework web phổ biến nhất cho Node.js
  - Xử lý HTTP requests/responses
  - Routing và middleware
  - Tài liệu: https://expressjs.com/

### 1.2. Database & ORM

- **MySQL** (`^2.18.1`)
  - Driver MySQL gốc cho Node.js
  - Kết nối và truy vấn database

- **MySQL2** (`^3.2.4`)
  - Driver MySQL hiện đại hơn, hỗ trợ Promise/async-await
  - Hiệu năng tốt hơn MySQL driver cũ
  - Hỗ trợ prepared statements

### 1.3. Authentication & Security

- **jsonwebtoken** (`^9.0.0`)
  - Tạo và xác thực JWT (JSON Web Token)
  - Bảo mật API endpoints
  - Quản lý phiên đăng nhập

- **bcrypt** (`^5.1.0`)
  - Hash mật khẩu người dùng
  - Bảo mật thông tin nhạy cảm
  - Salt và hash password trước khi lưu database

### 1.4. MQTT & Real-time Communication

- **mqtt** (`^4.3.7`)
  - Client MQTT cho Node.js
  - Giao tiếp với thiết bị IoT qua MQTT broker
  - Publish/Subscribe messages
  - Tài liệu: https://github.com/mqttjs/MQTT.js

- **socket.io** (`^4.6.1`)
  - WebSocket library cho real-time communication
  - Cập nhật dữ liệu real-time từ server đến client
  - Hỗ trợ fallback polling nếu WebSocket không khả dụng

### 1.5. Email & Notification

- **nodemailer** (`^6.10.1`)
  - Gửi email từ Node.js
  - Hỗ trợ SMTP, Gmail, Outlook, v.v.
  - Gửi thông báo cảnh báo cho người dùng
  - Tài liệu: https://nodemailer.com/

### 1.6. Utilities & Helpers

- **body-parser** (`^1.20.2`)
  - Parse request body (JSON, URL-encoded)
  - Middleware cho Express
  - Xử lý dữ liệu từ POST/PUT requests

- **dotenv** (`^16.0.3`)
  - Quản lý biến môi trường (.env file)
  - Bảo mật thông tin nhạy cảm (database password, API keys)
  - Tách biệt cấu hình giữa môi trường dev/production

- **moment-timezone** (`^0.6.0`)
  - Xử lý thời gian và múi giờ
  - Format và parse datetime
  - Chuyển đổi timezone

### 1.7. Development Tools

- **nodemon** (`^2.0.21`) - Dev Dependency
  - Tự động restart server khi code thay đổi
  - Tiết kiệm thời gian phát triển
  - Chỉ dùng trong môi trường development

---

## 2. Frontend (Client)

### 2.1. Core Framework

- **React** (`^18.2.0`)
  - Framework JavaScript cho xây dựng UI
  - Component-based architecture
  - Virtual DOM cho hiệu năng cao
  - Tài liệu: https://react.dev/

- **React DOM** (`^18.2.0`)
  - Render React components vào DOM
  - React 18 với Concurrent Features

- **React Scripts** (`^5.0.1`)
  - Build tool và development server
  - Webpack configuration
  - Hot reload, code splitting

### 2.2. Routing & Navigation

- **react-router-dom** (`^6.10.0`)
  - Client-side routing cho React
  - Điều hướng giữa các trang
  - Protected routes với authentication
  - Tài liệu: https://reactrouter.com/

### 2.3. HTTP Client

- **axios** (`^1.3.4`)
  - HTTP client cho gọi API
  - Promise-based
  - Interceptors cho authentication
  - Hỗ trợ request/response transformation

### 2.4. UI Components & Styling

- **Ant Design (antd)** (`^5.4.6`)
  - Component library đầy đủ cho React
  - Form, Table, Modal, DatePicker, v.v.
  - Design system chuyên nghiệp
  - Tài liệu: https://ant.design/

- **Tailwind CSS** (`^3.3.2`)
  - Utility-first CSS framework
  - Responsive design
  - Custom theme configuration
  - Tài liệu: https://tailwindcss.com/

- **SASS** (`^1.60.0`)
  - CSS preprocessor
  - Variables, nesting, mixins
  - Tổ chức styles tốt hơn

### 2.5. Icons & Graphics

- **React Icons** (`^5.5.0`)
  - Thư viện icons phong phú
  - Font Awesome, Material Icons, v.v.
  - Dễ sử dụng và customize

- **Font Awesome** (`@fortawesome/react-fontawesome`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/free-regular-svg-icons`, `@fortawesome/free-brands-svg-icons`)
  - Icon library chuyên nghiệp
  - Solid, Regular, Brands icons
  - React integration

### 2.6. Data Visualization

- **Chart.js** (`^4.2.1`)
  - Thư viện vẽ biểu đồ
  - Line, Bar, Pie charts
  - Responsive và interactive

- **react-chartjs-2** (`^5.2.0`)
  - React wrapper cho Chart.js
  - Component-based charts
  - Dễ tích hợp vào React app

### 2.7. Animation & Effects

- **Framer Motion** (`^10.12.4`)
  - Animation library cho React
  - Smooth transitions và gestures
  - Performance optimization
  - Tài liệu: https://www.framer.com/motion/

- **Anime.js** (`^3.2.1`)
  - Lightweight animation library
  - JavaScript animations
  - Timeline và sequencing

### 2.8. UI Utilities

- **Headless UI** (`@headlessui/react` `^1.7.14`)
  - Unstyled, accessible UI components
  - Dropdown, Dialog, Menu, v.v.
  - Tích hợp tốt với Tailwind CSS

### 2.9. Utilities & Helpers

- **moment** (`^2.29.4`)
  - Xử lý và format thời gian
  - Relative time ("2 hours ago")
  - Locale support

- **jwt-decode** (`^3.1.2`)
  - Decode JWT token ở client-side
  - Lấy thông tin user từ token
  - Không verify (chỉ decode)

### 2.10. Testing (Development)

- **@testing-library/react** (`^13.4.0`)
  - Testing utilities cho React
  - Component testing

- **@testing-library/jest-dom** (`^5.16.5`)
  - Custom matchers cho Jest
  - DOM assertions

- **@testing-library/user-event** (`^13.5.0`)
  - Simulate user interactions
  - Click, type, keyboard events

- **web-vitals** (`^2.1.4`)
  - Đo lường Core Web Vitals
  - Performance metrics

---

## 3. Database

### 3.1. Database Management System

- **MySQL**
  - Relational Database Management System (RDBMS)
  - Lưu trữ dữ liệu cảm biến, người dùng, thiết bị
  - ACID compliance
  - Hỗ trợ transactions và foreign keys

### 3.2. Database Schema

- **Các bảng chính**:
  - `tbl_user` - Thông tin người dùng
  - `tbl_garden` - Thông tin vườn
  - `tbl_device` - Thông tin thiết bị ESP32
  - `tbl_dht20` - Dữ liệu nhiệt độ và độ ẩm không khí
  - `tbl_soil_moisture` - Dữ liệu độ ẩm đất
  - `tbl_water_pump` - Lịch sử hoạt động máy bơm
  - `tbl_watering_threshold` - Ngưỡng tưới tự động
  - `tbl_irrigation_schedule` - Lịch tưới theo thời gian
  - `tbl_condition` - Điều kiện cảnh báo

---

## 4. IoT / Embedded Systems

### 4.1. Hardware Platform

- **ESP32**
  - Microcontroller với WiFi và Bluetooth
  - Dual-core processor
  - GPIO pins cho cảm biến và relay
  - Low power consumption

### 4.2. Sensors

- **DHT11 / DHT20**
  - Cảm biến nhiệt độ và độ ẩm không khí
  - Digital output
  - Độ chính xác: ±2°C, ±5% RH

- **Soil Moisture Sensor V1.2**
  - Cảm biến độ ẩm đất
  - Analog output (0-4095 ADC)
  - Chuyển đổi thành phần trăm (0-100%)

### 4.3. Actuators

- **Relay Module**
  - Điều khiển máy bơm nước
  - 2 relay độc lập (V1, V2)
  - GPIO control (D32, D23)

- **OLED Display 0.96"**
  - Hiển thị thông tin trạng thái
  - I2C communication
  - 128x64 pixels

### 4.4. Arduino Libraries (ESP32)

- **WiFi.h** (Built-in)
  - Kết nối WiFi
  - Station mode (STA)

- **PubSubClient** (Arduino Library)
  - MQTT client cho ESP32
  - Publish và Subscribe messages
  - Reconnection handling

- **ArduinoJson** (Arduino Library)
  - Parse và tạo JSON
  - Xử lý MQTT messages dạng JSON
  - Memory-efficient

- **DHT Sensor Library** (Arduino Library)
  - Đọc dữ liệu từ DHT11/DHT20
  - Temperature và Humidity

- **Adafruit SSD1306** (Arduino Library)
  - Driver cho OLED display
  - Text và graphics rendering

- **Wire.h** (Built-in)
  - I2C communication
  - Giao tiếp với OLED display

---

## 5. Giao Thức & Communication

### 5.1. MQTT Protocol

- **MQTT Broker**: Adafruit IO (`io.adafruit.com:1883`)
  - Cloud MQTT broker
  - Free tier cho development
  - Topic structure: `IOTGARDEN{ID}/feeds/{FEED_NAME}`

- **MQTT Topics**:
  - `IOTGARDEN{ID}/feeds/V1` - Điều khiển relay/bơm
  - `IOTGARDEN{ID}/feeds/V3` - Nhiệt độ không khí
  - `IOTGARDEN{ID}/feeds/V4` - Độ ẩm không khí
  - `IOTGARDEN{ID}/feeds/V5` - Độ ẩm đất
  - `IOTGARDEN{ID}/config` - Cấu hình ngưỡng tự động

### 5.2. HTTP/REST API

- **Protocol**: HTTP/HTTPS
- **Format**: JSON
- **Base URL**: `/api/v1`
- **Authentication**: JWT Bearer Token

### 5.3. WebSocket

- **Socket.IO**
  - Real-time bidirectional communication
  - Fallback to polling nếu WebSocket không khả dụng
  - Event-based messaging

---

## 6. Công Cụ Phát Triển

### 6.1. Version Control

- **Git**
  - Quản lý phiên bản code
  - Branching và merging
  - Collaboration

### 6.2. Package Management

- **npm** (Node Package Manager)
  - Quản lý dependencies cho Node.js
  - `package.json` và `package-lock.json`

### 6.3. Code Editor / IDE

- **Visual Studio Code** (Recommended)
  - Extensions: ESLint, Prettier, GitLens
  - Debugging support
  - IntelliSense

### 6.4. API Testing

- **Postman** / **Insomnia** (Recommended)
  - Test API endpoints
  - Collection management
  - Environment variables

### 6.5. Database Management

- **MySQL Workbench** / **phpMyAdmin** / **DBeaver**
  - Quản lý database
  - Query editor
  - Schema visualization

### 6.6. Build & Deployment

- **Build Tools**:
  - Webpack (qua React Scripts)
  - Babel (transpile ES6+)
  - PostCSS (Tailwind CSS)

- **Deployment** (Có thể sử dụng):
  - **Heroku** - Platform as a Service
  - **Vercel** - Frontend deployment
  - **AWS EC2** - Cloud server
  - **DigitalOcean** - VPS

---

## 7. Tóm Tắt

### 7.1. Tech Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                    IoT Garden Stack                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend:                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ React 18 + Tailwind CSS + Ant Design            │   │
│  │ Chart.js + Axios + React Router                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Backend:                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Node.js + Express.js                            │   │
│  │ MySQL + MySQL2                                  │   │
│  │ MQTT + Socket.IO                                │   │
│  │ JWT + bcrypt                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  IoT:                                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ESP32 + Arduino Framework                       │   │
│  │ DHT11/20 + Soil Moisture Sensor                 │   │
│  │ Relay Module + OLED Display                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Communication:                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ MQTT (Adafruit IO)                              │   │
│  │ HTTP/REST API                                   │   │
│  │ WebSocket (Socket.IO)                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2. Điểm Mạnh của Tech Stack

✅ **Backend**:
- Node.js: Non-blocking I/O, phù hợp cho IoT real-time
- Express.js: Framework nhẹ, dễ mở rộng
- MySQL: Reliable, ACID compliance cho dữ liệu quan trọng

✅ **Frontend**:
- React: Component reusability, Virtual DOM
- Tailwind CSS: Rapid UI development
- Ant Design: Professional components, giảm thời gian phát triển

✅ **IoT**:
- ESP32: WiFi built-in, giá rẻ, đủ mạnh
- MQTT: Lightweight protocol, phù hợp IoT
- Arduino ecosystem: Nhiều libraries, cộng đồng lớn

✅ **Communication**:
- MQTT: Efficient cho IoT devices
- REST API: Standard, dễ tích hợp
- WebSocket: Real-time updates

### 7.3. Tổng Số Dependencies

- **Backend**: ~10 production dependencies
- **Frontend**: ~25 production dependencies
- **Total**: ~35 packages

---

**Tài liệu được tạo bởi:** Hệ thống IoT Garden  
**Phiên bản:** 1.0  
**Ngày cập nhật:** 2024

/**
 * ============================================================================
 * FILE: services/emailService.js
 * MÔ TẢ: Service gửi email cảnh báo cho người dùng
 * ============================================================================
 * 
 * Service này sử dụng Nodemailer để gửi email cảnh báo khi:
 * - Nhiệt độ vượt ngưỡng
 * - Độ ẩm đất quá thấp
 * - Độ ẩm không khí bất thường
 * - Máy bơm tự động bật/tắt
 * 
 * ============================================================================
 */

const nodemailer = require('nodemailer');

/**
 * Kiểm tra cấu hình email
 */
const checkEmailConfig = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  if (!user || user === 'your-email@gmail.com') {
    return { valid: false, error: 'EMAIL_USER chưa được cấu hình trong file .env' };
  }
  if (!pass || pass === 'your-app-password') {
    return { valid: false, error: 'EMAIL_PASS chưa được cấu hình trong file .env' };
  }
  return { valid: true };
};

/**
 * Cấu hình transporter cho Nodemailer
 * Sử dụng Gmail SMTP - có thể thay đổi sang SMTP khác
 * 
 * LƯU Ý: Cần cấu hình trong .env file:
 * - EMAIL_USER: Email gửi đi
 * - EMAIL_PASS: App password (không phải mật khẩu thường)
 * 
 * Xem hướng dẫn: server/email-config.md
 */
const createTransporter = () => {
  const config = checkEmailConfig();
  if (!config.valid) {
    console.error('Email config error:', config.error);
    throw new Error(config.error);
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Gửi email cảnh báo nhiệt độ
 * @param {string} toEmail - Email người nhận
 * @param {number} temperature - Nhiệt độ hiện tại
 * @param {number} threshold - Ngưỡng cảnh báo
 * @param {string} gardenName - Tên vườn
 */
const sendTemperatureAlert = async (toEmail, temperature, threshold, gardenName = 'Vườn của bạn') => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `"IOT Garden Alert" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `⚠️ Cảnh báo nhiệt độ cao - ${gardenName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff6b6b, #ff8e8e); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🌡️ Cảnh báo Nhiệt độ</h1>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <p style="font-size: 16px; color: #333;">Xin chào,</p>
          <p style="font-size: 16px; color: #333;">
            Nhiệt độ tại <strong>${gardenName}</strong> đang ở mức cao:
          </p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff6b6b;">
            <p style="margin: 5px 0; font-size: 24px; color: #ff6b6b; font-weight: bold;">
              ${temperature}°C
            </p>
            <p style="margin: 5px 0; color: #666;">
              Ngưỡng cảnh báo: ${threshold}°C
            </p>
          </div>
          <p style="color: #666;">
            Hãy kiểm tra hệ thống tưới hoặc che chắn cho cây trồng để tránh hư hại.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            Email này được gửi tự động từ hệ thống IOT Garden.
            <br>Thời gian: ${new Date().toLocaleString('vi-VN')}
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Temperature alert email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending temperature alert email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Gửi email cảnh báo độ ẩm đất thấp
 * @param {string} toEmail - Email người nhận
 * @param {number} soilMoisture - Độ ẩm đất hiện tại
 * @param {number} threshold - Ngưỡng cảnh báo
 * @param {string} gardenName - Tên vườn
 */
const sendSoilMoistureAlert = async (toEmail, soilMoisture, threshold, gardenName = 'Vườn của bạn') => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `"IOT Garden Alert" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `💧 Cảnh báo độ ẩm đất thấp - ${gardenName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f39c12, #f1c40f); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🌱 Cảnh báo Độ ẩm đất</h1>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <p style="font-size: 16px; color: #333;">Xin chào,</p>
          <p style="font-size: 16px; color: #333;">
            Độ ẩm đất tại <strong>${gardenName}</strong> đang ở mức thấp:
          </p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f39c12;">
            <p style="margin: 5px 0; font-size: 24px; color: #f39c12; font-weight: bold;">
              ${soilMoisture}%
            </p>
            <p style="margin: 5px 0; color: #666;">
              Ngưỡng cảnh báo: ${threshold}%
            </p>
          </div>
          <p style="color: #666;">
            Cây trồng có thể cần được tưới nước. Hãy kiểm tra và bật hệ thống tưới nếu cần.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            Email này được gửi tự động từ hệ thống IOT Garden.
            <br>Thời gian: ${new Date().toLocaleString('vi-VN')}
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Soil moisture alert email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending soil moisture alert email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Gửi email cảnh báo độ ẩm không khí
 * @param {string} toEmail - Email người nhận
 * @param {number} humidity - Độ ẩm không khí hiện tại
 * @param {number} threshold - Ngưỡng cảnh báo
 * @param {string} gardenName - Tên vườn
 * @param {string} alertType - Loại cảnh báo ('low' hoặc 'high')
 */
const sendHumidityAlert = async (toEmail, humidity, threshold, gardenName = 'Vườn của bạn', alertType = 'low') => {
  const transporter = createTransporter();
  
  const isLow = alertType === 'low';
  const alertTitle = isLow ? 'thấp' : 'cao';
  const alertColor = isLow ? '#3498db' : '#9b59b6';
  
  const mailOptions = {
    from: `"IOT Garden Alert" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `💨 Cảnh báo độ ẩm không khí ${alertTitle} - ${gardenName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${alertColor}, ${alertColor}99); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">💨 Cảnh báo Độ ẩm không khí</h1>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <p style="font-size: 16px; color: #333;">Xin chào,</p>
          <p style="font-size: 16px; color: #333;">
            Độ ẩm không khí tại <strong>${gardenName}</strong> đang ở mức ${alertTitle}:
          </p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${alertColor};">
            <p style="margin: 5px 0; font-size: 24px; color: ${alertColor}; font-weight: bold;">
              ${humidity}%
            </p>
            <p style="margin: 5px 0; color: #666;">
              Ngưỡng cảnh báo: ${threshold}%
            </p>
          </div>
          <p style="color: #666;">
            ${isLow 
              ? 'Không khí khô có thể ảnh hưởng đến sự phát triển của cây. Hãy cân nhắc tăng độ ẩm môi trường.' 
              : 'Độ ẩm cao có thể gây nấm mốc. Hãy đảm bảo thông gió tốt cho khu vườn.'}
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            Email này được gửi tự động từ hệ thống IOT Garden.
            <br>Thời gian: ${new Date().toLocaleString('vi-VN')}
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Humidity alert email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending humidity alert email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Gửi email thông báo tưới nước
 * @param {string} toEmail - Email người nhận
 * @param {string} gardenName - Tên vườn
 * @param {string} mode - Chế độ tưới ('auto' hoặc 'manual')
 * @param {number} duration - Thời lượng tưới (giây)
 */
const sendWateringNotification = async (toEmail, gardenName = 'Vườn của bạn', mode = 'auto', duration = 10) => {
  const transporter = createTransporter();
  
  const modeText = mode === 'auto' ? 'Tự động' : 'Thủ công';
  
  const mailOptions = {
    from: `"IOT Garden Alert" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🚿 Thông báo tưới nước - ${gardenName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🚿 Thông báo Tưới nước</h1>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <p style="font-size: 16px; color: #333;">Xin chào,</p>
          <p style="font-size: 16px; color: #333;">
            Hệ thống tưới nước tại <strong>${gardenName}</strong> đã được kích hoạt:
          </p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #27ae60;">
            <p style="margin: 5px 0;">
              <strong>Chế độ:</strong> ${modeText}
            </p>
            <p style="margin: 5px 0;">
              <strong>Thời lượng:</strong> ${duration} giây
            </p>
            <p style="margin: 5px 0;">
              <strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            Email này được gửi tự động từ hệ thống IOT Garden.
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Watering notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending watering notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Kiểm tra email configuration
 */
const testEmailConfiguration = async () => {
  const transporter = createTransporter();
  
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('Email configuration error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendTemperatureAlert,
  sendSoilMoistureAlert,
  sendHumidityAlert,
  sendWateringNotification,
  testEmailConfiguration
};









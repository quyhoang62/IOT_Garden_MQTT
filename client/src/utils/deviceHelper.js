/**
 * Helper function để lấy deviceId từ gardenId
 * Tự động cache vào localStorage để tránh gọi API nhiều lần
 */
import axios from 'axios';

export const getDeviceIdFromGarden = async (gardenId) => {
  if (!gardenId) {
    return null;
  }

  // Kiểm tra cache trước
  const cachedDeviceId = localStorage.getItem('deviceId');
  const cachedGardenId = localStorage.getItem('cachedGardenId');
  
  // Nếu đã cache và gardenId khớp, trả về deviceId đã cache
  if (cachedDeviceId && cachedGardenId === String(gardenId)) {
    return parseInt(cachedDeviceId);
  }

  try {
    // Lấy devices từ garden
    const response = await axios.get(`/api/v1/devices/garden/${gardenId}`);
    
    if (response.data && response.data.length > 0) {
      const deviceId = response.data[0].device_ID; // Lấy device đầu tiên
      
      // Cache lại
      localStorage.setItem('deviceId', deviceId);
      localStorage.setItem('cachedGardenId', String(gardenId));
      
      return parseInt(deviceId);
    }
    
    // Fallback: thử với deviceId = 1
    console.warn(`No devices found for gardenId ${gardenId}, using deviceId: 1`);
    localStorage.setItem('deviceId', '1');
    localStorage.setItem('cachedGardenId', String(gardenId));
    return 1;
  } catch (error) {
    console.error('Error fetching devices:', error);
    // Fallback
    localStorage.setItem('deviceId', '1');
    localStorage.setItem('cachedGardenId', String(gardenId));
    return 1;
  }
};

/**
 * Clear device cache (khi đổi garden)
 */
export const clearDeviceCache = () => {
  localStorage.removeItem('deviceId');
  localStorage.removeItem('cachedGardenId');
};









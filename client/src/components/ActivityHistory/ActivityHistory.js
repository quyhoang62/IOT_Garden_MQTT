import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HiOutlineFilter, HiOutlineDownload, HiOutlineCalendar } from 'react-icons/hi';

function ActivityHistory({ gardenId }) {
  const [activeTab, setActiveTab] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Số items hiển thị mỗi trang

  const tabs = [
    { id: 'all', name: 'Tất cả' },
    { id: 'irrigation', name: 'Tưới nước' },
    { id: 'error', name: 'Lỗi' },
    { id: 'alert', name: 'Cảnh báo' },
  ];

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(',', ' -');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  useEffect(() => {
    const fetchActivities = async () => {
      // Sử dụng gardenId từ props, fallback sang 1 nếu không có
      const currentGardenId = gardenId || localStorage.getItem('gardenId') || '1';
      
      setLoading(true);
      try {
        // Lấy deviceId từ gardenId
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
          try {
            const devicesRes = await axios.get(`/api/v1/devices/garden/${currentGardenId}`);
            if (devicesRes.data && devicesRes.data.length > 0) {
              deviceId = devicesRes.data[0].device_ID;
              localStorage.setItem('deviceId', deviceId);
            } else {
              deviceId = '1'; // Fallback
            }
          } catch (err) {
            console.error('Error fetching devices:', err);
            deviceId = '1'; // Fallback
          }
        }
        
        // Fetch water pump history và soil moisture (cho cảnh báo) - chỉ lấy dữ liệu thực từ API
        // Không lấy DHT data vì không hiển thị "Ghi nhận cảm biến" trong lịch sử
        let pumpRes = await axios.get(`/api/v1/water-pump/${deviceId}?limit=50`);
        let soilRes = await axios.get(`/api/v1/soil-moisture/${deviceId}?limit=50`);
        
        // Lấy thông tin device để check status, detect lỗi và lấy MQTT ID
        let deviceInfo = null;
        let allDevices = [];
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${currentGardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            allDevices = devicesRes.data;
            deviceInfo = devicesRes.data.find(d => d.device_ID == deviceId) || devicesRes.data[0];
          }
        } catch (err) {
          console.error('Error fetching device info:', err);
        }
        
        // Tạo map deviceId -> MQTT ID để dễ tra cứu
        const deviceIdToMqttIdMap = {};
        allDevices.forEach(device => {
          deviceIdToMqttIdMap[device.device_ID] = device.device_MQTT_ID;
        });
        
        // Đảm bảo dữ liệu là array hợp lệ
        const pumpData = Array.isArray(pumpRes.data) ? pumpRes.data : [];
        const soilData = Array.isArray(soilRes.data) ? soilRes.data : [];

        // Transform pump data - sử dụng dữ liệu thực từ API
        const pumpActivities = pumpData.map(item => {
          // Chuyển đổi duration từ giây sang phút
          const durationMinutes = item.water_pump_Duration 
            ? Math.round(item.water_pump_Duration / 60) || 1 
            : null;
          
          // Chuyển đổi mode sang tiếng Việt
          const modeText = item.water_pump_Mode === 'AUTO' || item.water_pump_Mode === 'SCHEDULE' 
            ? 'Hẹn giờ' 
            : item.water_pump_Mode === 'MANUAL' 
            ? 'Thủ công' 
            : item.water_pump_Mode || 'Thủ công';
          
          // Tạo chi tiết với dữ liệu thực
          const details = durationMinutes 
            ? `Thời lượng: ${durationMinutes} phút, Chế độ: ${modeText}`
            : `Chế độ: ${modeText}`;
          
          // Xác định tên hoạt động dựa trên mode
          const activityName = item.water_pump_Mode === 'AUTO' || item.water_pump_Mode === 'SCHEDULE'
            ? 'Tưới nước tự động'
            : 'Tưới nước thủ công';
          
          return {
            id: `pump-${item.water_pump_Time}`,
            timestamp: new Date(item.water_pump_Time).getTime(), // Dùng để sort
            time: formatDateTime(item.water_pump_Time),
            type: 'irrigation',
            activity: activityName,
            details: details,
            deviceMqttId: deviceIdToMqttIdMap[deviceId] ? `MQTT ID${deviceIdToMqttIdMap[deviceId]}` : `MQTT ID${deviceId || 'N/A'}`,
            status: 'completed'
          };
        });

        // Không thêm hoạt động "Ghi nhận cảm biến" vào lịch sử theo yêu cầu

        // Tạo error activities từ device status và connection issues
        const errorActivities = [];
        
        // Check device status OFFLINE
        if (deviceInfo && deviceInfo.device_Status === 'OFFLINE') {
          // Sử dụng device_UpdatedAt làm thời gian phát hiện lỗi
          const errorTime = deviceInfo.device_UpdatedAt || new Date().toISOString();
          errorActivities.push({
            id: `error-offline-${deviceInfo.device_ID}-${errorTime}`,
            timestamp: new Date(errorTime).getTime(),
            time: formatDateTime(errorTime),
            type: 'error',
            activity: 'Mất kết nối với thiết bị',
            details: `Thiết bị "${deviceInfo.device_Name || 'Không xác định'}" đã mất kết nối`,
            deviceMqttId: deviceInfo.device_MQTT_ID ? `MQTT ID${deviceInfo.device_MQTT_ID}` : 'N/A',
            status: 'pending'
          });
        }
        
        // Check nếu không nhận được dữ liệu từ device trong một thời gian dài (ví dụ: > 10 phút)
        // Lấy thời gian của record mới nhất từ pump hoặc soil data
        const latestDataTime = pumpData.length > 0 
          ? new Date(pumpData[0].water_pump_Time).getTime()
          : soilData.length > 0 
          ? new Date(soilData[0].soil_moisture_Time).getTime()
          : null;
        
        if (latestDataTime) {
          const now = Date.now();
          const timeDiffMinutes = (now - latestDataTime) / (1000 * 60); // Đổi sang phút
          
          // Nếu không nhận được data trong > 10 phút và device không phải OFFLINE, thêm warning
          if (timeDiffMinutes > 10 && deviceInfo && deviceInfo.device_Status !== 'OFFLINE') {
            const lastDataTimeStr = pumpData.length > 0 
              ? pumpData[0].water_pump_Time
              : soilData[0].soil_moisture_Time;
            errorActivities.push({
              id: `error-no-data-${deviceId}-${now}`,
              timestamp: now,
              time: formatDateTime(new Date(now).toISOString()),
              type: 'error',
              activity: 'Không nhận được dữ liệu từ thiết bị',
              details: `Lần cuối nhận dữ liệu: ${formatDateTime(lastDataTimeStr)} (${Math.round(timeDiffMinutes)} phút trước)`,
              deviceMqttId: deviceIdToMqttIdMap[deviceId] ? `MQTT ID${deviceIdToMqttIdMap[deviceId]}` : `MQTT ID${deviceId || 'N/A'}`,
              status: 'pending'
            });
          }
        }

        // Create some alert activities based on thresholds
        const alertActivities = soilData
          .filter(item => item.soil_moisture_Value < 30)
          .slice(0, 5)
          .map(item => ({
            id: `alert-${item.soil_moisture_Time}`,
            timestamp: new Date(item.soil_moisture_Time).getTime(), // Dùng để sort
            time: formatDateTime(item.soil_moisture_Time),
            type: 'alert',
            activity: 'Cảnh báo độ ẩm thấp',
            details: `Độ ẩm đất dưới ngưỡng: ${item.soil_moisture_Value}%`,
            deviceMqttId: deviceIdToMqttIdMap[deviceId] ? `MQTT ID${deviceIdToMqttIdMap[deviceId]}` : `MQTT ID${deviceId || 'N/A'}`,
            status: 'viewed'
          }));

        // Combine and sort by timestamp (dùng timestamp thực thay vì formatted string)
        // Không bao gồm sensorActivities vì không hiển thị "Ghi nhận cảm biến"
        // Thêm errorActivities để hiển thị các lỗi như mất kết nối
        const allActivities = [...pumpActivities, ...alertActivities, ...errorActivities]
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        setActivities(allActivities);
      } catch (error) {
        console.error('Error fetching activities:', error);
        // Không dùng mock data, để danh sách trống để người dùng biết có lỗi
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [gardenId]);

  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all') return true;
    return activity.type === activeTab;
  });

  // Tính toán pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

  // Reset về trang 1 khi đổi tab hoặc filter
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Xử lý chuyển trang
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  // Tạo danh sách số trang để hiển thị
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5; // Số trang tối đa hiển thị
    
    if (totalPages <= maxVisiblePages) {
      // Nếu tổng số trang <= 5, hiển thị tất cả
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Nếu nhiều hơn 5 trang, hiển thị thông minh
      if (currentPage <= 3) {
        // Ở đầu: 1, 2, 3, 4, ... last
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Ở cuối: 1, ..., n-3, n-2, n-1, n
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Ở giữa: 1, ..., current-1, current, current+1, ..., last
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };


  const handleExport = () => {
    // Create CSV content
    const headers = ['Thời gian', 'Hoạt động', 'Chi tiết', 'Thiết bị'];
    const rows = filteredActivities.map(a => [
      a.time,
      a.activity,
      a.details,
      a.deviceMqttId || 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lich-su-hoat-dong-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Lịch sử hoạt động</h1>
        <p className="text-gray-500">Xem lại nhật ký chi tiết về các hoạt động tưới nước và dữ liệu cảm biến.</p>
      </div>

      {/* Tabs and Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              <HiOutlineFilter className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              <HiOutlineCalendar className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all"
            >
              <HiOutlineDownload className="w-5 h-5" />
              <span>Xuất báo cáo</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 bg-gray-50">
                  <th className="px-6 py-4 font-medium">Thời gian</th>
                  <th className="px-6 py-4 font-medium">Hoạt động</th>
                  <th className="px-6 py-4 font-medium">Chi tiết</th>
                  <th className="px-6 py-4 font-medium">Thiết bị</th>
                </tr>
              </thead>
              <tbody>
                {paginatedActivities.map(activity => (
                  <tr key={activity.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">{activity.time}</td>
                    <td className={`px-6 py-4 font-medium ${
                      activity.type === 'error' ? 'text-red-600' : 'text-gray-800'
                    }`}>
                      {activity.activity}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className={
                        activity.type === 'alert' ? 'text-red-500' : 
                        activity.type === 'error' ? 'text-red-600 font-medium' : 
                        ''
                      }>
                        {activity.details}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700 font-medium">
                        {activity.deviceMqttId || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filteredActivities.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Không có hoạt động nào trong danh mục này</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredActivities.length > 0 && totalPages > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredActivities.length)} trong tổng số {filteredActivities.length} hoạt động
            </span>
            {totalPages > 1 && (
              <div className="flex gap-2 items-center">
                <button 
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    currentPage === 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  Trước
                </button>
                
                {getPageNumbers().map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageClick(page)}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        currentPage === page
                          ? 'bg-green-500 text-white font-medium'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button 
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    currentPage === totalPages
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityHistory;



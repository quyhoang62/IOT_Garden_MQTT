import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { HiOutlineCalendar, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineRefresh } from 'react-icons/hi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function SensorChart({ gardenId }) {
  // Initialize chartData with empty structure so Line can render even before data arrives
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noData, setNoData] = useState(false);
  const [isFutureDate, setIsFutureDate] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  const [isWateringRelay1, setIsWateringRelay1] = useState(false);
  const [isWateringRelay2, setIsWateringRelay2] = useState(false);
  const [relayControl, setRelayControl] = useState({
    relay1: { duration: 10 },
    relay2: { duration: 10 }
  });
  const [remainingTime, setRemainingTime] = useState({
    relay1: 0,
    relay2: 0
  });
  const [pumpMode, setPumpMode] = useState('MANUAL'); // 'MANUAL' or 'AUTO'
  
  // Helper function to get local date string (YYYY-MM-DD) in Vietnam timezone
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Date selection state - use local date, not UTC
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'realtime'

  // Format date to display
  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'numeric', 
      year: 'numeric' 
    });
  };

  // Navigate dates (using local dates)
  const goToPreviousDay = () => {
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    setSelectedDate(getLocalDateString(date));
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    const todayLocal = getLocalDateString();
    const nextDateStr = getLocalDateString(date);
    if (nextDateStr <= todayLocal) {
      setSelectedDate(nextDateStr);
    }
  };

  const goToToday = () => {
    setSelectedDate(getLocalDateString());
  };

  // Check if selected date is today (using local date)
  const isToday = selectedDate === getLocalDateString();

  // Sample data to reduce chart points (every N minutes)
  const sampleData = (data, intervalMinutes = 5) => {
    if (!data || data.length === 0) return [];
    
    const sampled = [];
    let lastTime = null;
    
    // Sort by time ascending
    const sorted = [...data].sort((a, b) => {
      const timeA = new Date(a.dht_Time || a.soil_moisture_Time);
      const timeB = new Date(b.dht_Time || b.soil_moisture_Time);
      return timeA - timeB;
    });
    
    for (const item of sorted) {
      const timeField = item.dht_Time || item.soil_moisture_Time;
      const currentTime = new Date(timeField);
      
      if (!lastTime || (currentTime - lastTime) >= intervalMinutes * 60 * 1000) {
        sampled.push(item);
        lastTime = currentTime;
      }
    }
    
    return sampled;
  };

  const fetchData = useCallback(async () => {
    // Sử dụng gardenId từ props, fallback sang 1 nếu không có
    const currentGardenId = gardenId || localStorage.getItem('gardenId') || '1';
    
    if (!currentGardenId) {
      setError('Chưa chọn vườn');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNoData(false);

      console.log('Fetching chart data for gardenId:', currentGardenId, 'date:', selectedDate);

      // Lấy deviceId từ localStorage (được set khi user chọn thiết bị trên UI)
      let deviceId = localStorage.getItem('deviceId');
      
      // Nếu chưa có deviceId, lấy từ API
      if (!deviceId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${currentGardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID; // Lấy device đầu tiên
            localStorage.setItem('deviceId', deviceId);
            console.log('Found deviceId:', deviceId, 'for gardenId:', currentGardenId);
          } else {
            // Fallback: thử với deviceId = 1
            deviceId = '1';
            console.log('No devices found, using deviceId: 1');
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
          deviceId = '1'; // Fallback
        }
      }

      // Check if selected date is in the future
      const today = new Date();
      const todayLocal = getLocalDateString(today);
      const isSelectedToday = selectedDate === todayLocal;
      const isFutureDate = selectedDate > todayLocal;
      
      if (isFutureDate) {
        console.log('Future date selected, showing no data message');
        setNoData(true);
        setIsFutureDate(true);
        setError(null);
        setLoading(false);
        return;
      }
      
      // Reset future date flag for valid dates
      setIsFutureDate(false);

      let dhtRes, soilRes;
      
      // Build query params based on selected date
      // Use local dates to match database timezone (Asia/Ho_Chi_Minh)
      let endDateStr, startDateStr;
      const currentTime = new Date().getTime(); // For filtering data when viewing today
      
      if (isSelectedToday) {
        // For today: fetch from today 00:00 to today (will filter to current time when displaying)
        startDateStr = todayLocal;
        endDateStr = todayLocal;
        console.log('Fetching data for today (00:00 to now):', startDateStr);
      } else {
        // For past dates: fetch full day from 00:00 to 23:59:59
        startDateStr = selectedDate;
        endDateStr = selectedDate;
        console.log('Fetching data for past date (full 24h):', startDateStr, '00:00 to 23:59');
      }
      
      // Format dates as YYYY-MM-DD for API (server will handle time portion)
      const params = new URLSearchParams({
        limit: 2000, // Increased limit for longer time range
        startDate: startDateStr,
        endDate: endDateStr
      });

      // Fetch data với deviceId
      console.log('Fetching data with params:', params.toString());
      console.log('API URLs:', {
        dht: `/api/v1/dht20/${deviceId}?${params}`,
        soil: `/api/v1/soil-moisture/${deviceId}?${params}`
      });
      
      [dhtRes, soilRes] = await Promise.all([
        axios.get(`/api/v1/dht20/${deviceId}?${params}`),
        axios.get(`/api/v1/soil-moisture/${deviceId}?${params}`)
      ]);

      console.log('DHT Response count:', dhtRes.data?.length);
      console.log('Soil Response count:', soilRes.data?.length);
      
      // Log first and last data points to see the actual time range
      if (dhtRes.data && dhtRes.data.length > 0) {
        console.log('DHT first record:', dhtRes.data[dhtRes.data.length - 1]);
        console.log('DHT last record:', dhtRes.data[0]);
      }
      if (soilRes.data && soilRes.data.length > 0) {
        console.log('Soil first record:', soilRes.data[soilRes.data.length - 1]);
        console.log('Soil last record:', soilRes.data[0]);
      }

      // Sample data every 5 minutes
      const dhtData = sampleData(Array.isArray(dhtRes.data) ? dhtRes.data : [], 5);
      const soilData = sampleData(Array.isArray(soilRes.data) ? soilRes.data : [], 5);

      console.log('Sampled DHT Data count:', dhtData.length);
      console.log('Sampled Soil Data count:', soilData.length);
      console.log('Sampled Soil Data sample:', soilData.slice(0, 3));

      // Check if we have any data (show all available data, not requiring 00:00)
      if (dhtData.length === 0 && soilData.length === 0) {
        console.log('No data found for selected date - showing noData message');
        console.log('Raw response check - DHT:', dhtRes.data?.length || 0, 'Soil:', soilRes.data?.length || 0);
        setNoData(true);
        setIsFutureDate(false); // Not a future date, just no data available
        setError(null);
        setLoading(false);
        return;
      }
      
      // Reset future date flag when we have data
      setIsFutureDate(false);

      console.log(`Processing data: ${dhtData.length} DHT points, ${soilData.length} Soil points`);
      
      // Create unified data structure with all timestamps
      const allDataPoints = [];
      
      // Add DHT data points
      dhtData.forEach((item, index) => {
        if (item.dht_Time) {
          // Parse date string from database (format: YYYY-MM-DD HH:mm:ss)
          // Use local time interpretation to match database timezone
          const timeStr = item.dht_Time;
          const timestamp = new Date(timeStr.replace(' ', 'T')).getTime();
          
          if (index < 3) {
            console.log('DHT data point:', {
              original: item.dht_Time,
              parsed: new Date(timestamp).toLocaleString('vi-VN'),
              timestamp: timestamp
            });
          }
          
          allDataPoints.push({
            timestamp: timestamp,
            type: 'dht',
            temp: parseFloat(item.dht_Temp) || null,
            humid: parseFloat(item.dht_Humid) || null,
            soil: null
          });
        }
      });
      
      // Add soil data points
      soilData.forEach((item, index) => {
        // Log first few items for debugging
        if (index < 3) {
          console.log('Raw soil item:', item);
        }
        
        if (item.soil_moisture_Time) {
          // Try multiple ways to parse the value
          let soilValue = null;
          const rawValue = item.soil_moisture_Value;
          
          if (rawValue !== null && rawValue !== undefined) {
            if (typeof rawValue === 'number') {
              soilValue = rawValue;
            } else if (typeof rawValue === 'string') {
              soilValue = parseFloat(rawValue);
            } else {
              soilValue = parseFloat(rawValue);
            }
            
            // Check if valid number
            if (isNaN(soilValue) || soilValue < 0 || soilValue > 100) {
              console.warn('Invalid soil value:', rawValue, 'parsed as:', soilValue);
              soilValue = null;
            }
          }
          
          if (index < 3) {
            console.log('Processing soil data point:', {
              time: item.soil_moisture_Time,
              rawValue: rawValue,
              parsed: soilValue,
              isValid: soilValue !== null
            });
          }
          
          // Parse date string from database (format: YYYY-MM-DD HH:mm:ss)
          // Use local time interpretation to match database timezone
          const timeStr = item.soil_moisture_Time;
          const timestamp = new Date(timeStr.replace(' ', 'T')).getTime();
          
          if (index < 3) {
            console.log('Soil data point:', {
              original: item.soil_moisture_Time,
              parsed: new Date(timestamp).toLocaleString('vi-VN'),
              timestamp: timestamp
            });
          }
          
          allDataPoints.push({
            timestamp: timestamp,
            type: 'soil',
            temp: null,
            humid: null,
            soil: soilValue
          });
        } else {
          console.log('Skipping soil item - no time:', item);
        }
      });
      
      console.log('Total allDataPoints:', allDataPoints.length);
      console.log('Soil data points count:', allDataPoints.filter(p => p.type === 'soil').length);
      console.log('Soil data points sample:', allDataPoints.filter(p => p.type === 'soil').slice(0, 3));
      
      // Sort by timestamp
      allDataPoints.sort((a, b) => a.timestamp - b.timestamp);
      
      // Group by 5-minute intervals and merge data
      const groupedData = [];
      const interval = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      // Create a map for faster lookup
      const dataMap = new Map();
      
      // First pass: create groups from all data points
      allDataPoints.forEach(point => {
        const intervalTime = Math.floor(point.timestamp / interval) * interval;
        const existing = dataMap.get(intervalTime);
        
        if (existing) {
          // Merge data into existing group (keep non-null values, prefer newer data)
          if (point.temp !== null && point.temp !== undefined) existing.temp = point.temp;
          if (point.humid !== null && point.humid !== undefined) existing.humid = point.humid;
          if (point.soil !== null && point.soil !== undefined) {
            existing.soil = point.soil;
            console.log('Merged soil value:', point.soil, 'into interval:', new Date(intervalTime).toLocaleTimeString());
          }
        } else {
          // Create new group
          const newGroup = {
            timestamp: intervalTime,
            temp: point.temp,
            humid: point.humid,
            soil: point.soil
          };
          if (point.soil !== null && point.soil !== undefined) {
            console.log('Created new group with soil value:', point.soil, 'at interval:', new Date(intervalTime).toLocaleTimeString());
          }
          dataMap.set(intervalTime, newGroup);
          groupedData.push(newGroup);
        }
      });
      
      // Debug: Check soil data points
      const soilPoints = allDataPoints.filter(p => p.type === 'soil' && p.soil !== null && p.soil !== undefined);
      console.log('Soil data points with values:', soilPoints.length);
      if (soilPoints.length > 0) {
        console.log('First 3 soil points:', soilPoints.slice(0, 3).map(p => ({
          time: new Date(p.timestamp).toLocaleTimeString(),
          value: p.soil,
          interval: new Date(Math.floor(p.timestamp / interval) * interval).toLocaleTimeString()
        })));
      }
      
      console.log('Grouped data count:', groupedData.length);
      const groupsWithSoil = groupedData.filter(g => g.soil !== null && g.soil !== undefined);
      console.log('Grouped data with soil values:', groupsWithSoil.length);
      if (groupsWithSoil.length > 0) {
        console.log('Sample grouped data with soil:', groupsWithSoil.slice(0, 3).map(g => ({
          time: new Date(g.timestamp).toLocaleTimeString(),
          soil: g.soil
        })));
      } else {
        console.warn('WARNING: No grouped data contains soil values!');
        console.log('Sample of all grouped data:', groupedData.slice(0, 5));
      }
      
      // Sort grouped data by timestamp
      groupedData.sort((a, b) => a.timestamp - b.timestamp);
      
      // Log the actual time range of data
      if (groupedData.length > 0) {
        const firstTime = new Date(groupedData[0].timestamp);
        const lastTime = new Date(groupedData[groupedData.length - 1].timestamp);
        console.log(`Data time range: ${firstTime.toLocaleString('vi-VN')} to ${lastTime.toLocaleString('vi-VN')}`);
      }
      
      // If viewing today, filter out future data points (only show up to current time)
      let filteredGroupedData = groupedData;
      if (isSelectedToday) {
        const now = new Date().getTime();
        // Keep data up to current time (add 5 minutes buffer for current interval)
        filteredGroupedData = groupedData.filter(item => item.timestamp <= now);
        console.log(`Filtered data for today: ${groupedData.length} -> ${filteredGroupedData.length} points (removed future data)`);
      }
      
      // Check again after filtering (in case all data was future data)
      if (filteredGroupedData.length === 0) {
        console.log('No data after filtering - showing noData message');
        setNoData(true);
        setIsFutureDate(false);
        setError(null);
        setLoading(false);
        return;
      }
      
      // Generate labels and data arrays from filtered data
      // Chart will automatically adjust to show only the range with data
      const labels = filteredGroupedData.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      });
      
      const tempData = filteredGroupedData.map(item => item.temp ?? null);
      const humidData = filteredGroupedData.map(item => item.humid ?? null);
      const soilValues = filteredGroupedData.map(item => item.soil ?? null);
      
      // Debug: Log soil values
      console.log('Grouped data count:', groupedData.length);
      console.log('Soil values array:', soilValues);
      console.log('Soil values count (non-null):', soilValues.filter(v => v !== null && v !== undefined).length);
      console.log('Sample soil values:', soilValues.slice(0, 10));
      console.log('Sample grouped data:', groupedData.slice(0, 5));

      setChartData({
        labels,
        datasets: [
          {
            label: 'Nhiệt độ (°C)',
            data: tempData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: dhtData.length > 50 ? 2 : 3,
            pointHoverRadius: 5,
            spanGaps: true,
            borderWidth: 2,
          },
          {
            label: 'Độ ẩm KK (%)',
            data: humidData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: dhtData.length > 50 ? 2 : 3,
            pointHoverRadius: 5,
            spanGaps: true,
            borderWidth: 2,
          },
          {
            label: 'Độ ẩm đất (%)',
            data: soilValues,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: (ctx) => {
              const value = ctx.parsed.y;
              // Only show points where data exists
              return value !== null && value !== undefined ? (soilValues.length > 50 ? 2 : 3) : 0;
            },
            pointHoverRadius: 5,
            spanGaps: true, // This allows the line to span across null values
            borderWidth: 2,
            showLine: true, // Explicitly show the line
          }
        ]
      });
      console.log('Chart data set successfully with', labels.length, 'points');
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setError('Không thể tải dữ liệu biểu đồ. Vui lòng thử lại sau.');
      setLoading(false);
    }
  }, [gardenId, selectedDate]);

  // Separate function to refresh only chart data (not affecting pump control)
  const refreshChartData = useCallback(async () => {
    console.log('[Refresh] Starting chart data refresh...');
    // Only refresh chart data, don't affect pump control state
    const currentGardenId = gardenId || localStorage.getItem('gardenId') || '1';
    
    if (!currentGardenId) {
      console.log('[Refresh] No gardenId found');
      return;
    }

    try {
      // Don't set loading to true to avoid UI flicker
      let deviceId = localStorage.getItem('deviceId');
      
      if (!deviceId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${currentGardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID;
            localStorage.setItem('deviceId', deviceId);
          } else {
            deviceId = '1';
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
          deviceId = '1';
        }
      }

      const today = new Date();
      const todayLocal = getLocalDateString(today);
      const isSelectedToday = selectedDate === todayLocal;
      
      if (selectedDate > todayLocal) {
        console.log('[Refresh] Future date selected, skipping refresh');
        return; // Don't refresh future dates
      }

      let startDateStr, endDateStr;
      if (isSelectedToday) {
        startDateStr = todayLocal;
        endDateStr = todayLocal;
      } else {
        startDateStr = selectedDate;
        endDateStr = selectedDate;
      }
      
      const params = new URLSearchParams({
        limit: 2000,
        startDate: startDateStr,
        endDate: endDateStr
      });
      
      console.log('[Refresh] Fetching data for date:', startDateStr, 'deviceId:', deviceId);
      const [dhtRes, soilRes] = await Promise.all([
        axios.get(`/api/v1/dht20/${deviceId}?${params}`),
        axios.get(`/api/v1/soil-moisture/${deviceId}?${params}`)
      ]);

      const dhtData = sampleData(Array.isArray(dhtRes.data) ? dhtRes.data : [], 5);
      const soilData = sampleData(Array.isArray(soilRes.data) ? soilRes.data : [], 5);

      console.log('[Refresh] Received data - DHT:', dhtData.length, 'Soil:', soilData.length);

      if (dhtData.length === 0 && soilData.length === 0) {
        console.log('[Refresh] No data found, keeping existing chart');
        return;
      }

      const allDataPoints = [];
      
      dhtData.forEach((item) => {
        if (item.dht_Time) {
          const timeStr = item.dht_Time;
          const timestamp = new Date(timeStr.replace(' ', 'T')).getTime();
          allDataPoints.push({
            timestamp: timestamp,
            type: 'dht',
            temp: parseFloat(item.dht_Temp) || null,
            humid: parseFloat(item.dht_Humid) || null,
            soil: null
          });
        }
      });
      
      soilData.forEach((item) => {
        if (item.soil_moisture_Time) {
          let soilValue = null;
          const rawValue = item.soil_moisture_Value;
          
          if (rawValue !== null && rawValue !== undefined) {
            if (typeof rawValue === 'number') {
              soilValue = rawValue;
            } else if (typeof rawValue === 'string') {
              soilValue = parseFloat(rawValue);
            } else {
              soilValue = parseFloat(rawValue);
            }
            
            if (isNaN(soilValue) || soilValue < 0 || soilValue > 100) {
              soilValue = null;
            }
          }
          
          const timeStr = item.soil_moisture_Time;
          const timestamp = new Date(timeStr.replace(' ', 'T')).getTime();
          allDataPoints.push({
            timestamp: timestamp,
            type: 'soil',
            temp: null,
            humid: null,
            soil: soilValue
          });
        }
      });
      
      allDataPoints.sort((a, b) => a.timestamp - b.timestamp);
      
      const groupedData = [];
      const interval = 5 * 60 * 1000;
      const dataMap = new Map();
      
      allDataPoints.forEach(point => {
        const intervalTime = Math.floor(point.timestamp / interval) * interval;
        const existing = dataMap.get(intervalTime);
        
        if (existing) {
          if (point.temp !== null && point.temp !== undefined) existing.temp = point.temp;
          if (point.humid !== null && point.humid !== undefined) existing.humid = point.humid;
          if (point.soil !== null && point.soil !== undefined) existing.soil = point.soil;
        } else {
          const newGroup = {
            timestamp: intervalTime,
            temp: point.temp,
            humid: point.humid,
            soil: point.soil
          };
          dataMap.set(intervalTime, newGroup);
          groupedData.push(newGroup);
        }
      });
      
      groupedData.sort((a, b) => a.timestamp - b.timestamp);
      
      let filteredGroupedData = groupedData;
      if (isSelectedToday) {
        const now = new Date().getTime();
        filteredGroupedData = groupedData.filter(item => item.timestamp <= now);
      }
      
      if (filteredGroupedData.length === 0) {
        console.log('[Refresh] No data after filtering');
        return;
      }
      
      const labels = filteredGroupedData.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      });
      
      const tempData = filteredGroupedData.map(item => item.temp ?? null);
      const humidData = filteredGroupedData.map(item => item.humid ?? null);
      const soilValues = filteredGroupedData.map(item => item.soil ?? null);

      console.log('[Refresh] Updating chart with', labels.length, 'data points');
      // Only update chart data, don't touch other states
      setChartData({
        labels,
        datasets: [
          {
            label: 'Nhiệt độ (°C)',
            data: tempData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: dhtData.length > 50 ? 2 : 3,
            pointHoverRadius: 5,
            spanGaps: true,
            borderWidth: 2,
          },
          {
            label: 'Độ ẩm KK (%)',
            data: humidData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: dhtData.length > 50 ? 2 : 3,
            pointHoverRadius: 5,
            spanGaps: true,
            borderWidth: 2,
          },
          {
            label: 'Độ ẩm đất (%)',
            data: soilValues,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: (ctx) => {
              const value = ctx.parsed.y;
              return value !== null && value !== undefined ? (soilValues.length > 50 ? 2 : 3) : 0;
            },
            pointHoverRadius: 5,
            spanGaps: true,
            borderWidth: 2,
            showLine: true,
          }
        ]
      });
      console.log('[Refresh] Chart data updated successfully');
    } catch (error) {
      console.error('[Refresh] Error refreshing chart data:', error);
      // Show user-friendly error message
      alert('Không thể làm mới đồ thị. Vui lòng thử lại sau.');
    }
  }, [gardenId, selectedDate]);

  useEffect(() => {
    fetchData();
    
    // Auto refresh every 30 seconds if viewing today for real-time updates
    // Use refreshChartData instead of fetchData to avoid affecting pump control
    let interval;
    if (isToday) {
      interval = setInterval(() => {
        console.log('Auto-refreshing chart data for real-time update...');
        refreshChartData();
      }, 30000); // 30 seconds for real-time updates
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, refreshChartData, isToday]);

  // Hàm điều khiển relay riêng biệt
  const handleControlRelay = async (relayName) => {
    try {
      const relayKey = relayName === 'V1' ? 'relay1' : 'relay2';
      const relayDuration = relayControl[relayKey].duration;
      
      if (relayName === 'V1') {
        setIsWateringRelay1(true);
        setRemainingTime(prev => ({ ...prev, relay1: relayDuration }));
      } else if (relayName === 'V2') {
        setIsWateringRelay2(true);
        setRemainingTime(prev => ({ ...prev, relay2: relayDuration }));
      }
      
      // Lấy deviceId từ gardenId
      const currentGardenId = gardenId || localStorage.getItem('gardenId');
      let deviceId = localStorage.getItem('deviceId');
      
      // Nếu chưa có deviceId, lấy từ API
      if (!deviceId && currentGardenId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${currentGardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID;
            localStorage.setItem('deviceId', deviceId);
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
        }
      }
      
      if (!deviceId) {
        alert('Không tìm thấy thiết bị. Vui lòng kiểm tra cấu hình!');
        if (relayName === 'V1') {
          setIsWateringRelay1(false);
          setRemainingTime(prev => ({ ...prev, relay1: 0 }));
        }
        if (relayName === 'V2') {
          setIsWateringRelay2(false);
          setRemainingTime(prev => ({ ...prev, relay2: 0 }));
        }
        return;
      }
      
      // Gửi request đến backend để điều khiển relay
      const response = await axios.post('/controlRelay', { 
        relay: relayName,
        deviceId: parseInt(deviceId),
        duration: relayDuration,
        mode: pumpMode
      });
      
      console.log(`Relay ${relayName} started:`, response.data);
      
      // Countdown timer
      let timeLeft = relayDuration;
      const countdownInterval = setInterval(() => {
        timeLeft--;
        if (relayName === 'V1') {
          setRemainingTime(prev => ({ ...prev, relay1: timeLeft }));
        } else {
          setRemainingTime(prev => ({ ...prev, relay2: timeLeft }));
        }
        
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          if (relayName === 'V1') {
            setIsWateringRelay1(false);
            setRemainingTime(prev => ({ ...prev, relay1: 0 }));
          } else {
            setIsWateringRelay2(false);
            setRemainingTime(prev => ({ ...prev, relay2: 0 }));
          }
        }
      }, 1000);
      
      // Auto stop after specified duration (handled by backend)
      setTimeout(() => {
        clearInterval(countdownInterval);
        if (relayName === 'V1') {
          setIsWateringRelay1(false);
          setRemainingTime(prev => ({ ...prev, relay1: 0 }));
        } else {
          setIsWateringRelay2(false);
          setRemainingTime(prev => ({ ...prev, relay2: 0 }));
        }
      }, relayDuration * 1000);
    } catch (error) {
      console.error(`Error controlling relay ${relayName}:`, error);
      if (relayName === 'V1') {
        setIsWateringRelay1(false);
        setRemainingTime(prev => ({ ...prev, relay1: 0 }));
      } else {
        setIsWateringRelay2(false);
        setRemainingTime(prev => ({ ...prev, relay2: 0 }));
      }
      alert(`Không thể điều khiển relay ${relayName}. Vui lòng kiểm tra kết nối!`);
    }
  };
  
  // Format time remaining
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  // Quick preset durations
  const quickPresets = [5, 10, 30, 60];
  
  // Handle preset selection
  const handlePresetSelect = (relayKey, duration) => {
    setRelayControl(prev => ({
      ...prev,
      [relayKey]: { ...prev[relayKey], duration }
    }));
  };
  
  // Handle duration change with +/- buttons
  const handleDurationChange = (relayKey, delta) => {
    setRelayControl(prev => {
      const current = prev[relayKey].duration;
      const newDuration = Math.min(Math.max(current + delta, 1), 120);
      return {
        ...prev,
        [relayKey]: { ...prev[relayKey], duration: newDuration }
      };
    });
  };

  // Render pump control section (reusable component)
  const renderPumpControl = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Điều khiển bơm</h3>
      
      {/* Pump Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pump 1 (V1) Card */}
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <h4 className="text-lg font-semibold text-gray-800">Bơm 1 (V1)</h4>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isWateringRelay1
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {isWateringRelay1 ? 'ĐANG CHẠY' : 'CHỜ'}
            </span>
          </div>

          {isWateringRelay1 ? (
            <>
              <p className="text-sm text-gray-600 mb-4">Đang tưới...</p>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000"
                      style={{
                        width: `${((relayControl.relay1.duration - remainingTime.relay1) / relayControl.relay1.duration) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Còn {formatTime(remainingTime.relay1)}
                  </span>
                </div>
              </div>
              {/* Duration Settings */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Cài đặt thời lượng</label>
                <div className="flex gap-2">
                  {quickPresets.map(preset => (
                    <button
                      key={preset}
                      disabled
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        relayControl.relay1.duration === preset
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 border border-gray-300'
                      } cursor-not-allowed opacity-60`}
                    >
                      {preset}s
                    </button>
                  ))}
                </div>
              </div>
              {/* Active Button */}
              <button
                disabled
                className="w-full py-3 bg-gray-300 text-gray-600 rounded-lg font-medium flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 0H15" />
                </svg>
                Bơm đang hoạt động
              </button>
            </>
          ) : (
            <>
              {/* Duration Input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Thời lượng</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDurationChange('relay1', -1)}
                    disabled={relayControl.relay1.duration <= 1}
                    className="w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-gray-600 font-semibold">−</span>
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={relayControl.relay1.duration}
                    onChange={(e) => {
                      const value = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 120);
                      setRelayControl(prev => ({
                        ...prev,
                        relay1: { ...prev.relay1, duration: value }
                      }));
                    }}
                    className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-sm text-gray-600">giây</span>
                  <button
                    onClick={() => handleDurationChange('relay1', 1)}
                    disabled={relayControl.relay1.duration >= 120}
                    className="w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-gray-600 font-semibold">+</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Tối đa: 120s</p>
              </div>
              {/* Quick Presets */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Nhanh</label>
                <div className="flex gap-2">
                  {quickPresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => handlePresetSelect('relay1', preset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        relayControl.relay1.duration === preset
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {preset}s
                    </button>
                  ))}
                </div>
              </div>
              {/* Activate Button */}
              <button
                onClick={() => handleControlRelay('V1')}
                disabled={isWateringRelay1}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                  isWateringRelay1
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-md hover:shadow-lg'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Kích hoạt Bơm 1
              </button>
            </>
          )}
        </div>

        {/* Pump 2 (V2) Card */}
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <h4 className="text-lg font-semibold text-gray-800">Bơm 2 (V2)</h4>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isWateringRelay2
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {isWateringRelay2 ? 'ĐANG CHẠY' : 'CHỜ'}
            </span>
          </div>

          {isWateringRelay2 ? (
            <>
              <p className="text-sm text-gray-600 mb-4">Đang tưới...</p>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000"
                      style={{
                        width: `${((relayControl.relay2.duration - remainingTime.relay2) / relayControl.relay2.duration) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Còn {formatTime(remainingTime.relay2)}
                  </span>
                </div>
              </div>
              {/* Duration Settings */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Cài đặt thời lượng</label>
                <div className="flex gap-2">
                  {quickPresets.map(preset => (
                    <button
                      key={preset}
                      disabled
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        relayControl.relay2.duration === preset
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 border border-gray-300'
                      } cursor-not-allowed opacity-60`}
                    >
                      {preset}s
                    </button>
                  ))}
                </div>
              </div>
              {/* Active Button */}
              <button
                disabled
                className="w-full py-3 bg-gray-300 text-gray-600 rounded-lg font-medium flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 0H15" />
                </svg>
                Bơm đang hoạt động
              </button>
            </>
          ) : (
            <>
              {/* Duration Input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Thời lượng</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDurationChange('relay2', -1)}
                    disabled={relayControl.relay2.duration <= 1}
                    className="w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-gray-600 font-semibold">−</span>
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={relayControl.relay2.duration}
                    onChange={(e) => {
                      const value = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 120);
                      setRelayControl(prev => ({
                        ...prev,
                        relay2: { ...prev.relay2, duration: value }
                      }));
                    }}
                    className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <span className="text-sm text-gray-600">giây</span>
                  <button
                    onClick={() => handleDurationChange('relay2', 1)}
                    disabled={relayControl.relay2.duration >= 120}
                    className="w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-gray-600 font-semibold">+</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Tối đa: 120s</p>
              </div>
              {/* Quick Presets */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Nhanh</label>
                <div className="flex gap-2">
                  {quickPresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => handlePresetSelect('relay2', preset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        relayControl.relay2.duration === preset
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {preset}s
                    </button>
                  ))}
                </div>
              </div>
              {/* Activate Button */}
              <button
                onClick={() => handleControlRelay('V2')}
                disabled={isWateringRelay2}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                  isWateringRelay2
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-md hover:shadow-lg'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Kích hoạt Bơm 2
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Hàm điều khiển cả 2 relay cùng lúc
  const handleStartPump = async () => {
    try {
      setIsWatering(true);
      setIsWateringRelay1(true);
      setIsWateringRelay2(true);
      
      const duration1 = relayControl.relay1.duration;
      const duration2 = relayControl.relay2.duration;
      setRemainingTime({
        relay1: duration1,
        relay2: duration2
      });
      
      // Lấy deviceId từ gardenId
      const currentGardenId = gardenId || localStorage.getItem('gardenId');
      let deviceId = localStorage.getItem('deviceId');
      
      // Nếu chưa có deviceId, lấy từ API
      if (!deviceId && currentGardenId) {
        try {
          const devicesRes = await axios.get(`/api/v1/devices/garden/${currentGardenId}`);
          if (devicesRes.data && devicesRes.data.length > 0) {
            deviceId = devicesRes.data[0].device_ID;
            localStorage.setItem('deviceId', deviceId);
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
        }
      }
      
      if (!deviceId) {
        alert('Không tìm thấy thiết bị. Vui lòng kiểm tra cấu hình!');
        setIsWatering(false);
        setIsWateringRelay1(false);
        setIsWateringRelay2(false);
        setRemainingTime({ relay1: 0, relay2: 0 });
        return;
      }
      
      // Điều khiển cả 2 relay với thời gian tương ứng
      const duration = {
        V1: duration1,
        V2: duration2
      };
      
      const response = await axios.post('/controlRelay', { 
        relay: ['V1', 'V2'],
        deviceId: parseInt(deviceId),
        duration: duration,
        mode: pumpMode
      });
      
      console.log('Both relays started:', response.data);
      
      // Countdown timers for both relays
      const maxDuration = Math.max(duration1, duration2);
      let timeLeft1 = duration1;
      let timeLeft2 = duration2;
      
      const countdownInterval = setInterval(() => {
        if (timeLeft1 > 0) timeLeft1--;
        if (timeLeft2 > 0) timeLeft2--;
        
        setRemainingTime({
          relay1: timeLeft1,
          relay2: timeLeft2
        });
        
        if (timeLeft1 <= 0 && timeLeft2 <= 0) {
          clearInterval(countdownInterval);
          setIsWatering(false);
          setIsWateringRelay1(false);
          setIsWateringRelay2(false);
          setRemainingTime({ relay1: 0, relay2: 0 });
        }
      }, 1000);
      
      // Auto stop after specified duration (handled by backend)
      setTimeout(() => {
        clearInterval(countdownInterval);
        setIsWatering(false);
        setIsWateringRelay1(false);
        setIsWateringRelay2(false);
        setRemainingTime({ relay1: 0, relay2: 0 });
      }, maxDuration * 1000);
    } catch (error) {
      console.error('Error starting pumps:', error);
      setIsWatering(false);
      setIsWateringRelay1(false);
      setIsWateringRelay2(false);
      setRemainingTime({ relay1: 0, relay2: 0 });
      alert('Không thể bật máy bơm. Vui lòng kiểm tra kết nối!');
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#374151',
        bodyColor: '#6b7280',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: (context) => {
            return `Thời gian: ${context[0].label}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 24 // Show ~24 labels max
        }
      },
      y: {
        grid: {
          color: '#f3f4f6',
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11
          }
        },
        min: 0,
        max: 100,
      }
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">
            Lịch sử cảm biến
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={goToPreviousDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiOutlineChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <HiOutlineCalendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getLocalDateString()}
                className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
              />
            </div>
            <button 
              onClick={goToNextDay}
              disabled={isToday}
              className={`p-2 rounded-lg transition-colors ${isToday ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <HiOutlineChevronRight className="w-5 h-5" />
            </button>
            {!isToday && (
              <button 
                onClick={goToToday}
                className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Hôm nay
              </button>
            )}
            <button 
              onClick={refreshChartData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Làm mới đồ thị"
            >
              <HiOutlineRefresh className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="h-80 flex flex-col items-center justify-center bg-gray-50 rounded-xl mb-4">
          <div className="text-red-500 mb-2">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Thử lại
          </button>
        </div>

        {/* Pump Control Section - Always visible */}
        {renderPumpControl()}
      </div>
    );
  }

  if (noData) {
    return (
      <div>
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">
            Lịch sử cảm biến
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={goToPreviousDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <HiOutlineChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <HiOutlineCalendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getLocalDateString()}
                className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
              />
            </div>
            <button 
              onClick={goToNextDay}
              disabled={isToday}
              className={`p-2 rounded-lg transition-colors ${isToday ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <HiOutlineChevronRight className="w-5 h-5" />
            </button>
            {!isToday && (
              <button 
                onClick={goToToday}
                className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Hôm nay
              </button>
            )}
            <button 
              onClick={refreshChartData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Làm mới đồ thị"
            >
              <HiOutlineRefresh className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="h-80 flex flex-col items-center justify-center bg-gray-50 rounded-xl mb-4">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">
            {isFutureDate ? 'Chưa có dữ liệu' : 'Không có dữ liệu cảm biến'}
          </p>
          <p className="text-sm text-gray-400 mt-1">Ngày {formatDisplayDate(selectedDate)}</p>
          {!isFutureDate && (
            <button 
              onClick={goToPreviousDay}
              className="mt-3 px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              ← Xem ngày trước
            </button>
          )}
        </div>

        {/* Pump Control Section - Always visible */}
        {renderPumpControl()}
      </div>
    );
  }

  return (
    <div>
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Lịch sử cảm biến
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Date Navigation */}
          <button 
            onClick={goToPreviousDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Ngày trước"
          >
            <HiOutlineChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <HiOutlineCalendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            />
          </div>
          
          <button 
            onClick={goToNextDay}
            disabled={isToday}
            className={`p-2 rounded-lg transition-colors ${isToday ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Ngày sau"
          >
            <HiOutlineChevronRight className="w-5 h-5" />
          </button>
          
          {!isToday && (
            <button 
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Hôm nay
            </button>
          )}
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[UI] Refresh button clicked');
              // Use fetchData for manual refresh to ensure it works
              fetchData();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
            title="Làm mới đồ thị"
          >
            <HiOutlineRefresh className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-sm text-gray-600">Nhiệt độ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-sm text-gray-600">Độ ẩm KK</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <span className="text-sm text-gray-600">Độ ẩm đất</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 mb-4">
        {chartData && <Line data={chartData} options={options} />}
      </div>

      {/* Pump Control Section - Separate Card like Chart */}
      {renderPumpControl()}

    </div>
  );
}

export default SensorChart;

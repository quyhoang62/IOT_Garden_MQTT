import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaThermometerHalf, FaTint, FaWind } from 'react-icons/fa';

function Control({ message }) {
  const navigate = useNavigate();

  const zones = [
    { id: 1, name: 'Khu vực 1', temp: message?.air_temperature || 0, soil: message?.soil_moisture || 0, air: message?.air_humid || 0 },
    { id: 2, name: 'Khu vực 2', temp: 30, soil: 25, air: 55 },
    { id: 3, name: 'Khu vực 3', temp: 28, soil: 29, air: 58 },
    { id: 4, name: 'Khu vực 4', temp: 31, soil: 22, air: 53 },
    { id: 5, name: 'Khu vực 5', temp: 29, soil: 27, air: 60 },
    { id: 6, name: 'Khu vực 6', temp: 32, soil: 30, air: 59 },
    { id: 7, name: 'Khu vực 7', temp: 33, soil: 31, air: 56 },
    { id: 8, name: 'Khu vực 8', temp: 34, soil: 28, air: 57 },
    { id: 9, name: 'Khu vực 9', temp: 27, soil: 26, air: 54 },
  ];

  const handleNavigate = (zone) => {
    navigate('/infomation', {
      state: { location: { id: zone.id, title: zone.name } }
    });
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] flex justify-center">
      <div className="w-full max-w-7xl px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-10 text-center">Điều khiển khu vực</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {zones.map((zone) => (
            <div
              key={zone.id}
              onClick={() => handleNavigate(zone)}
              className="cursor-pointer bg-white border border-purple-300 rounded-2xl shadow-md p-8 hover:shadow-lg hover:-translate-y-1 transform transition-all duration-300"
            >
              <h2 className="text-xl font-semibold text-purple-700 text-center mb-6">{zone.name}</h2>
              <ul className="space-y-4 text-gray-700 text-base">
                <li className="flex items-center justify-between">
                  <span className="flex items-center"><FaThermometerHalf className="text-purple-500 mr-2" />Nhiệt độ:</span>
                  <span className="font-bold">{zone.temp} °C</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center"><FaTint className="text-purple-500 mr-2" />Độ ẩm đất:</span>
                  <span className="font-bold">{zone.soil} %</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center"><FaWind className="text-purple-500 mr-2" />Độ ẩm không khí:</span>
                  <span className="font-bold">{zone.air} %</span>
                </li>
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Control;

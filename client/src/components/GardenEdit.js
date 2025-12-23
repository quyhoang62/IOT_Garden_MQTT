import { useState } from 'react';
import axios from 'axios';
import {
  FaMapMarkerAlt, FaCheckCircle, FaSeedling, FaStickyNote, FaRulerCombined, FaImage
} from 'react-icons/fa';

const iconMap = {
  garden_Location: <FaMapMarkerAlt className="text-purple-600" />,
  garden_Status: <FaCheckCircle className="text-purple-600" />,
  garden_Name: <FaSeedling className="text-purple-600" />,
  garden_Description: <FaStickyNote className="text-purple-600" />,
  garden_Area: <FaRulerCombined className="text-purple-600" />,
  garden_Image: <FaImage className="text-purple-600" />,
};

const GardenEdit = function ({ gardenDetails, garden, setGarden }) {
  const [tempGarden, setTempGarden] = useState({ ...garden });

  const updateTempGardenInfo = (key, value) => {
    setTempGarden({ ...tempGarden, [key]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .put(`/api/v1/gardens/${garden.garden_ID}`, tempGarden)
      .then(() => {
        setGarden(tempGarden);
      })
      .catch(console.log);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex justify-center">
      <div className="bg-white border border-purple-300 rounded-2xl shadow-lg p-10 w-full max-w-6xl">
        <h2 className="text-3xl font-bold text-gray-800 mb-10">Chỉnh sửa thông tin vườn</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {garden &&
            gardenDetails.map((detail) => (
              <div key={detail.value} className="flex flex-col">
                <label
                  htmlFor={detail.value}
                  className="flex items-center text-base font-medium text-gray-700 mb-2"
                >
                  {iconMap[detail.value]} 
                  <span className="ml-2">{detail.label}</span>
                </label>
                <input
                  type="text"
                  id={detail.value}
                  value={tempGarden[detail.value]}
                  onChange={(e) => updateTempGardenInfo(detail.value, e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-purple-50 text-gray-900 focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                />
              </div>
            ))}

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="mt-6 px-8 py-3 bg-purple-600 text-white text-lg font-semibold rounded-xl hover:bg-purple-700 transition"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GardenEdit;

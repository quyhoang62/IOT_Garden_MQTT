import React from "react";
import { FaCogs, FaBell, FaPalette, FaGlobe, FaSyncAlt } from "react-icons/fa";

const ProfileSiteSetting = function ({ user }) {
  return (
    <div className="flex justify-center py-10">
      <div className="bg-white border border-purple-300 rounded-2xl shadow-lg p-10 w-full max-w-4xl">
        <div className="flex items-center gap-3 mb-10 text-purple-700">
          <FaCogs className="text-3xl" />
          <h2 className="text-3xl font-bold text-gray-800">Cài đặt giao diện</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Thông báo */}
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FaBell className="text-xl text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-700">Thông báo</h3>
            </div>
            <div className="flex items-center space-x-3">
              <label htmlFor="notifications" className="text-gray-700">Bật thông báo:</label>
              <input
                type="checkbox"
                id="notifications"
                checked={user?.notifications}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded"
                disabled
              />
            </div>
          </div>

          {/* Chủ đề */}
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FaPalette className="text-xl text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-700">Chủ đề</h3>
            </div>
            <select
              id="siteTheme"
              value={user?.siteTheme}
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled
            >
              <option value="light">Sáng</option>
              <option value="dark">Tối</option>
            </select>
          </div>

          {/* Ngôn ngữ */}
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FaGlobe className="text-xl text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-700">Ngôn ngữ</h3>
            </div>
            <select
              id="language"
              value="vi"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>

          {/* Tự động làm mới */}
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FaSyncAlt className="text-xl text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-700">Làm mới dữ liệu</h3>
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-gray-700">Tự động làm mới:</label>
              <input type="checkbox" checked={true} disabled className="w-5 h-5 text-purple-600 border-gray-300 rounded" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileSiteSetting;

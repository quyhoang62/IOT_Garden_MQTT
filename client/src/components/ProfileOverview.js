import React from "react";
import { FaUser } from "react-icons/fa";

const ProfileOverview = React.memo(function ({ userDetails, user }) {
  return (
    <div className="min-h-[calc(100vh-120px)] flex justify-center">
      <div className="bg-white border border-purple-300 rounded-2xl shadow-lg p-10 w-full max-w-6xl">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3 text-purple-700">
            <FaUser className="text-3xl" />
            <h2 className="text-3xl font-bold text-gray-800">Thông tin tài khoản</h2>
          </div>
          <span className="text-sm text-purple-700 bg-purple-100 px-4 py-1 rounded-full">
            Cập nhật: {new Date().toLocaleDateString()}
          </span>
        </div>

        {user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {userDetails.map((detail) => (
              <div key={detail.value} className="flex items-center bg-purple-50 border border-purple-200 rounded-xl p-5 transition hover:shadow-md">
                <div className="ml-2">
                  <div className="text-sm text-gray-500">{detail.label}</div>
                  <div className="text-xl font-semibold text-gray-800">{user[detail.value] ?? "Không có"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 text-lg">Đang tải dữ liệu...</div>
        )}
      </div>
    </div>
  );
});

export default ProfileOverview;

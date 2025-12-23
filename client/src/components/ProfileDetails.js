import { useState } from 'react';
import axios from 'axios';
import { FaEdit } from 'react-icons/fa';

const ProfileDetails = function ({ userDetails, user, setUser }) {
  const [tempUser, setTempUser] = useState({ ...user });

  const updateTempUserInfo = (key, value) => {
    setTempUser({ ...tempUser, [key]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.put(`/api/v1/users/${user.user_ID}`, tempUser)
      .then(() => setUser(tempUser))
      .catch(console.log);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex justify-center">
      <div className="bg-white border border-purple-300 rounded-2xl shadow-lg p-10 w-full max-w-6xl">
        <div className="flex items-center gap-3 mb-10 text-purple-700">
          <FaEdit className="text-3xl" />
          <h2 className="text-3xl font-bold text-gray-800">Chỉnh sửa thông tin</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {userDetails.map((detail) => (
            <div key={detail.value} className="flex flex-col">
              <label htmlFor={detail.value} className="text-base font-medium text-gray-700 mb-2">{detail.label}</label>
              <input
                type="text"
                id={detail.value}
                value={tempUser[detail.value]}
                onChange={(e) => updateTempUserInfo(detail.value, e.target.value)}
                readOnly={detail.value === 'user_Username' || detail.value === 'user_Role'}
                className="px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-purple-50 text-gray-900 focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
              />
            </div>
          ))}

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="mt-6 px-8 py-3 bg-purple-600 text-white text-lg font-semibold rounded-xl hover:bg-purple-700 transition">
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileDetails;

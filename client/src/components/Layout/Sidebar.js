import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HiOutlineViewGrid, 
  HiOutlineBeaker, 
  HiOutlineClock, 
  HiOutlineCog
} from 'react-icons/hi';

function Sidebar({ user }) {
  const location = useLocation();

  const menuItems = [
    { name: 'Tổng quan', path: '/dashboard', icon: HiOutlineViewGrid },
    { name: 'Quản lí tưới', path: '/irrigation', icon: HiOutlineBeaker },
    { name: 'Lịch sử', path: '/history', icon: HiOutlineClock },
    { name: 'Cài đặt', path: '/settings', icon: HiOutlineCog },
  ];

  return (
    <div className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* User Profile Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
            {user?.name?.charAt(0)?.toUpperCase() || 'V'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{user?.name || 'Vườn Thông Minh'}</h3>
            <p className="text-sm text-gray-500">{user?.email || 'user@email.com'}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-6">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-green-50 text-green-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

    </div>
  );
}

export default Sidebar;



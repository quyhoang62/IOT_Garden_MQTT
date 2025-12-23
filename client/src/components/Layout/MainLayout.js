import React from 'react';
import Sidebar from './Sidebar';

function MainLayout({ children, user }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default MainLayout;



'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import { navConfig } from './navConfig';

type Role = 'admin' | 'staff' | 'student';

interface NavbarProps {
  role: Role;
}

const Navbar = ({ role }: NavbarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = navConfig[role];
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (res.ok) {
        // Use window.location for a full refresh instead of router.push
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">Room Booking</span>
              <span className="ml-2 text-xs px-2 py-1 bg-blue-500 rounded-full uppercase">
                {role}
              </span>
            </div>
          </div>
          
          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150
                    ${pathname === item.href 
                      ? 'bg-blue-800 text-white' 
                      : 'text-blue-100 hover:bg-blue-600'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            <button
              onClick={handleLogout}
              className="ml-4 flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-150"
            >
              <FiLogOut className="mr-1" />
              Logout
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-blue-100 hover:text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium
                  ${pathname === item.href 
                    ? 'bg-blue-800 text-white' 
                    : 'text-blue-100 hover:bg-blue-600'
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            
            <button
              onClick={handleLogout}
              className="mt-2 w-full flex items-center justify-center px-3 py-2 rounded-md text-base font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <FiLogOut className="mr-1" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
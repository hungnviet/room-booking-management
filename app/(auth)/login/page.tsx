'use client';

import LoginForm from "@/components/forms/LoginForm";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isChecking) return;
    
    const checkLoginStatus = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.role) {
            // Use replace instead of push to avoid adding to browser history
            router.replace(`/dashboard/${data.role}`);
          }
        }
        // Set to false whether successful or not to prevent repeated checks
        setIsChecking(false);
      } catch (error) {
        console.error("Error checking login status:", error);
        setIsChecking(false);
      }
    };
    
    checkLoginStatus();
  }, [router, isChecking]);

  // Don't render anything until the check is complete
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <LoginForm />
      </div>
    </div>
  );
}
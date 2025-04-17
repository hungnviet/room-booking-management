// app/dashboard/staff/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function StaffDashboard() {
  const cookieStore = await cookies();
  const role = cookieStore.get('role')?.value;
  
  if (role !== 'staff') {
    redirect('/login');
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Staff Dashboard</h1>
      <p>Welcome, Staff! Book rooms and manage your schedule here.</p>
    </div>
  );
}

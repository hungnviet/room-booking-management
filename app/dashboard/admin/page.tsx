// app/dashboard/admin/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const role = cookieStore.get('role')?.value;

  if (role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p>Welcome, Admin! Here you can manage rooms, users, and approve bookings.</p>
    </div>
  );
}
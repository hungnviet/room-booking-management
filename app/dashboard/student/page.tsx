// app/dashboard/student/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function StudentDashboard() {
    const cookieStore = await cookies();
    const role = cookieStore.get('role')?.value;

  if (role !== 'student') {
    redirect('/login');
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Student Dashboard</h1>
      <p>Welcome, Student! View room availability and schedules.</p>
    </div>
  );
}

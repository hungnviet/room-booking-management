// app/page.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value as
    | "admin"
    | "staff"
    | "student"
    | undefined;

  if (!role) {
    // If not logged in, redirect to login
    redirect("/login");
  }

  // Redirect based on role
  switch (role) {
    case "admin":
      redirect("/dashboard/admin");
    case "staff":
      redirect("/dashboard/staff");
    case "student":
      redirect("/dashboard/student");
    default:
      redirect("/login");
  }
}

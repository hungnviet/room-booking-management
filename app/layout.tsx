// app/layout.tsx

import type { Metadata } from "next";

import "./globals.css";

import Navbar from "@/components/navbar/Navbar"; 
import { navConfig } from "@/components/navbar/navConfig"; 
import { cookies } from "next/headers"; 


export const metadata: Metadata = {
  title: "Room Booking System",
  description: "Manage bookings by role: Admin | Staff | Student",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value as
    | "admin"
    | "staff"
    | "student"
    | undefined;

  return (
    <html lang="en">
      <body
        className=""
      >
        {role && navConfig[role] && <Navbar role={role} />}
        <main className="p-4">{children}</main>
      </body>
    </html>
  );
}
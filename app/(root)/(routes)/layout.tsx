"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { FaHome, FaChartBar, FaCog } from "react-icons/fa";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCredits() {
      if (user) {
        const { data, error } = await supabase
          .from("user_credits")
          .select("credits_left")
          .eq("clerk_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching credits:", error);
        } else {
          setCredits(data.credits_left);
        }
      }
    }

    fetchCredits();
  }, [user]);

  return (
    <div className="flex flex-col h-screen">
      {/* Navbar */}
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <div className="text-xl font-bold">FastLedger.io</div>
        <div className="flex items-center space-x-4">
          {credits !== null && (
            <div className="text-sm">Credits left: {credits}</div>
          )}
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-16 bg-gray-800 text-white">
          <div className="flex flex-col items-center py-4 space-y-4">
            <Link href="/" className="p-2 hover:bg-gray-700 rounded">
              <FaHome size={24} />
            </Link>
            <Link href="/dashboard" className="p-2 hover:bg-gray-700 rounded">
              <FaChartBar size={24} />
            </Link>
            <Link href="/" className="p-2 hover:bg-gray-700 rounded">
              <FaCog size={24} />
            </Link>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

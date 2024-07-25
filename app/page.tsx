"use client";
import React from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { FlipWords } from "@/components/ui/flip-words";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function LandingPage() {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/" />
      </div>

      <h1 className="text-6xl font-bold mb-4 text-black">FastLedger.io</h1>

      <div className="text-xl mb-8 text-center">
        Image to{" "}
        <FlipWords
          words={["Transaction Reports", "Income Statements", "Balance Sheet"]}
          duration={2000}
        />{" "}
        under 60 seconds
      </div>

      {isSignedIn ? (
        <Link
          href="/dashboard"
          className="bg-blue-500 text-white px-6 py-2 rounded"
        >
          Go to Dashboard
        </Link>
      ) : (
        <div className="space-x-4">
          <SignUpButton mode="modal">
            <button className="bg-green-500 text-white px-6 py-2 rounded">
              Sign Up
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="bg-blue-500 text-white px-6 py-2 rounded">
              Sign In
            </button>
          </SignInButton>
        </div>
      )}
    </div>
  );
}

import { Metadata } from 'next';
import { auth } from "@/auth";
import { SidebarWrapper } from "@/components/layout/sidebar-wrapper";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "DocWise",
  description: "Chat with your pdf using AI",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      >
        <SessionProvider session={session}>
          <SidebarProvider defaultOpen={false}>
            <div className="flex h-full w-full bg-blue-50">
              <SidebarWrapper />
              <main className="flex-1 flex flex-col  lg:ml-0.5 h-screen lg:mr-2 ">
                {children}
              </main>
            </div>
            <Toaster />
          </SidebarProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

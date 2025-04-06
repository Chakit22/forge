import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { UserProvider } from "@/context/user-context";
import { initWeaviateSchema } from "./api/weaviate-init/initSchema";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forge - AI Learning Assistant",
  description: "Your personalized AI learning assistant.",
};

// Initialize Weaviate on server start
if (typeof window === 'undefined') {
  initWeaviateSchema().catch(error => {
    console.error('Failed to initialize Weaviate schema:', error);
  });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserProvider>
          <Toaster position="top-right" />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}

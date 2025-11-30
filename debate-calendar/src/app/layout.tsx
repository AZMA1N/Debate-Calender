import type { Metadata } from "next";
import "./globals.css";
import "./fullcalendar.css";

export const metadata: Metadata = {
  title: "Debate Calendar",
  description: "Live events, drills, and workshops for the debate club.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}

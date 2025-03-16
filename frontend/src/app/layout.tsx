import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DCOM",
  description:
    "A lightweight decentralized chat system with terminal and browser support. Communicate seamlessly across devices with real-time messaging, anonymous participation, and self-destructing chat rooms. Built for privacy, minimalism, and ease of use. ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
<<<<<<< HEAD
=======
import "./globals.css";
>>>>>>> b2784bda7c8dbc997441a6b08852685a82d7e96c
import { AppQueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "TradeFinlytix",
  description: "Professional trading intelligence platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-secondary text-brand-text antialiased">
        <AppQueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}

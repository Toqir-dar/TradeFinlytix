import type { Metadata } from "next";
<<<<<<< HEAD
import "../app/globals.css";
=======
import "./globals.css";
>>>>>>> 9e117a2 (feat: add theme toggle component for dark and light mode)
import { AppQueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/lib/auth";
import { RagChatWidget } from "@/components/rag-chat-widget";

export const metadata: Metadata = {
  title: "TradeFinlytix",
  description: "Professional trading intelligence platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-secondary text-brand-text antialiased">
        <AppQueryProvider>
          <AuthProvider>
            {children}
            <RagChatWidget />
          </AuthProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}

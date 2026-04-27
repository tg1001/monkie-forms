import type { Metadata } from "next";
import { WalletProvider } from "@/lib/wallet/WalletProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Privacy Forms - UN Young Trade Leaders",
  description: "Privacy-preserving form submission powered by Midnight Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RetinaVascular AI | Cardio-Renal Screening",
  description: "Non-invasive microvascular screening from retinal fundus imaging",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#060911] text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
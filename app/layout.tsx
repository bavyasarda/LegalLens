import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "LegalLens — Document Intelligence",
  description:
    "Upload legal documents, ask questions, get cited answers grounded in your files.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#18181b",
              color: "#f4f4f5",
              border: "1px solid #27272a",
            },
          }}
        />
      </body>
    </html>
  );
}

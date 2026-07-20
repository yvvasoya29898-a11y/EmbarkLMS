import type { Metadata } from "next";
import "./globals.css";
import PWARegistration from "@/components/PWARegistration";
import ToastProvider from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Embark LMS — Learn AI, Implementation-First",
  description: "Embark LMS is an online learning platform for AI and technology courses.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
    apple: "/Logo.png",
  },
  openGraph: {
    title: "Embark LMS — Learn AI, Implementation-First",
    description: "Embark LMS is an online learning platform for AI and technology courses.",
    url: "https://embarkai.in",
    siteName: "Embark LMS",
    images: [
      {
        url: "https://embarkai.in/Logo.png",
        width: 1200,
        height: 630,
        alt: "Embark LMS - Learn AI, Implementation-First",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Embark LMS — Learn AI, Implementation-First",
    description: "Embark LMS is an online learning platform for AI and technology courses.",
    images: ["https://embarkai.in/Logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>
          <PWARegistration />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}


import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Splash } from "@/components/LoadingScreen";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display-face", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "My Quiz", template: "%s · My Quiz" },
  description: "Test your knowledge, compete with friends and climb the global leaderboard on My Quiz.",
  applicationName: "My Quiz",
};

export const viewport: Viewport = { themeColor: "#07071a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: "#7c5cff", colorBackground: "#0f1030", borderRadius: "0.75rem" },
      }}
    >
      <html lang="en">
        <body className={`${inter.variable} ${display.variable} min-h-dvh antialiased`}>
          <Splash />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

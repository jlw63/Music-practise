import "./globals.css";
import type { Metadata } from "next";
import { PostProvider } from "./context/PostContext";
import { AuthProvider } from "../context/AuthContext";
import { NavBar } from "./components/NavBar";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";

export const metadata: Metadata = {
  title: "riff",
  description: "riff is a community for musicians to share performances, get feedback, and connect with other players.",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <PostProvider>
                <NavBar />
                <main className="py-20 max-w-6xl mx-auto">
                  {children}
                </main>
              </PostProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
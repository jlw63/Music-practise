import "./globals.css";
import { PostProvider } from "./context/PostContext";
import { AuthProvider } from "../context/AuthContext";
import { NavBar } from "./components/NavBar";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";

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
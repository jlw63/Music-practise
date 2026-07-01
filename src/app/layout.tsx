import "./globals.css";
import { PostProvider } from "./context/PostContext";
import { AuthProvider } from "../context/AuthContext";
import { NavBar } from "./components/NavBar";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <PostProvider>
              <NavBar />
              <main className="py-20 max-w-6xl mx-auto">
                {children}
              </main>
            </PostProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
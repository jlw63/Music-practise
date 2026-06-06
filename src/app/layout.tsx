import "./globals.css";
import { PostProvider } from "./context/PostContext";
import { AuthProvider } from "../context/AuthContext";
import { NavBar } from "./components/NavBar";

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <AuthProvider>
          <PostProvider>
            <NavBar />
            <main className="py-20 max-w-6xl mx-auto">
              {children}
            </main>
          </PostProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { PostProvider } from "./context/PostContext";

const links = [
  { name: "Feed", href: "/" },
  { name: "Create", href: "/create" },
  { name: "Profile", href: "/profile" }
];

const NavBar = () => (
  <nav className="bg-base-300 p-4 flex gap-4">
    {links.map((link) => (
      <Link key={link.href} href={link.href}>
        {link.name}
      </Link>
    ))}
  </nav>
);

export default function RootLayout({children,}: 
  {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <PostProvider>
        <main className="py-20 max-w-6xl mx-auto">
          {children}
        </main>
        </PostProvider>
      </body>
    </html>
  );
}
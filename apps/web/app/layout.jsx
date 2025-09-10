import "../styles/globals.css";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "PrintCraft Studio",
  description: "Visual template editor for ESC/POS & ZPL",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900">
        <NavBar />
        {/* Full width, centered content with optional padding */}
        <main className="w-full px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

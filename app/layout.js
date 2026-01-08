import "./globals.css";
import { BoothProvider } from "../context/BoothContext";

export const metadata = {
  title: "Kids Photo Booth",
  description: "Kiosk-style photo booth flow in Next.js"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="k-shell">
        <BoothProvider>{children}</BoothProvider>
      </body>
    </html>
  );
}

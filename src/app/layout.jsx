import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "AegisAPI Dashboard",
  description: "AI Zombie API Detector",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden w-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

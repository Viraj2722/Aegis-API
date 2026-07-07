import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "AegisAPI Dashboard",
  description: "AI Zombie API Detector",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className="overflow-x-hidden w-full max-w-[100vw]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import "./globals.css";

export const metadata = {
  title: "AegisAPI Dashboard",
  description: "AI Zombie API Detector",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}

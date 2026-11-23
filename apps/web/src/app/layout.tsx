import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: { default: "VendeFácil AI", template: "%s · VendeFácil AI" },
  description: "Crie, divulgue e venda seus produtos nas redes sociais em minutos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

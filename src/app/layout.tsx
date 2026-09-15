import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";
export const metadata: Metadata = {
  title: "Scriptis — Sua próxima conversa começa aqui",
  description:
    "Scripts que soam como você, não como um robô. Componha três abordagens gratuitamente e leve o prompt para qualquer IA.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

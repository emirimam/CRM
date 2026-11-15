import "./globals.css";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "ITDVoIP CRM",
  description: "Outbound pipeline for ITDVoIP hosted PBX",
};

export const viewport: Viewport = {
  // Keeps browser chrome in step with whichever theme is active.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#13151c" },
  ],
};

/*
  Runs before first paint so a pinned theme does not flash the wrong colours.
  Deliberately tiny and dependency-free; the matching UI is ThemeToggle.
*/
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Nav />
        <main className="mx-auto max-w-[86rem] px-4 py-7 sm:px-6">
          <div className="animate-fade-up space-y-6">{children}</div>
        </main>
      </body>
    </html>
  );
}

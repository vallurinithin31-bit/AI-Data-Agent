import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Data Analyst Agent | Autonomous SaaS Analytics Platform',
  description: 'Production-quality Autonomous Data Analyst SaaS for conversational data science, automated profiling, cleaning, funnels, cohorts, forecasting, and reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Averia+Serif+Libre:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-white text-black antialiased selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}

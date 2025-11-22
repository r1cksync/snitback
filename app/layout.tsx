import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flow State Facilitator API',
  description: 'AI-powered focus and flow state monitoring backend',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

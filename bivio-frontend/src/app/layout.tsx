import type { Metadata } from 'next';
import { MuiProvider } from '@/components/providers/MuiProvider';
import { ReduxProvider } from '@/components/providers/ReduxProvider';
import { GlobalSnackbar } from '@/components/common/GlobalSnackbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bivio — Recruitment Management System',
  description:
    'Bivio (Italian: a fork in the road) — Dual-mode talent platform for full-time ATS hiring & milestone-escrow freelance engagements.',
  keywords: ['recruitment', 'jobs', 'freelance', 'ATS', 'escrow', 'AI matching'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <MuiProvider>
          <ReduxProvider>
            {children}
            <GlobalSnackbar />
          </ReduxProvider>
        </MuiProvider>
      </body>
    </html>
  );
}

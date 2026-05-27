import { PublicFooter } from '@/components/public/footer';
import { PublicNavbar } from '@/components/public/navbar';

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

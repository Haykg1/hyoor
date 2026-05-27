import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function LocaleNotFound(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="mb-3 text-4xl font-bold">404</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        The page you are looking for could not be found.
      </p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}

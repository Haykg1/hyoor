import { Link } from '@/i18n/navigation';

export interface FooterColumnLink {
  href: string;
  label: string;
}

interface FooterColumnProps {
  heading: string;
  links: FooterColumnLink[];
  hidden?: boolean;
}

export function FooterColumn({ heading, links, hidden }: FooterColumnProps): React.JSX.Element {
  return (
    <div hidden={hidden}>
      <h4 className="mb-3 text-sm font-semibold">{heading}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((link) => (
          <li key={`${heading}-${link.label}`}>
            <Link href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

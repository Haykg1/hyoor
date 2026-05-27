import { redirect } from 'next/navigation';

export default function HostPropertiesRedirectPage(): never {
  redirect('/dashboard');
}

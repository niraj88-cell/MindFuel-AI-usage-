import { redirect } from 'next/navigation'

// Launch: the root goes straight to the product. Signed-in visitors land on the dashboard;
// everyone else is bounced to /login by the default-deny middleware (proxy.ts). The
// pre-launch waitlist/email landing has been retired.
export default function RootPage() {
  redirect('/dashboard')
}

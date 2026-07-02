import { redirect } from 'next/navigation'

// Temporary root redirect — until a proper insurer selection page is built.
// When subdomain routing is enabled (custom domain), this root will serve
// a platform marketing page instead.
export default function RootPage() {
  redirect('/i/care-shield') // default insurer — update when multi-insurer selection page is built
}

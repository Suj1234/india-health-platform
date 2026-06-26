import { ShieldCheck, Lock, CreditCard, Award } from 'lucide-react'

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'IRDAI Approved',
    desc: 'Fully licensed & regulated',
  },
  {
    icon: Lock,
    title: 'Bank-grade security',
    desc: '256-bit SSL encryption',
  },
  {
    icon: CreditCard,
    title: 'Secure payments',
    desc: 'Powered by Razorpay',
  },
  {
    icon: Award,
    title: 'CERT-In compliant',
    desc: 'Government certified',
  },
]

export function LandingTrustBar() {
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-8">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
                <item.icon className="h-4.5 w-4.5 text-primary-800" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

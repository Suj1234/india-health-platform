'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, XCircle, AlertCircle, Printer } from 'lucide-react'
import type { IAdoreReport, CheckResult } from '@/lib/mock/iadore.mock'

interface ReportData {
  application: {
    id: string
    application_number: string
    created_at: string
    stp_score: number | null
  }
  customer: {
    name: string | null
    dob: string | null
    age: number | null
    gender: string | null
    pan: string | null
    mobile: string
    email: string | null
    address: { city: string; state: string; pincode: string } | null
    occupation_type: string | null
    employer_name: string | null
    bureau_score: number | null
  }
  iadore_report: IAdoreReport | null
}

function chk(r: CheckResult) {
  if (r === 'pass') return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />PASS</span>
  if (r === 'warn') return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" />WARN</span>
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />FAIL</span>
}

function SectionHead({ number, title, risk }: { number: number; title: string; risk?: string }) {
  const riskColor = !risk ? '' : risk === 'Very High' || risk === 'High' ? 'text-red-600 bg-red-50 border-red-200' : risk === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{number}</div>
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex-1">{title}</h2>
      {risk && <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${riskColor}`}>{risk} Risk</span>}
    </div>
  )
}

function InfoRow({ label, value, flag }: { label: string; value: React.ReactNode; flag?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-gray-500 text-xs shrink-0">{label}</span>
      <span className={`text-xs font-medium text-right ${flag ? 'text-red-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

function ScoreArc({ score, color }: { score: number; color: string }) {
  const r = 52, cx = 60, cy = 60
  const circumference = Math.PI * r
  const offset = circumference * (1 - score / 100)
  return (
    <svg viewBox="0 0 120 72" className="w-full">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="bold" fill="#111827">{score}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#6b7280">/100</text>
    </svg>
  )
}

export default function IAdoreReportPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/underwriter/applications/${params.id}`)
      const json = await res.json()
      if (json.success) setData(json as ReportData)
    } finally { setLoading(false) }
  }, [params.id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Loading report…</div>
  if (!data?.iadore_report) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">iAdore report not available.</div>

  const { application: app, customer, iadore_report: r } = data
  const gaugeColor = r.safetyScore >= 70 ? '#10b981' : r.safetyScore >= 50 ? '#f59e0b' : r.safetyScore >= 30 ? '#ef4444' : '#991b1b'
  const riskTextColor = r.safetyScore >= 70 ? 'text-emerald-600' : r.safetyScore >= 50 ? 'text-amber-500' : 'text-red-600'

  return (
    <div className="bg-gray-100 min-h-screen print:bg-white print:min-h-0">

      {/* Print button — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-teal-700 text-white px-6 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">iAdore Risk Report — {customer.name}</p>
          <p className="text-teal-200 text-xs">{app.application_number} · Report Date: {r.reportDate}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-white text-teal-700 hover:bg-teal-50 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
        >
          <Printer className="w-4 h-4" /> Download PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 print:p-0 print:max-w-none space-y-0">

        {/* ── Cover / Header ─────────────────────────────────────────────── */}
        <div className="bg-teal-700 text-white px-8 py-6 print:py-8 rounded-t-2xl print:rounded-none">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                  <span className="text-teal-700 text-xs font-black">iA</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-teal-200 uppercase tracking-widest">Perfios I-Adore</p>
                  <p className="text-xs text-teal-300">Individual Assessment & Risk Overview Report</p>
                </div>
              </div>
              <h1 className="text-2xl font-bold">{customer.name ?? '—'}</h1>
              <div className="flex gap-4 mt-2 text-sm text-teal-100 flex-wrap">
                <span>PAN: <span className="font-mono font-semibold text-white">{customer.pan ?? '—'}</span></span>
                <span>DOB: {customer.dob ? new Date(customer.dob).toLocaleDateString('en-IN') : '—'}</span>
                <span>Age: {customer.age ?? '—'} yrs</span>
                <span>Gender: {customer.gender ?? '—'}</span>
              </div>
              <div className="flex gap-4 mt-1 text-sm text-teal-100 flex-wrap">
                <span>Application: <span className="font-mono font-semibold text-white">{app.application_number}</span></span>
                <span>Report Date: {r.reportDate}</span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-6">
              <p className="text-teal-200 text-xs uppercase tracking-widest mb-1">Safety Score</p>
              <div className="w-28">
                <ScoreArc score={r.safetyScore} color="white" />
              </div>
              <p className={`text-sm font-bold mt-1 text-white`}>{r.safetyLevel} Risk</p>
            </div>
          </div>
        </div>

        {/* ── Summary Bar ────────────────────────────────────────────────── */}
        <div className="bg-white border-x border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 print:border-gray-300">
          {[
            { label: 'Credit Score', value: `${r.financialEvaluation.creditScore} (${r.financialEvaluation.creditScoreLabel})`, color: r.financialEvaluation.creditScore >= 750 ? 'text-emerald-600' : r.financialEvaluation.creditScore >= 700 ? 'text-teal-600' : 'text-amber-600' },
            { label: 'Annual Income (BSA)', value: r.financialEvaluation.annualIncomeFromBSA ? `₹${(r.financialEvaluation.annualIncomeFromBSA / 100000).toFixed(2)}L` : 'N/A', color: 'text-gray-800' },
            { label: 'Litigation Cases', value: String(r.litigationCheck.totalCases), color: r.litigationCheck.totalCases > 0 ? 'text-red-600' : 'text-emerald-600' },
            { label: 'Lifestyle Risk', value: r.lifestyleAnalysis.riskLevel, color: r.lifestyleAnalysis.riskLevel === 'High' || r.lifestyleAnalysis.riskLevel === 'Very High' ? 'text-red-600' : r.lifestyleAnalysis.riskLevel === 'Medium' ? 'text-amber-600' : 'text-emerald-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-5 py-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">{label}</p>
              <p className={`text-base font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border-x border-b border-gray-200 print:border-gray-300">

          {/* ── Section 1: Identity Checks ──────────────────────────────── */}
          <div className="px-8 py-6 border-b border-gray-100 print:border-gray-300">
            <SectionHead number={1} title="Identity Checks" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                ['PAN Verification', r.identityChecks.panVerification],
                ['Name Match', r.identityChecks.nameMatch],
                ['Date of Birth Match', r.identityChecks.dobMatch],
                ['Aadhaar Seeding', r.identityChecks.aadhaarSeeding],
                ['Mobile Authentication', r.identityChecks.mobileAuth],
                ['Email Authentication', r.identityChecks.emailAuth],
              ].map(([label, result]) => (
                <div key={label as string} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">{label as string}</span>
                  {chk(result as CheckResult)}
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 2: Demographic Details ─────────────────────────── */}
          <div className="px-8 py-6 border-b border-gray-100 print:border-gray-300">
            <SectionHead number={2} title="Demographic Details" />
            <div className="grid grid-cols-2 gap-x-12">
              <div>
                <InfoRow label="Full Name" value={customer.name ?? '—'} />
                <InfoRow label="Date of Birth" value={customer.dob ? new Date(customer.dob).toLocaleDateString('en-IN') : '—'} />
                <InfoRow label="Gender" value={customer.gender ?? '—'} />
                <InfoRow label="PAN Number" value={<span className="font-mono">{customer.pan ?? '—'}</span>} />
              </div>
              <div>
                <InfoRow label="City" value={customer.address?.city ?? '—'} />
                <InfoRow label="State" value={customer.address?.state ?? '—'} />
                <InfoRow label="Pincode" value={customer.address?.pincode ?? '—'} />
                <InfoRow label="Occupation" value={customer.occupation_type ?? '—'} />
              </div>
            </div>
          </div>

          {/* ── Section 3: Financial Evaluation ────────────────────────── */}
          <div className="px-8 py-6 border-b border-gray-100 print:border-gray-300">
            <SectionHead number={3} title="Financial Evaluation" risk={r.financialEvaluation.riskLevel} />
            <div className="grid grid-cols-2 gap-x-12">
              <div>
                <InfoRow label="Credit Score" value={
                  <span className={r.financialEvaluation.creditScore >= 750 ? 'text-emerald-600' : r.financialEvaluation.creditScore >= 700 ? 'text-teal-600' : 'text-amber-600'}>
                    {r.financialEvaluation.creditScore} — {r.financialEvaluation.creditScoreLabel}
                  </span>
                } />
                <InfoRow label="Imputed Income" value={`₹${(r.financialEvaluation.imputedIncome / 100000).toFixed(2)}L / yr`} />
                {r.financialEvaluation.annualIncomeFromBSA && (
                  <InfoRow label="Income (Bank Statement)" value={`₹${(r.financialEvaluation.annualIncomeFromBSA / 100000).toFixed(2)}L / yr`} />
                )}
                {r.financialEvaluation.avgMonthlyInflow && (
                  <InfoRow label="Avg Monthly Inflow" value={`₹${r.financialEvaluation.avgMonthlyInflow.toLocaleString('en-IN')}`} />
                )}
              </div>
              <div>
                {r.financialEvaluation.incomeDeclared && (
                  <InfoRow label="Income Declared" value={`₹${(r.financialEvaluation.incomeDeclared / 100000).toFixed(2)}L / yr`} />
                )}
                <InfoRow label="Income Inconsistency" value={
                  <span className={r.financialEvaluation.incomeInconsistency !== 'none' ? 'text-amber-600 capitalize' : 'text-emerald-600'}>
                    {r.financialEvaluation.incomeInconsistency === 'none' ? 'None ✓' : r.financialEvaluation.incomeInconsistency}
                  </span>
                } />
                {r.financialEvaluation.bankName && (
                  <InfoRow label="Primary Bank" value={r.financialEvaluation.bankName} />
                )}
              </div>
            </div>
          </div>

          {/* ── Section 4: Lifestyle Analysis ───────────────────────────── */}
          <div className="px-8 py-6 border-b border-gray-100 print:border-gray-300">
            <SectionHead number={4} title="Lifestyle Analysis" risk={r.lifestyleAnalysis.riskLevel} />
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Tobacco / Smoking', flag: r.lifestyleAnalysis.tobaccoSpending },
                { label: 'Alcohol Consumption', flag: r.lifestyleAnalysis.alcoholSpending },
                { label: 'Gambling / Betting', flag: r.lifestyleAnalysis.gamblingTransactions },
              ].map(({ label, flag }) => (
                <div key={label} className={`rounded-xl border p-3 text-center ${flag ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${flag ? 'text-red-600' : 'text-emerald-600'}`}>{flag ? 'Detected ⚠' : 'Not Detected ✓'}</p>
                </div>
              ))}
            </div>
            {r.lifestyleAnalysis.flagDetails.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Observations</p>
                {r.lifestyleAnalysis.flagDetails.map((f, i) => (
                  <p key={i} className="text-xs text-amber-700">⚠ {f}</p>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 5: Medical Evaluation ───────────────────────────── */}
          <div className="px-8 py-6 border-b border-gray-100 print:border-gray-300">
            <SectionHead number={5} title="Medical Evaluation" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'BMI', value: r.medicalEvaluation.bmi ? `${r.medicalEvaluation.bmi}` : '—', sub: r.medicalEvaluation.bmiCategory ?? '', flag: (r.medicalEvaluation.bmi ?? 0) >= 30 },
                { label: 'Blood Pressure', value: r.medicalEvaluation.bloodPressureSystolic ? `${r.medicalEvaluation.bloodPressureSystolic}/${r.medicalEvaluation.bloodPressureDiastolic}` : '—', sub: r.medicalEvaluation.bpStatus ?? '', flag: r.medicalEvaluation.bpStatus === 'high' },
                { label: 'Pulse Rate', value: r.medicalEvaluation.pulseRate ? `${r.medicalEvaluation.pulseRate} bpm` : '—', sub: '', flag: (r.medicalEvaluation.pulseRate ?? 0) > 100 },
                { label: 'Face Biometrics', value: r.medicalEvaluation.faceBiometricsPass === null ? '—' : r.medicalEvaluation.faceBiometricsPass ? 'Pass' : 'Fail', sub: '', flag: r.medicalEvaluation.faceBiometricsPass === false },
              ].map(({ label, value, sub, flag }) => (
                <div key={label} className={`rounded-xl border p-3 text-center ${flag ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{label}</p>
                  <p className={`text-lg font-bold mt-1 ${flag ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
                  {sub && <p className="text-[10px] text-gray-500 capitalize">{sub}</p>}
                </div>
              ))}
            </div>

            {r.medicalEvaluation.labResults.length > 0 && (
              <>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-semibold">Laboratory Results</p>
                <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                      <th className="text-left px-3 py-2 font-semibold">Test</th>
                      <th className="text-right px-3 py-2 font-semibold">Value</th>
                      <th className="text-right px-3 py-2 font-semibold">Reference Range</th>
                      <th className="text-right px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.medicalEvaluation.labResults.map((lab, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-700">{lab.test}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">{lab.value} <span className="font-normal text-gray-400">{lab.unit}</span></td>
                        <td className="px-3 py-2 text-right text-gray-400">{lab.referenceRange}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${lab.status === 'normal' ? 'bg-emerald-50 text-emerald-700' : lab.status === 'low' ? 'bg-amber-50 text-amber-700' : lab.status === 'high' ? 'bg-red-50 text-red-700' : 'bg-red-100 text-red-900'}`}>
                            {lab.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {r.medicalEvaluation.radiologyResults.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-semibold">Radiology Results</p>
                <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                      <th className="text-left px-3 py-2 font-semibold">Investigation</th>
                      <th className="text-left px-3 py-2 font-semibold">Finding</th>
                      <th className="text-right px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.medicalEvaluation.radiologyResults.map((rad, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-700">{rad.test}</td>
                        <td className="px-3 py-2 text-gray-600">{rad.finding}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${rad.status === 'normal' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {rad.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Section 6: Consistency Check ────────────────────────────── */}
          <div className="px-8 py-6 border-b border-gray-100 print:border-gray-300">
            <SectionHead number={6} title="Consistency Check" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Face Match Score', value: r.consistencyCheck.faceMatchScore != null ? `${r.consistencyCheck.faceMatchScore.toFixed(2)}%` : '—', flag: (r.consistencyCheck.faceMatchScore ?? 100) < 85 },
                { label: 'Liveness Score', value: r.consistencyCheck.livenessScore != null ? `${r.consistencyCheck.livenessScore.toFixed(2)}%` : '—', flag: (r.consistencyCheck.livenessScore ?? 100) < 75 },
                { label: 'Document Consistency', value: r.consistencyCheck.documentConsistency.toUpperCase(), flag: r.consistencyCheck.documentConsistency === 'fail' },
                { label: 'Address Consistency', value: r.consistencyCheck.addressConsistency.toUpperCase(), flag: r.consistencyCheck.addressConsistency === 'fail' },
              ].map(({ label, value, flag }) => (
                <div key={label} className={`rounded-xl border p-3 text-center ${flag ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{label}</p>
                  <p className={`text-base font-bold mt-1 ${flag ? 'text-amber-600' : 'text-emerald-600'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 7: Litigation & FIR Check ──────────────────────── */}
          <div className="px-8 py-6 border-b border-gray-100 print:border-gray-300">
            <SectionHead number={7} title="Litigation & FIR Check" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total Cases', value: String(r.litigationCheck.totalCases), flag: r.litigationCheck.totalCases > 0 },
                { label: 'Civil Cases', value: String(r.litigationCheck.civilCases), flag: r.litigationCheck.civilCases > 0 },
                { label: 'Criminal Cases', value: String(r.litigationCheck.criminalCases), flag: r.litigationCheck.criminalCases > 0 },
              ].map(({ label, value, flag }) => (
                <div key={label} className={`rounded-xl border p-3 text-center ${flag ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${flag ? 'text-red-600' : 'text-emerald-600'}`}>{value}</p>
                </div>
              ))}
            </div>
            {r.litigationCheck.cases.length === 0 ? (
              <p className="text-sm text-emerald-600">✓ No litigation or FIR cases found</p>
            ) : (
              <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Court</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-right px-3 py-2">Year</th>
                    <th className="text-right px-3 py-2">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {r.litigationCheck.cases.map((c, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 capitalize font-medium text-gray-700">{c.type}</td>
                      <td className="px-3 py-2 text-gray-600">{c.court}</td>
                      <td className="px-3 py-2 text-gray-600">{c.description}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{c.year}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${c.severity === 'high' ? 'bg-red-100 text-red-700' : c.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {c.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Section 8: Fraud Check ──────────────────────────────────── */}
          <div className="px-8 py-6 border-b border-gray-100 print:border-gray-300">
            <SectionHead number={8} title="Fraud Check Analysis" />
            <div className="grid grid-cols-3 gap-3">
              {[
                ['IP Consistency', r.fraudCheck.ipConsistency],
                ['Device Fingerprint', r.fraudCheck.deviceFingerprint],
                ['PAN Database Check', r.fraudCheck.panDatabaseCrosscheck],
              ].map(([label, result]) => (
                <div key={label as string} className={`rounded-xl border p-3 flex items-center justify-between ${result === 'pass' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <span className="text-xs text-gray-600">{label as string}</span>
                  {chk(result as CheckResult)}
                </div>
              ))}
            </div>
            {r.fraudCheck.behavioralAnomaly && (
              <p className="mt-3 text-sm text-red-600 font-medium">⚠ Behavioral anomaly detected</p>
            )}
            {!r.fraudCheck.behavioralAnomaly && r.fraudCheck.flags.length === 0 && (
              <p className="mt-3 text-sm text-emerald-600">✓ No fraud indicators detected</p>
            )}
          </div>

          {/* ── Section 9: Insurance Portfolio ─────────────────────────── */}
          <div className="px-8 py-6 border-b border-gray-100 print:border-gray-300">
            <SectionHead number={9} title="Insurance Portfolio Summary" />
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Existing Policies', value: String(r.insurancePortfolio.existingPolicies.length), flag: false },
                { label: 'Prior Health Claims', value: String(r.insurancePortfolio.priorHealthClaims), flag: r.insurancePortfolio.priorHealthClaims > 0 },
                { label: 'Lapsed Policy', value: r.insurancePortfolio.hasLapsedPolicy ? 'Yes' : 'No', flag: r.insurancePortfolio.hasLapsedPolicy },
              ].map(({ label, value, flag }) => (
                <div key={label} className={`rounded-xl border p-3 text-center ${flag ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{label}</p>
                  <p className={`text-lg font-bold mt-1 ${flag ? 'text-amber-600' : 'text-gray-700'}`}>{value}</p>
                </div>
              ))}
            </div>
            {r.insurancePortfolio.existingPolicies.length > 0 && (
              <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Insurer</th>
                    <th className="text-right px-3 py-2">Sum Insured</th>
                    <th className="text-right px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {r.insurancePortfolio.existingPolicies.map((p, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-700">{p.type}</td>
                      <td className="px-3 py-2 text-gray-600">{p.insurer}</td>
                      <td className="px-3 py-2 text-right text-gray-700">₹{(p.sumInsured / 100000).toFixed(1)}L</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Section 10: UW Rule Engine ─────────────────────────────── */}
          <div className="px-8 py-6 rounded-b-2xl print:rounded-none">
            <SectionHead number={10} title="Underwriting Rule Engine" />
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-amber-600 uppercase tracking-widest font-semibold">Recommendation</p>
                  <p className="text-xl font-bold text-amber-900 mt-0.5">
                    {r.uwRecommendation.decision === 'load'
                      ? `Load Premium — ${r.uwRecommendation.loadingRange ?? `${r.uwRecommendation.loadingPercent}%`}`
                      : r.uwRecommendation.decision === 'decline' ? 'Decline Application' : 'Accept — Standard Terms'}
                  </p>
                </div>
                {r.uwRecommendation.loadingPercent != null && (
                  <div className="text-center shrink-0 bg-white border border-amber-200 rounded-xl px-5 py-3">
                    <p className="text-[10px] text-amber-600 uppercase tracking-widest">Suggested Loading</p>
                    <p className="text-3xl font-black text-amber-700">{r.uwRecommendation.loadingPercent}%</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-amber-700 font-semibold mb-2">Key Risk Triggers</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {r.uwRecommendation.keyTriggers.map((t, i) => (
                  <span key={i} className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full">⚠ {t}</span>
                ))}
              </div>
              <p className="text-xs text-amber-700 italic border-t border-amber-200 pt-3 mt-1">{r.uwRecommendation.notes}</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-teal-700 text-teal-200 text-center py-3 rounded-b-2xl print:rounded-none text-xs">
          <p>Generated by Perfios I-Adore · {r.reportDate} · For Underwriting Use Only — Confidential</p>
        </div>

      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}

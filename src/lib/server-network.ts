let insecureTlsConfigured = false

export function allowInsecureTlsIfEnabled() {
  if (insecureTlsConfigured) return
  insecureTlsConfigured = true

  if (process.env.NODE_ENV === 'production') return
  if (process.env.APP_ALLOW_INSECURE_TLS !== 'true') return
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') return

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  console.warn('[network] APP_ALLOW_INSECURE_TLS is enabled; outbound TLS certificate verification is disabled.')
}

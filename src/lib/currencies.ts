// Map ISO-3166 alpha-2 country codes → ISO-4217 currency, so a destination's
// currency can be inferred automatically from its location.
export const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR',
  PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', GR: 'EUR', FI: 'EUR', LU: 'EUR',
  NO: 'NOK', SE: 'SEK', DK: 'DKK', IS: 'ISK', CH: 'CHF', PL: 'PLN', CZ: 'CZK',
  HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'EUR', TR: 'TRY', RU: 'RUB', UA: 'UAH',
  JP: 'JPY', CN: 'CNY', KR: 'KRW', HK: 'HKD', TW: 'TWD', SG: 'SGD', MY: 'MYR',
  TH: 'THB', VN: 'VND', ID: 'IDR', PH: 'PHP', IN: 'INR', LK: 'LKR', NP: 'NPR',
  AE: 'AED', SA: 'SAR', QA: 'QAR', IL: 'ILS', EG: 'EGP', MA: 'MAD', ZA: 'ZAR',
  KE: 'KES', TZ: 'TZS', NG: 'NGN', AU: 'AUD', NZ: 'NZD', FJ: 'FJD',
  CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', PE: 'PEN', CO: 'COP',
  CR: 'CRC', PA: 'USD', EC: 'USD', UY: 'UYU', BO: 'BOB', GT: 'GTQ',
}

export const currencyFromCountry = (code?: string): string | undefined =>
  code ? COUNTRY_CURRENCY[code.toUpperCase()] : undefined

// Resolve a destination's currency, preferring an explicit override.
export const currencyForDestination = (d: { currency?: string; countryCode?: string }): string | undefined =>
  d.currency || currencyFromCountry(d.countryCode)

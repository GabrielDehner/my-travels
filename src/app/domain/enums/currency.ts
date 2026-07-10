/**
 * ISO-4217 currency codes. A reasonable subset covering common travel
 * destinations is sufficient for the MVP (design §2, `Money` value object).
 */
export type Currency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CNY'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'MXN'
  | 'BRL'
  | 'ARS'
  | 'CLP'
  | 'COP'
  | 'PEN'
  | 'INR'
  | 'THB'
  | 'VND'
  | 'KRW'
  | 'SGD'
  | 'NZD';

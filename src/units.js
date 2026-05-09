// Single source of truth for kg ⇌ lb conversion. Internal canonical = kg.

export const KG_PER_LB = 0.45359237

export const toKg = (value, unit) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return unit === 'lb' ? n * KG_PER_LB : n
}

export const fromKg = (kg, unit) => {
  if (kg == null || !Number.isFinite(kg)) return null
  return unit === 'lb' ? kg / KG_PER_LB : kg
}

const trim = (n) => {
  if (!Number.isFinite(n)) return ''
  // Round to 1 decimal, drop trailing .0
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** Format a weight for display. null → '—', 0 → 'BW', else 'NN kg' / 'NN lb'. */
export const formatWeight = (kg, unit = 'kg') => {
  if (kg == null || !Number.isFinite(kg)) return '—'
  if (kg === 0) return 'BW'
  const v = fromKg(kg, unit)
  return `${trim(v)} ${unit}`
}

/** Variant that returns just the number string, no unit suffix. */
export const formatNumber = (kg, unit = 'kg') => {
  if (kg == null || !Number.isFinite(kg)) return ''
  if (kg === 0) return '0'
  return trim(fromKg(kg, unit))
}

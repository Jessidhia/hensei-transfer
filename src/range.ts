export type NumberRange = `${number}` | `${number}-${number}`
export type NumberRanges = NumberRange | NumberRange[]

/**
 * Check if `value` fits between any of the given `ranges`, inclusive.
 *
 * Assumes string ranges are sorted.
 */
export function matches(range: NumberRanges, value: number) {
  return (Array.isArray(range) ? range : [range]).some((range) => {
    const [min, max] = parseRange(range)
    return value >= min && value <= max
  })

  function parseRange(range: NumberRange): [number, number] {
    const m = /^(\d+)(?:-(\d+))?$/.exec(range)!
    const m1 = parseInt(m[1], 10)
    return [m1, m[2] ? parseInt(m[2], 10) : m1]
  }
}

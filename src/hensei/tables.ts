import * as range from '../range.ts'
import type { HenseiWeaponKey } from './api.ts'

/** gbf id (- 1) to api id */
const elementMapping = [2, 3, 4, 1, 6, 5] as const

export function gbfAttrToApiId(attr: 1 | 2 | 3 | 4 | 5 | 6) {
  return elementMapping[attr - 1]
}

const axMapping = {
  1588: 7,
  1589: 0,
  1590: 1,
  1591: 3,
  1592: 4,
  1593: 9,
  1594: 13,
  1595: 10,
  1596: 5,
  1597: 6,
  1599: 8,
  1600: 12,
  1601: 11,
  1719: 15,
  1720: 16,
  1721: 17,
  1722: 14,
} as const

export function gbfAxToApiId(ax: string) {
  return axMapping[ax as unknown as keyof typeof axMapping]
}

const keyToSkillRangeMap = {
  // emblems (data missing)
  1: [],
  2: [],
  3: ['1050'],
  // pendulum
  13001: ['1240', '2204', '2208'],
  13002: ['1241', '2205', '2209'],
  13003: ['1242', '2206', '2210'],
  13004: ['1243', '2207', '2211'],
  14001: ['502-507', '1213-1218'],
  14002: ['130-135', '71-76'],
  14003: ['1260-1265', '1266-1271'],
  14004: ['1199-1204', '1205-1210'],
  // chain
  14011: ['322-327', '1310-1315'],
  14012: ['764-769', '1731-1735', '948'],
  14013: ['1171-1176', '1736-1741'],
  14014: '1723',
  14015: '1724',
  14016: '1725',
  14017: '1726',
  // gauph
  10001: '697-706',
  10002: '707-716',
  10003: '717-726',
  10004: '727-736',
  10005: '737-746',
  10006: '747-756',
  11001: '758',
  11002: '759',
  11003: '760',
  11004: '761',
  17001: '1807',
  17002: '1808',
  17003: '1809',
  17004: '1810',
  // teluma
  15001: '1446',
  15002: '1447',
  15003: '1448',
  15004: '1449',
  15005: '1450',
  15006: '1451',
  15007: '1452',
  // unknown
  16001: '1228-1233',
  16002: '1234-1239',
  15008: '2043-2048',
  15009: '2049-2055',
  // unsupported (providence?)
  14005: '2212-2223',
  14006: '2224-2235',
  14007: '2236-2247',
} satisfies Record<string, range.NumberRanges>

export function findKeyBySkillId(
  candidateKeys: readonly HenseiWeaponKey[],
  skillId: string,
) {
  const numSkillId = parseInt(skillId, 10)
  return candidateKeys.find((k) => {
    const skillRange =
      keyToSkillRangeMap[k.granblue_id as keyof typeof keyToSkillRangeMap]
    return skillRange && range.matches(skillRange, numSkillId)
  })
}

const seriesMap: Record<number, number[]> = {
  // emblems are all series 24, while some(?) CCW are series 19
  24: [19],
}
export function fixSeriesId(gbfSeriesId: number) {
  for (const [fixedId, badIds] of Object.entries(seriesMap)) {
    if (badIds.includes(gbfSeriesId)) {
      return parseInt(fixedId, 10)
    }
  }
  return gbfSeriesId
}

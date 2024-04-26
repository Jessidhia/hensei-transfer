import type { HenseiExport, SummonExport, WeaponExport } from './gbf_to_json.ts'
import * as range from './range.ts'

export default function convertToWiki(hensei: HenseiExport) {
  if (hensei.lang != 'en') {
    // we don't have access to gb.team API here
    // (even if we wanted to, we can't get the Bearer token from this origin)
    // TODO: check if the search API works anonymously
    alert('Please change your game to English before exporting.')
    return null
  }

  return `{{TeamSpread
|team=${get_team(hensei)}
|weapons=${get_grid(hensei)}
|summons=${get_summons(hensei)}
}}`
}

function get_team(obj: HenseiExport) {
  return `{{Team
|class=${obj.class.toLowerCase()}${
    obj.characters.map((ch, i) => {
      const n = i + 1
      const trans = ch.transcend ? `|trans${n}=${ch.transcend}` : ''
      const artId = ch.uncap == 6 ? 'D' : ch.uncap == 5 ? 'C' : ch.uncap > 2
        // technically incorrect for R/SR characters with only 3 gold stars but double-checking sucks
        ? 'B'
        : ''
      const art = artId ? `|art${n}=${artId}` : ''
      return `
|char${n}=${ch.name}${trans}${art}`
    }).join('')
  }${
    obj.subskills.map((ss, i) => {
      const n = i + 1
      if (ss == null) {
        return ''
      }

      return `
|skill${n}=${ss}`
    }).join('')
  }
|main=${obj.summons[0]?.name || ''}
|support=${obj.friend_summon || ''}
}}`
}

const awakenings = {
  'Attack': 'atk',
  'Defense': 'def',
  'Special': 'spec',
  'C.A.': 'ca',
  'Healing': 'heal',
  'Skill DMG': 'skill',
} as const
const draconic_provenance_names = new Set([
  'Refrain of Blazing Vigor',
  'Judgment of Torrential Tides',
  'Bounty of Gracious Earth',
  'Prayer of Grand Gales',
  'Radiance of Insightful Rebirth',
  'Festering of Mournful Obsequies',
])
const key_mappings = {
  // Opus and Ultima s2
  auto: ['1240', '758', '2204', '2208'],
  skill: ['1241', '759', '2205', '2209'],
  ougi: ['1242', '760', '2206', '2210'],
  cb: ['1243', '761', '2207', '2211'],

  // Opus s3 and some Ultima s1
  stamina: ['502-507', '1213-1218', '727-736'],
  enmity: ['130-135', '71-76', '737-746'],
  tirium: ['1260-1265', '1266-1271'],
  progression: ['1199-1204', '1205-1210'],

  // Belial Chains
  celere: ['322-327', '1310-1315'],
  majesty: ['764-769', '1731-1735', '948'],
  glory: ['1171-1176', '1736-1741'],
  freyr: '1723',
  apple: '1724',
  depravity: '1725',
  echo: '1726',

  // Super Faa Keys
  extremity: '2212-2223',
  sagacity: '2224-2235',
  supremacy: '2236-2247',

  // Ultima s1
  atk: '697-706',
  ma: '707-716',
  hp: '717-726',
  crit: '747-756',

  // Ultima s3
  cap: '1807',
  healing: '1808',
  seraphic: '1809',
  cbgain: '1810',

  // Draconic s2
  def: '1446',
  fire: '1447',
  water: '1448',
  earth: '1449',
  wind: '1450',
  light: '1451',
  dark: '1452',
  fortitude: '2043-2048',
  magnitude: '2049-2055',

  // Draconic s3
  primal: '1228-1233',
  magna: '1234-1239',
} satisfies Record<string, range.NumberRanges>
const elements = ['Fire', 'Water', 'Earth', 'Wind', 'Light', 'Dark'] as const

function get_grid(obj: HenseiExport) {
  let str = '{{WeaponGridSkills'

  let opus: WeaponExport | undefined,
    draconic: WeaponExport | undefined,
    ultima: WeaponExport | undefined

  for (const [i, wp] of obj.weapons.entries()) {
    const main = i == 0
    const w = main ? 'mh' : ('wp' + i)
    const u = main ? 'umh' : ('u' + i)

    str += '\n|' + w + '=' + wp.name
    if (wp.attr) {
      str += ' (' + elements[wp.attr - 1] + ')'
    }

    const uncap = wp.transcend ? `t${wp.transcend}` : wp.uncap
    str += '|' + u + '=' + uncap

    if (wp.awakening) {
      const a = main ? 'awkmh' : ('awk' + i)
      str += '|' + a + '=' +
        awakenings[wp.awakening.type as keyof typeof awakenings]
    }

    if (wp.keys) {
      if (wp.name.includes('Ultima')) {
        ultima = wp
      } else if (wp.name.includes('iation')) {
        opus = wp
      } else if (
        wp.name.includes('Draconic') ||
        draconic_provenance_names.has(wp.name)
      ) {
        draconic = wp
      }
    }
  }

  str += get_keys(opus, 'opus')
  str += get_keys(draconic, 'draconic')
  str += get_keys(ultima, 'ultima')

  str += '\n}}'
  return str
}

function get_keys(
  wp: WeaponExport | undefined,
  type: 'opus' | 'draconic' | 'ultima',
) {
  if (!wp || !wp.keys) {
    return ''
  }

  return `
|${type}=${
    wp.keys.filter(defined).map((key) => map_key_id(parseInt(key, 10))).join(
      ',',
    )
  }`

  function map_key_id(id: number) {
    const match = Object.entries(key_mappings).find(([, ranges]) =>
      range.matches(ranges, id)
    )
    return match?.[0] || 'UNKNOWN'
  }

  function defined<T>(v: T | null | undefined): v is T {
    return v != null
  }
}

function get_summons(obj: HenseiExport) {
  let str = '{{SummonGrid'
  let quick = -1

  for (const [i, sm] of obj.summons.entries()) {
    const s = i == 0 ? 'main' : ('s' + i)
    const u = i == 0 ? 'umain' : ('u' + i)
    const a = i == 0 ? 'main' : i
    const art = summon_art_key(sm)

    str += '\n|' + s + '=' + sm.name
    str += '|' + u + '=' + summon_uncap_lvl(sm)
    str += art ? `|art${a}=${art}` : ''

    if (sm.qs) {
      quick = i
    }
  }

  for (const [i, sm] of obj.sub_summons.entries()) {
    const n = i + 1
    const s = `sub${n}` as const
    const u = `usub${n}`
    const art = summon_art_key(sm)

    str += '\n|' + s + '=' + sm.name
    str += '|' + u + '=' + summon_uncap_lvl(sm)
    str += art ? `|art${n}=${art}` : ''
  }

  if (quick > -1) {
    str += '\n|quick=' + (quick == 0 ? 'main' : quick)
  }

  str += '\n}}'
  return str
}

const uncaps = ['0mlb', '1mlb', '2mlb', 'mlb', 'flb', 'ulb', 'trans'] as const

function summon_uncap_lvl(sm: SummonExport) {
  const u = sm.uncap
  let str = uncaps[u]

  if (sm.transcend) {
    str += sm.transcend
  }

  return str
}

const summon_art_changes = {
  'Colossus Omega': 4,
  'Leviathan Omega': 4,
  'Yggdrasil Omega': 4,
  'Tiamat Omega': 4,
  'Luminiera Omega': 4,
  'Celeste Omega': 4,
  'Agni': 5,
  'Varuna': 5,
  'Titan': 5,
  'Zephyrus': 5,
  'Zeus': 5,
  'Hades': 5,
} as const

function summon_art_key(sm: SummonExport) {
  if (sm.transcend) {
    return sm.transcend == 5 ? 'D' : 'C'
  }

  if (sm.name in summon_art_changes) {
    return sm.uncap >=
        summon_art_changes[sm.name as keyof typeof summon_art_changes]
      ? 'B'
      : ''
  }

  return ''
}

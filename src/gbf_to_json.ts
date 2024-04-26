import type {
  GranblueGame,
  GranblueNPCTable,
  GranblueSubskill,
  GranblueSubsummonTable,
  GranblueSummonTable,
  GranblueWeaponTable,
} from './gbf.ts'

export interface HenseiExport {
  lang: 'en' | 'ja'
  /** User-set name or localized default */
  name: string
  /** NOTE: localized */
  class: string
  /** party set extra */
  extra: boolean
  /**
   * NOTE: localized
   *
   * selected in damage simulator
   */
  friend_summon: string
  accessory: number | null
  /** Subskill by localized name, or null if unset */
  // TODO: just don't insert nulls
  subskills: (string | null)[]
  characters: NPCExport[]
  weapons: WeaponExport[]
  summons: SummonExport[]
  sub_summons: SummonExport[]
}

export default function exportHensei(
  { view: { deck_model: { attributes: { deck: { name, pc, npc } } } }, lang }:
    GranblueGame,
): HenseiExport {
  return {
    lang,
    name,
    class: pc.job.master.name,
    extra: pc.isExtraDeck,
    friend_summon: pc.damage_info.summon_name,
    accessory: pc.familiar_id || pc.shield_id,
    subskills: parseSubskills(pc.set_action),
    characters: parseNPCs(npc),
    weapons: parseWeapons(pc.weapons),
    summons: parseSummons(pc.summons, pc.quick_user_summon_id),
    sub_summons: parseSummons(pc.sub_summons),
  }
}

function parseSubskills(set_action: [...(GranblueSubskill | [])[]]) {
  return set_action.map((ac) => 'name' in ac ? ac.name : null)
}

interface NPCExport {
  /** NOTE: localized, matches skin-specific name (e.g. Mina instead of Levin Sisters) */
  name: string
  id: `${number}`
  uncap: 0 | 1 | 2 | 3 | 4 | 5 | 6
  ringed?: boolean
  transcend?: 1 | 2 | 3 | 4 | 5
}

function parseNPCs(npcList: GranblueNPCTable) {
  return Object.values(npcList).filter(notNullParam).map(
    ({ master, param }) => {
      const out: NPCExport = {
        name: master.name,
        id: master.id,
        uncap: parseInt(param.evolution, 10) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      }

      if (param.has_npcaugment_constant) {
        out.ringed = true
      }

      const trans = parseInt(param.phase, 10) as 0 | 1 | 2 | 3 | 4 | 5
      if (trans > 0) {
        out.transcend = trans as Exclude<0, typeof trans>
      }

      return out
    },
  )
}

export interface WeaponExport {
  /** NOTE: localized */
  name: string
  // BREAKING: export was off-by-one (0 to 5) up to version 19
  attr?: 1 | 2 | 3 | 4 | 5 | 6
  /** Normalized to remove the influence of attr selection */
  id: `${number}`
  uncap: 0 | 1 | 2 | 3 | 4 | 5
  transcend?: 1 | 2 | 3 | 4 | 5
  awakening?: {
    /** NOTE: localized */
    type: string
    lvl: number
  }
  ax?: { id: string; val: string }[]
  /** These are **skill** ids, not key ids */
  keys?: [string, string?, string?]
}

function parseWeapons(weapons: GranblueWeaponTable) {
  // no direct info about this in the Game state so hardcode thresholds
  const uncaps = [40, 60, 80, 100, 150, 200]
  const transcendences = [210, 220, 230, 240]
  // list of keyable weapon series, per keyable skill slot
  const keyableSeries: [number[], number[], number[]] = [
    [13],
    [3, 13, 19, 27, 40],
    [3, 13, 27, 40],
  ]
  // list of weapons with selectable element on crafting
  const multielementSeries = [13, 17, 19]
  return Object.values(weapons).filter(notNullParam)
    .map(
      ({ master, param, ...rest }) => {
        const id = parseInt(master.id, 10)
        const series = parseInt(master.series_id, 10)
        const attr = parseInt(master.attribute, 10) as 1 | 2 | 3 | 4 | 5 | 6
        const multielement = multielementSeries.includes(series)
        const lvl = parseInt(param['level'], 10)
        const uncap = uncaps.reduce(
          (uncap, uncapLvl) => lvl > uncapLvl ? uncap + 1 : uncap,
          0,
        ) as 0 | 1 | 2 | 3 | 4 | 5

        const out: WeaponExport = {
          name: master.name,
          attr: multielement ? attr : undefined,
          id: multielement ? `${id - ((attr - 1) * 100)}` : master.id,
          uncap,
        }

        if (uncap > 5) {
          out.transcend = transcendences.reduce(
            (trans, transLvl) => lvl > transLvl ? trans + 1 : trans,
            1,
          ) as 1 | 2 | 3 | 4 | 5
        }

        const { arousal } = param
        if (arousal.is_arousal_weapon && arousal.form_name) {
          out.awakening = {
            type: arousal.form_name,
            lvl: arousal.level,
          }
        }

        const augment = param.augment_skill_info
        if (augment.length != 0) {
          const actualAugment = augment[0]
          out.ax = actualAugment.map(({ skill_id, show_value }) => ({
            id: `${skill_id}`,
            val: show_value,
          }))
        }

        const keys: string[] = []
        for (const [i, ids] of keyableSeries.entries()) {
          if (ids.includes(series)) {
            const key = `skill${i + 1 as 1 | 2 | 3}` as const
            if (rest[key]) {
              keys.push(rest[key]!.id)
            }
          }
        }
        if (keys.length > 0) {
          out.keys = keys as [string]
        }

        return out
      },
    )
}

export interface SummonExport {
  /** NOTE: localized */
  name: string
  id: string
  uncap: 0 | 1 | 2 | 3 | 4 | 5 | 6
  transcend?: 1 | 2 | 3 | 4 | 5
  qs?: boolean
}

function parseSummons(
  summons: GranblueSummonTable | GranblueSubsummonTable,
  qsID?: number | null,
) {
  const transcendences = [210, 220, 230, 240]

  return Object.values(summons).filter(notNullParam).map(
    ({ master, param }) => {
      const uncap = parseInt(param['evolution'], 10) as
        | 0
        | 1
        | 2
        | 3
        | 4
        | 5
        | 6

      const out: SummonExport = {
        name: master.name,
        id: master.id,
        uncap,
      }
      if (uncap > 5) {
        const lvl = parseInt(param.level, 10)
        out.transcend = transcendences.reduce(
          (trans, transLvl) => lvl > transLvl ? trans + 1 : trans,
          1,
        ) as 1 | 2 | 3 | 4 | 5
      }

      if (qsID && param.id == `${qsID}`) {
        out.qs = true
      }

      return out
    },
  )
}

// deno-lint-ignore ban-types
function notNullParam<T, U, V extends object = {}>(
  value: { master: T | null; param: U | null } & V,
): value is { master: T; param: U } & V {
  return (value.master !== null && value.param !== null)
}

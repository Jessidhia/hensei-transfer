declare const Game: GranblueGame

export default function getGame() {
  return Game
}

export interface GranblueGame {
  lang: 'en' | 'ja'
  view: {
    deck_model: {
      attributes: {
        deck: {
          name: string
          pc: GranbluePlayerCharacter
          npc: GranblueNPCTable
        }
      }
    }
    expectancyDamageData: {
      evolution: number
      imageId: GranblueImageId
      summonId: number
    }
  }
}

// TODO: parse art from this and attach to export
export type GranblueImageId = `${number}` | `${number}_${'02' | '03' | '04'}`

export interface GranbluePlayerCharacter
  extends GranblueGrid, GranblueSkinInfo {
  job: {
    master: {
      /** NOTE: localized */
      name: string
      id: `${number}`
    }
  }
  param: {
    // image shown in the banner, corresponds to current skin
    image: `${number}_${string}_1_01`
  }
  /** Manatura (Manadiver only) */
  familiar_id: number | null
  /** Shield (Paladin only) */
  shield_id: number | null
  /** length depends on class; missing subskills are empty array thanks to PHP */
  set_action: [GranblueSubskill | []] | [
    // PHP moment
    GranblueSubskill | [],
    GranblueSubskill | [],
    GranblueSubskill | [],
  ]
}

// actually part of GranbluePlayerCharacter, just split for readability
interface GranblueGrid {
  isExtraDeck: boolean
  /** damage simulator config */
  damage_info: {
    /**
     * NOTE: localized
     *
     * selected in damage simulator
     */
    summon_name: string
  }
  weapons: GranblueWeaponTable
  summons: GranblueSummonTable
  sub_summons: GranblueSubsummonTable
  quick_user_summon_id: number | null
  weapon_open_flag_list: {
    is_open_weapon_11: boolean
    is_open_weapon_12: boolean
    is_open_weapon_13: boolean
  }
}

// actually part of GranbluePlayerCharacter, just split for readability
interface GranblueSkinInfo {
  skin_familiar_id: number | null
  skin_shield_id: number | null
  skin_weapon_id: `${number}` | null
  skin_weapon_id_2: `${number}` | null
  skin_summon_id: `${number}` | null
  skin_summon_pose: `${0 | 2 | 3 | 4}` | null
}

export interface GranblueSubskill {
  /** NOTE: localized */
  name: string
  set_action_id: `${number}`
}

export type GranblueNPCTable = Record<'1' | '2' | '3' | '4' | '5', GranblueNPC>

export interface GranblueNPC {
  master: {
    /** NOTE: localized, matches skin-specific name (e.g. Mina instead of Levin Sisters) */
    name: string
    id: `${number}`
    image_id: null
  } | null
  param: {
    level: `${number}`
    evolution: `${0 | 1 | 2 | 3 | 4 | 5 | 6}`
    /** Permanent Mastery */
    // sadly no data on other masteries
    has_npcaugment_constant: boolean
    phase: `${number}`
    cjs_name: `npc_${GranblueImageId}`
    image_id_3: GranblueImageId
  } | null
}

export type GranblueWeaponTable =
  & Record<
    | '1'
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10',
    GranblueWeapon
  >
  & (
    // Only present when isExtraDeck is true
    | Record<'11' | '12' | '13', GranblueWeapon>
    | Record<'11' | '12' | '13', never>
  )

export interface GranblueWeapon {
  master: {
    /** NOTE: localized */
    name: string
    id: `${number}`
    series_id: `${number}`
    attribute: `${1 | 2 | 3 | 4 | 5 | 6}`
  } | null
  param: {
    level: string
    // any of the non-boolean fields are null on not-yet-awakened weapons,
    // only form_name nulled for convenience otherwise every field needs checking or asserting
    arousal: {
      is_arousal_weapon: boolean
      form: number
      /** NOTE: localized */
      form_name: string | null
      level: number
      /** Awakening type (only primary skill) */
      skill: [] | [
        {
          /** NOTE: localized */
          name: string
          // perhaps the string can be used for a more reliable awakening type?
          image: `ex_skill_${string}_ex`
          skill_id: number
          effect_value: number
        },
      ]
      /** Each awakening bonus */
      total_acquired_bonus: {
        name: string
        effect_value: number
        level: `${number}`
        status_id: `${number}`
      }[]
    }
    // perhaps the image can be used for a more reliable AX type?
    augment_skill_icon_image: `ex_skill_${string}`[]
    augment_skill_info: [{ skill_id: number; show_value: string }[]] | []
    /** Inventory ID */
    id: number
    /** Not the skin ID */
    image_id: `${number}`
  } | null
  skill1: WeaponSkillInfo | null
  skill2: WeaponSkillInfo | null
  skill3: WeaponSkillInfo | null
}

interface WeaponSkillInfo {
  id: `${string}`
  /** NOTE: localized */
  name: string
}

export type GranblueSummonTable = Record<
  '1' | '2' | '3' | '4' | '5',
  GranblueSummon
>
export type GranblueSubsummonTable = Record<'1' | '2', GranblueSummon>

export interface GranblueSummon {
  master: {
    name: string
    /** Summon type id */
    id: `${number}`
  }
  param: {
    evolution: `${0 | 1 | 2 | 3 | 4 | 5 | 6}`
    level: `${number}`
    /** Inventory id */
    id: `${number}`
    image_id: GranblueImageId
  }
}

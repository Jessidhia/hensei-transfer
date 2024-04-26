import * as api from './net.ts'
import * as nextdata from './nextdata.ts'
import * as tables from './tables.ts'

export { hasToken } from './net.ts'

export interface HenseiParty {
  /** UUID */
  id: string
  /**
   * - `1` public
   * - `2` unlisted
   * - `3` private
   *
   * @default 1
   */
  visibility: 1 | 2 | 3
  name: string | null
  accessory: HenseiAccessory | null
  extra: boolean
  full_auto: boolean
  auto_guard: boolean
  auto_summon: boolean
  charge_attack: boolean
  /** party canonical URL: `/p/${shortcode}` */
  shortcode: string
  guidebooks: Record<'1' | '2' | '3', null>
  job: HenseiJob
  job_skills: Record<'0' | '1' | '2' | '3', HenseiJobSkill | null>
  summons: HenseiGridSummon[]
  weapons: HenseiGridWeapon[]
}

export function createParty(initial: Partial<Omit<HenseiParty, 'id'>> = {}) {
  return api.post<{ party: HenseiParty }>('parties', initial)
}

export interface HenseiPartyCharacter extends HenseiEntity {
  awakening: { level: number; type: HenseiEntity }
  object: HenseiCharacter
  perpetuity: boolean
  position: 0 | 1 | 2 | 3 | 4
  uncap_level: 0 | 1 | 2 | 3 | 4 | 5 | 6
  transcendence_step?: 1 | 2 | 3 | 4 | 5
}

interface HenseiPartyWeapon {
  grid_weapon: HenseiGridWeapon
}

export interface HenseiGridWeapon extends Omit<HenseiEntity, 'name'> {
  object: HenseiWeapon
  /** Only when position is -1 */
  mainhand: boolean
  /** position seems to always be off-by-one */
  position: -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
  uncap_level: 0 | 1 | 2 | 3 | 4 | 5 | 6
  transcendence_step: 0 | 1 | 2 | 3 | 4 | 5
  ax: { modifier: number; strength: number }[]
  awakening: { level: number; type: HenseiEntity }
  weapon_keys?: HenseiWeaponKey[]
}

interface HenseiPartySummon {
  grid_summon: HenseiGridSummon
}

export interface HenseiGridSummon extends Omit<HenseiEntity, 'name'> {
  object: HenseiSummon
  /** Only when position is -1 */
  main: boolean
  /** Only when position is 6 */
  friend: boolean
  position: -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6
  quick_summon: boolean
  uncap_level: 0 | 1 | 2 | 3 | 4 | 5 | 6
  transcendence_step: 0 | 1 | 2 | 3 | 4 | 5
}

export async function addAndFixConflicts(
  namespace: 'weapons',
  pos: number,
  data: {
    weapon: {
      /** UUID */
      weapon_id: string
      /** UUID */
      party_id: string
    } & Partial<Omit<HenseiGridWeapon, 'object'>>
  },
): Promise<HenseiPartyWeapon>
export async function addAndFixConflicts(
  namespace: 'summons',
  pos: number,
  data: {
    summon: {
      /** UUID */
      summon_id: string
      /** UUID */
      party_id: string
    } & Partial<Omit<HenseiGridSummon, 'object'>>
  },
): Promise<HenseiPartySummon>
export async function addAndFixConflicts(
  namespace: 'characters',
  pos: number,
  data: {
    character: {
      /** UUID */
      character_id: string
      /** UUID */
      party_id: string
    } & Partial<Omit<HenseiPartyCharacter, 'object'>>
  },
): Promise<HenseiPartyCharacter>
export async function addAndFixConflicts<T>(
  namespace: string,
  pos: number,
  data: object,
): Promise<T> {
  const obj = await api.post<
    { conflicts: { id: string }[]; incoming: { id: string } } | T
  >(namespace, data)

  if (obj && typeof obj === 'object' && 'conflicts' in obj) {
    return api.post(`${namespace}/resolve`, {
      resolve: {
        conflicting: [obj.conflicts[0].id],
        incoming: obj.incoming.id,
        position: pos,
      },
    })
  }

  return obj
}

export function update(
  namespace: 'parties',
  uuid: string,
  subNs: 'job_skills',
  data: { party: Partial<Record<`skill${1 | 2 | 3}_id`, string>> },
): Promise<Pick<HenseiParty, 'id' | 'job' | 'job_skills'>>
export function update(
  namespace: 'parties',
  uuid: string,
  subNs: 'jobs',
  data: { party: { job_id: string } },
): Promise<Pick<HenseiParty, 'id' | 'job' | 'job_skills'>>
export function update(
  namespace: 'parties',
  uuid: string,
  subNs: '',
  // add as needed...
  data: { party: { accessory_id: string } },
): Promise<HenseiParty>
export function update(
  namespace: 'grid_characters',
  uuid: string,
  subNs: '',
  data: {
    character: Partial<Omit<HenseiPartyCharacter, 'id' | 'name' | 'object'>>
  },
): Promise<HenseiPartyCharacter>
export function update(
  namespace: 'grid_weapons',
  uuid: string,
  subNs: '',
  data: {
    weapon: Partial<
      Omit<
        HenseiGridWeapon,
        'id' | 'name' | 'object' | 'ax' | 'awakening' | 'weapon_keys'
      > & {
        awakening_id: string
        awakening_level: number
        weapon_key1_id: string
        weapon_key2_id: string
        weapon_key3_id: string
        ax_modifier1: number
        ax_strength1: number
        ax_modifier2: number
        ax_strength2: number
      }
    >
  },
): Promise<HenseiGridWeapon>
export function update<T>(
  namespace: string,
  uuid: string,
  subNs: string,
  data: object,
) {
  return api.put<T>(namespace, uuid, subNs, data)
}

export function updateUncap<T>(
  namespace: 'weapons',
  uuid: string,
  level: number,
  trans?: number,
): Promise<{ weapon: HenseiPartyWeapon }>
export function updateUncap<T>(
  namespace: 'summons',
  uuid: string,
  level: number,
  trans?: number,
): Promise<{ summon: HenseiPartySummon }>
export function updateUncap<T>(
  namespace: string,
  uuid: string,
  level: number,
  trans?: number,
): Promise<T> {
  return api.post(`${namespace}/update_uncap`, {
    [namespace.slice(0, -1)]: {
      id: uuid,
      'uncap_level': trans ? 6 : level,
      'transcendence_step': trans || 0,
    },
  })
}

interface SearchEntityTypeMap {
  job_skills: HenseiJobSkill
  characters: HenseiCharacter
  weapons: HenseiWeapon
  summons: HenseiSummon
  // keys and accessories use different endpoints, don't go on this map
}

export interface HenseiJob extends HenseiEntity {
  granblue_id: `${number}`
  accessory: boolean
  accessory_type: 1 | 2
  row: '1' | '2' | '3' | '4' | '5' | 'ex1' | 'ex2'
}

export interface HenseiJobSkill extends HenseiEntity {
  granblue_id: `${number}`
  job: HenseiJob
  color: 0 | 1 | 2 | 3 | 4
  emp: boolean
  sub: boolean
}
export interface HenseiCharacter extends HenseiEntity {
  granblue_id: `${number}`
  character_id: number[]
  // no max_level
  /** Missing 'transcendence' info */
  uncap: Record<'flb' | 'ulb', boolean>
}
export interface HenseiWeapon extends HenseiEntity {
  granblue_id: `${number}`
  series: number
  awakenings: HenseiEntity[]
  max_level: number
  uncap: Record<'flb' | 'ulb' | 'transcendence', boolean>
}
export interface HenseiSummon extends HenseiEntity {
  granblue_id: `${number}`
  max_level: number
  uncap: Record<'flb' | 'ulb' | 'transcendence', boolean>
}

export interface HenseiEntity {
  /** UUID */
  id: string
  name: { en: string; ja: string }
}

export function searchByExactName<
  TEntity extends keyof SearchEntityTypeMap,
>(
  endpoint: TEntity,
  name: string,
  lang: 'en' | 'ja',
  extra: {
    job?: string
  } = {},
) {
  return api.searchOne<SearchEntityTypeMap[TEntity]>(
    endpoint,
    { query: name, locale: lang, ...extra },
    (entry) => entry.name[lang] === name,
  )
}

export function searchByGranblueId<
  TEntity extends keyof SearchEntityTypeMap,
>(
  endpoint: TEntity,
  granblueId: string,
  query: {
    query: string
    locale: 'en' | 'ja'
    job?: string
  },
) {
  return api.searchOne<SearchEntityTypeMap[TEntity]>(
    endpoint,
    query,
    (entry) => entry.granblue_id === granblueId,
  )
}

export interface HenseiAccessory extends HenseiEntity {
  granblue_id: `${number}`
}

export async function findJobAccessoryById(jobId: string, granblueId: number) {
  // no context data for this one :(
  const strId = `${granblueId}`
  return (await api.get<HenseiAccessory[]>(
    `jobs/${jobId}/accessories`,
  )).find((a) => a.granblue_id === strId)
}

export interface HenseiWeaponKey extends HenseiEntity {
  granblue_id: number
  order: number
  series: number[]
  slot: number
}

export async function findWeaponKeyBySkillId(
  skillId: string,
  series?: number | nextdata.KeySeries,
  slot?: 0 | 1 | 2,
) {
  const local = nextdata.findWeaponKeyBySkillId(skillId, series, slot)
  if (local) {
    return local
  }
  return typeof series === 'number'
    ? tables.findKeyBySkillId(
      await listWeaponKeysBySeriesAndSlot(tables.fixSeriesId(series), slot),
      skillId,
    )
    // TODO: find out if there's a query that can be done to fetch this
    : undefined
}

// deno-lint-ignore require-await
export async function listWeaponKeysBySeriesAndSlot(
  series: number,
  slot?: 0 | 1 | 2,
) {
  const params = new URLSearchParams({
    series: `${tables.fixSeriesId(series)}`,
  })
  if (slot !== undefined) params.append('slot', `${slot}`)

  const list = nextdata.gatherWeaponKeysBySeries(series, slot)
  return list.length > 0 ? list : api.get<
    HenseiWeaponKey[]
  >(
    `weapon_keys?${params.toString()}`,
  )
}

export function findJobSkillByExactName(
  name: string,
  lang: 'en' | 'ja',
  jobId: string,
) {
  // TODO: networked fallback
  return nextdata.findJobSkill(name, lang, jobId)
}

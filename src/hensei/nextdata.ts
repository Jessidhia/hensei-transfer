import type {
  HenseiJob,
  HenseiJobSkill,
  HenseiParty,
  HenseiWeaponKey,
} from './api.ts'
import * as tables from './tables.ts'

declare const __NEXT_DATA__: {
  props: {
    pageProps: { context: Partial<HenseiPageContext> }
  }
}

export function hasContextStaticData() {
  const ctx = getContext()
  return !ctx || !ctx.jobSkills || !ctx.jobs || !ctx.weaponKeys
}

function getContext() {
  return __NEXT_DATA__.props.pageProps.context
}

export function findJobSkill(
  skillName: string,
  lang: 'en' | 'ja',
  jobId?: string,
) {
  return getContext().jobSkills?.find(
    jobId
      ? ((skill) => skill.job.id === jobId && skill.name[lang] === skillName)
      : ((skill) => skill.name[lang] === skillName),
  )
}

export function findJob(jobName: string, lang: 'en' | 'ja') {
  return getContext().jobs?.find((job) => job.name[lang] === jobName)
}

export type KeySeries = keyof HenseiPageContext['weaponKeys']

export function findWeaponKeyBySkillId(
  skillId: string,
  series?: number | KeySeries,
  slot?: 0 | 1 | 2,
) {
  return tables.findKeyBySkillId(
    gatherWeaponKeysBySeries(series, slot),
    skillId,
  )
}

export function gatherWeaponKeysBySeries(
  series?: number | KeySeries,
  slot?: 0 | 1 | 2,
) {
  const keyData = getContext().weaponKeys
  if (!keyData) return []

  const fixedSeriesId = typeof series === 'number'
    ? tables.fixSeriesId(series)
    : 0

  const candidates = typeof series === 'string'
    ? keyData[series]
    : typeof series === 'number'
    ? Object.values(keyData).flat().filter((key) =>
      key.series.includes(fixedSeriesId!)
    )
    : Object.values(keyData).flat()

  return slot === undefined
    ? candidates
    : candidates.filter((key) => key.slot == slot)
}

interface HenseiPageContext {
  jobSkills: readonly HenseiJobSkill[]
  jobs: readonly HenseiJob[]
  party: HenseiParty
  weaponKeys: Record<
    'chain' | 'emblem' | 'gauph' | 'pendulum' | 'providence' | 'teluma',
    readonly HenseiWeaponKey[]
  >
}

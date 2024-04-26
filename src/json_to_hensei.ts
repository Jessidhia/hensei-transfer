import type { HenseiExport } from './gbf_to_json.ts'
import * as clipboard from './clipboard.ts'
import * as tables from './hensei/tables.ts'
import * as api from './hensei/api.ts'

export default async function importHensei() {
  const { context: data } = __NEXT_DATA__.props.pageProps

  if (data == null) {
    alert('Please refresh the page to load important data, then try again.')
    return
  }

  // TODO: port to an api.search() call?
  if (data.jobs == undefined) {
    alert(
      'Some data needed to create a team is missing, please open a team that already exists and press F5, and then run the script again. This will not overwrite your team. You can offset this by bookmarking the New team page and running the script from there.',
    )
    return
  }

  if (!api.hasToken()) {
    alert(
      'This import script only works for logged-in users, please log-in or create an account.',
    )
    return
  }

  const userString = clipboard.prompt()
  if (!userString || userString.length == 0) {
    return
  }

  const input: HenseiExport = JSON.parse(userString)

  document.body.style.setProperty('cursor', 'wait', 'important')
  const header = document.querySelector('nav[class^="Header_header__"]')
  const notice = document.createElement('span')
  notice.style.cssText = 'color: cyan; font-size: 22px;'
  notice.innerText = 'Loading your team... this may take a bit'
  header?.insertBefore(notice, header?.lastElementChild)

  let partyId!: string
  try {
    const { party } = await api.createParty({
      name: input.name,
      extra: input.extra,
      visibility: 2,
    })
    partyId = party.id

    await Promise.all([
      updateJob(),
      updateChars(),
      updateWeapons(),
      updateSummons(input['friend_summon'], input['summons'], 0),
      updateSummons(undefined, input['sub_summons'], 5),
    ])

    document.body.style.cursor = ''
    notice.remove()
    location.assign(`/p/${party.shortcode}`)
  } catch (e) {
    notice.style.color = 'red'
    notice.innerText = 'An error occurred, check browser console'
    throw e
  }

  async function updateJob() {
    const { class: name, subskills, accessory } = input
    const id = data.jobs.find((j) => j.name[input.lang] === name)?.id

    const pending = new Set<Promise<void>>()

    if (id) {
      await api.update('parties', partyId, 'jobs', { party: { job_id: id } })

      if (subskills.length > 0) {
        const ssIds = await Promise.all(
          subskills.map(async (ssName) =>
            ssName && (await api.searchByExactName(
              'job_skills',
              ssName,
              input.lang,
              { job: id },
            ))?.id
          ),
        )

        const subskillsObj: Partial<Record<`skill${1 | 2 | 3}_id`, string>> = {}
        for (
          const [i, id] of ssIds.filter(
            (val): val is string => !!val,
          )
            .entries()
        ) {
          subskillsObj[`skill${i + 1 as 1 | 2 | 3}_id`] = id
        }

        pending.add(api.update(
          'parties',
          partyId,
          'job_skills',
          {
            party: subskillsObj,
          },
          // very strange, any promise should be assignable to Promise<void>
        ) as Promise<unknown> as Promise<void>)
      }

      if (accessory) {
        const accId = (await api.findJobAccessoryById(id, accessory))?.id
        if (accId) {
          pending.add(api.update('parties', partyId, '', {
            party: { accessory_id: accId },
          }) as Promise<unknown> as Promise<void>)
        }
      }
    }

    await pending
  }

  async function updateChars() {
    const { characters: chars } = input

    const pending = new Set<Promise<void>>()
    // TODO: parallelize
    for (
      const [i, { name: chName, id: gbId, uncap, ringed = false, transcend }]
        of chars.entries()
    ) {
      const chId = (await api.searchByGranblueId(
        'characters',
        gbId,
        { query: chName, locale: input.lang },
      ))?.id

      if (chId) {
        pending.add(api.addAndFixConflicts(
          'characters',
          i,
          {
            character: {
              character_id: chId,
              party_id: partyId,
              position: i as 0,
              perpetuity: ringed,
              uncap_level: transcend ? 6 : uncap as 0,
              transcendence_step: transcend,
            },
          },
        ) as Promise<unknown> as Promise<void>)
      }
    }

    await Promise.all(pending)
  }

  async function updateWeapons() {
    const { weapons } = input

    const pending = new Set<Promise<void>>()

    for (
      const [
        i,
        { name: wpName, id: gbId, uncap, attr, transcend, awakening, keys, ax },
      ] of weapons.entries()
    ) {
      const wpId = (await api.searchByGranblueId(
        'weapons',
        gbId,
        { query: wpName, locale: input.lang },
      ))?.id

      if (wpId) {
        const mainhand = i == 0

        const pos = i - 1 as
          | -1
          | 0
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6
          | 7
          | 8
          | 9
          | 10
          | 11
        const { grid_weapon: gridWpn } = await api.addAndFixConflicts(
          'weapons',
          pos,
          {
            weapon: {
              weapon_id: wpId,
              party_id: partyId,
              position: pos,
              mainhand: mainhand,
              uncap_level: transcend ? 6 : uncap,
              transcendence_step: transcend,
              ...attr !== undefined
                ? { element: tables.gbfAttrToApiId(attr) }
                : null,
            },
          },
        )

        const gwId = gridWpn.id

        if (awakening) {
          const { type: awkType, lvl: awkLvl } = awakening

          const awkOptions = gridWpn.object.awakenings
          const awkObj = awkOptions.find(({ name: { [input.lang]: name } }) =>
            name === awkType
          )

          if (awkObj) {
            pending.add(api.update('grid_weapons', gwId, '', {
              weapon: {
                awakening_id: awkObj.id,
                awakening_level: awkLvl,
              },
            }) as Promise<unknown> as Promise<void>)
          }
        }

        if (keys) {
          const { series } = gridWpn.object
          for (const [slot, keyGbfId] of keys.entries()) {
            if (!keyGbfId) continue

            const keyId = (await api.findWeaponKeyBySkillId(
              keyGbfId,
              series,
              slot as 0 | 1 | 2,
            ))?.id

            pending.add(
              api.update('grid_weapons', gwId, '', {
                weapon: { [`weapon_key${slot + 1 as 1 | 2 | 3}_id`]: keyId },
              }) as Promise<unknown> as Promise<void>,
            )
          }
        }

        if (ax) {
          const [ax1, ax2] = ax

          pending.add(api.update('grid_weapons', gwId, '', {
            weapon: {
              ...ax1 && {
                ax_modifier1: tables.gbfAxToApiId(ax1.id),
                ax_strength1: parseInt(
                  ax1.val.replace('+', '').replace('%', ''),
                  10,
                ),
              },
              ...ax2 && {
                ax_modifier2: tables.gbfAxToApiId(ax2.id),
                ax_strength2: parseInt(
                  ax2.val.replace('+', '').replace('%', ''),
                  10,
                ),
              },
            },
          }) as Promise<unknown> as Promise<void>)
        }
      }
    }

    await Promise.all(pending)
  }

  async function updateSummons(
    friend: HenseiExport['friend_summon'] | undefined,
    summons: HenseiExport['summons'] | HenseiExport['sub_summons'],
    offset: 0 | 5,
  ) {
    // TODO: parallelize?
    for (
      const [i, { name: smName, id: gbId, uncap, transcend = 0, qs = false }]
        of summons.entries()
    ) {
      const smId = (await api.searchByGranblueId(
        'summons',
        gbId,
        { query: smName, locale: input.lang },
      ))?.id

      if (smId) {
        const main = offset == 0 && i == 0

        const pos = i + offset
        await api.addAndFixConflicts(
          'summons',
          pos,
          {
            summon: {
              summon_id: smId,
              party_id: partyId,
              position: pos - 1 as -1,
              main,
              friend: false,
              uncap_level: transcend > 0 ? 6 : uncap,
              transcendence_step: transcend,
              quick_summon: qs,
            },
          },
        )
      }
    }

    if (friend) {
      const smId = (await api.searchByExactName(
        'summons',
        friend,
        input.lang,
      ))?.id

      if (smId) {
        const {
          grid_summon: { id: frSmId, object: { uncap: allowedUncaps } },
        } = await api.addAndFixConflicts('summons', 6, {
          summon: {
            'summon_id': smId,
            'party_id': partyId,
            'position': 6,
            'main': false,
            'friend': true,
            'uncap_level': 0,
          },
        })

        const uncapLvl = allowedUncaps.transcendence
          ? 6
          : (allowedUncaps.ulb ? 5 : (allowedUncaps.flb ? 4 : 3))
        await api.updateUncap(
          'summons',
          frSmId,
          uncapLvl,
          uncapLvl == 6 ? 5 : 0,
        )
      }
    }
  }
}

declare const __NEXT_DATA__: {
  props: {
    pageProps: { context: HenseiPageContext }
  }
}

interface HenseiPageContext {
  jobSkills: readonly HenseiJobSkill[]
  jobs: readonly HenseiJob[]
  // weaponKeys: Record<'chain'|'emblem'|'gauph'|'pendulum'|'providence'|'teluma',readonly HenseiWeaponKey[]>
}

interface HenseiCommonData {
  /** UUID */
  id: string
  /** NOTE: localized */
  name: Record<'en' | 'ja', string>
}

// deno-lint-ignore no-empty-interface
interface HenseiJobSkill extends HenseiCommonData {}

// deno-lint-ignore no-empty-interface
interface HenseiJob extends HenseiCommonData {}

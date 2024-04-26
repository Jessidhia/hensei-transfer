import type { HenseiExport } from './gbf_to_json.ts'
import * as clipboard from './clipboard.ts'
import * as range from './range.ts'

const API_ORIGIN = 'https://hensei-api-production-66fb.up.railway.app'

// TODO: refactor this / split into proper modules

export default async function importHensei() {
  const { context: data } = __NEXT_DATA__.props.pageProps

  if (data == null) {
    alert('Please refresh the page to load important data, then try again.')
    return
  }

  if (data.jobs == undefined) {
    alert(
      'Some data needed to create a team is missing, please open a team that already exists and press F5, and then run the script again. This will not overwrite your team. You can offset this by bookmarking the New team page and running the script from there.',
    )
    return
  }

  const auth = __get_auth()
  if (!auth) {
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
    let redirect: string
    ;({ id: partyId, redirect } = await __get_new_id())

    await Promise.all([
      // TODO: check which of these are parallelizable and remove the await
      __info(),
      // sync point
      await __job(),
      await __chars(),
      await __weapons(),
      await __summons(input['friend_summon'], input['summons'], 0),
      await __summons(undefined, input['sub_summons'], 5),
    ])

    document.body.style.cursor = ''
    notice.remove()
    location.assign(redirect)
    // if (redirect.length > 0) {
    //   history.pushState({ url: redirect }, '', redirect)
    // }
    // location.reload()
  } catch (e) {
    notice.style.color = 'red'
    notice.innerText = 'An error occurred, check browser console'
    throw e
  }

  async function __get_new_id() {
    const { party: { id, shortcode } } = await apiPost<
      { party: { id: string; shortcode: string } }
    >('parties', {})

    return { id, redirect: `/p/${shortcode}` }
  }

  function __info() {
    const { name, extra } = input
    return apiPut(
      'parties',
      partyId,
      '',
      { party: { name: name, extra: extra } },
    )
  }

  async function __job() {
    const { class: name, subskills, accessory } = input
    const id = await __seek_id(data.jobs, (j) => j.name[input.lang] === name)

    const pending = new Set<Promise<void>>()

    if (id.length > 0) {
      await apiPut('parties', partyId, 'jobs', { party: { job_id: id } })

      if (subskills.length > 0) {
        const ssIds = await Promise.all(
          subskills.map((ssName) =>
            ssName &&
            __search<{ id: string; name: { en: string; ja: string } }>(
              'job_skills',
              {
                query: ssName,
                job: id,
                locale: input.lang,
              },
              (s) => s.name[input.lang] == ssName,
            )
          ),
        )
        const subskillsObj: Partial<Record<`skill${1 | 2 | 3}_id`, string>> = {}
        for (
          const [i, ssId] of ssIds.filter((val): val is string => !!val)
            .entries()
        ) {
          subskillsObj[`skill${i + 1 as 1 | 2 | 3}_id`] = ssId
        }

        const failures = new Set<typeof subskillsObj>()
        for (const [key, subskill] of Object.entries(subskillsObj)) {
          const send = { [key as keyof typeof subskillsObj]: subskill }
          const res = await apiPut<{ code: unknown }>(
            'parties',
            partyId,
            'job_skills',
            {
              party: send,
            },
          )

          if ('code' in res) {
            failures.add(send)
          }
        }

        for (const failure of failures) {
          pending.add(apiPut(
            'parties',
            partyId,
            'job_skills',
            { party: failure },
          ))
        }
      }

      if (accessory) {
        const options = await apiGet<{ id: string; granblue_id: string }[]>(
          `jobs/${id}/accessories`,
        )
        const accId = __seek_id(options, (a) => a.granblue_id == `${accessory}`)
        await apiPut('parties', partyId, '', { party: { accessory_id: accId } })
      }
    }

    await pending
  }

  async function __chars() {
    const { characters: chars } = input

    const pending = new Set<Promise<void>>()
    // TODO: parallelize?
    for (
      const [i, { name: chName, id: gbId, uncap, ringed = false, transcend }]
        of chars.entries()
    ) {
      const chId = await __search<{ id: string; granblue_id: string }>(
        'characters',
        { query: chName, locale: input.lang },
        (c) => c.granblue_id == gbId,
      )

      if (chId.length > 0) {
        const { id: gcId } = await __add_and_fix_conflicts('characters', i, {
          character: {
            character_id: chId,
            party_id: partyId,
            position: i,
            uncap_level: uncap,
          },
        })

        if (ringed) {
          pending.add(apiPut('grid_characters', gcId, '', {
            character: { perpetuity: true },
          }))
        }

        if (transcend) {
          pending.add(apiPut('grid_characters', gcId, '', {
            character: { uncap_level: 6, transcendence_step: transcend },
          }))
        }
      }
    }

    await Promise.all(pending)
  }

  async function __weapons() {
    const { weapons } = input
    /** gbf id (- 1) to api id */
    const elementMapping = [2, 3, 4, 1, 6, 5] as const
    const keyMapping = {
      k13001: ['1240', '2204', '2208'],
      k13002: ['1241', '2205', '2209'],
      k13003: ['1242', '2206', '2210'],
      k13004: ['1243', '2207', '2211'],
      k14014: '1723',
      k14015: '1724',
      k14016: '1725',
      k14017: '1726',
      k10001: '697-706',
      k10002: '707-716',
      k10003: '717-726',
      k10004: '727-736',
      k10005: '737-746',
      k10006: '747-756',
      k11001: '758',
      k11002: '759',
      k11003: '760',
      k11004: '761',
      k17001: '1807',
      k17002: '1808',
      k17003: '1809',
      k17004: '1810',
      k15001: '1446',
      k15002: '1447',
      k15003: '1448',
      k15004: '1449',
      k15005: '1450',
      k15006: '1451',
      k15007: '1452',
      k16001: '1228-1233',
      k16002: '1234-1239',
      k14001: ['502-507', '1213-1218'],
      k14002: ['130-135', '71-76'],
      k14003: ['1260-1265', '1266-1271'],
      k14004: ['1199-1204', '1205-1210'],
      k14011: ['322-327', '1310-1315'],
      k14012: ['764-769', '1731-1735', '948'],
      k14013: ['1171-1176', '1736-1741'],
      k15008: '2043-2048',
      k15009: '2049-2055',
      k14005: '2212-2223',
      k14006: '2224-2235',
      k14007: '2236-2247',
    } satisfies Record<string, range.NumberRanges>
    const axMapping = {
      ax1588: 7,
      ax1589: 0,
      ax1590: 1,
      ax1591: 3,
      ax1592: 4,
      ax1593: 9,
      ax1594: 13,
      ax1595: 10,
      ax1596: 5,
      ax1597: 6,
      ax1599: 8,
      ax1600: 12,
      ax1601: 11,
      ax1719: 15,
      ax1720: 16,
      ax1721: 17,
      ax1722: 14,
    } as const

    const pending = new Set<Promise<void>>()

    for (
      const [
        i,
        { name: wpName, id: gbId, uncap, attr, transcend, awakening, keys, ax },
      ] of weapons.entries()
    ) {
      const wpId = await __search<{ id: string; granblue_id: string }>(
        'weapons',
        { query: wpName, locale: input.lang },
        function (c) {
          return c['granblue_id'] == gbId
        },
      )

      if (wpId.length > 0) {
        const mainhand = i == 0

        const pos = i - 1
        const { grid_weapon: gridWpn } = await __add_and_fix_conflicts(
          'weapons',
          pos,
          {
            weapon: {
              'weapon_id': wpId,
              'party_id': partyId,
              'position': pos,
              'mainhand': mainhand,
              'uncap_level': uncap,
            },
          },
        )

        const gwId = gridWpn.id
        if (attr !== undefined) {
          pending.add(apiPut('grid_weapons', gwId, '', {
            weapon: { element: elementMapping[attr - 1] },
          }))
        }

        if (transcend) {
          pending.add(apiPut('grid_weapons', gwId, '', {
            weapon: { uncap_level: 6, transcendence_step: transcend },
          }))
        }

        if (awakening) {
          const { type: awkType, lvl: awkLvl } = awakening

          const awkOptions = gridWpn.object.awakenings
          const awkObj = awkOptions.find(({ name: { [input.lang]: name } }) =>
            name === awkType
          )

          if (awkObj) {
            pending.add(apiPost('weapons/update_uncap', {
              weapon: {
                id: gwId,
                awakening_id: awkObj.id,
                awakening_level: awkLvl,
              },
            }))
          }
        }

        if (keys) {
          const { series } = gridWpn.object
          for (const [slot, keyGbfId] of keys.entries()) {
            if (!keyGbfId) continue

            const options = await apiGet<{ id: string; granblue_id: number }[]>(
              `weapon_keys?series=${encodeURIComponent(series)}&slot=${
                encodeURIComponent(slot)
              }`,
            )
            const keyId = __seek_id(options, ({ granblue_id: itemId }) => {
              const mappingKey = `k${itemId}`
              const numGbfId = parseInt(keyGbfId, 10)
              if (mappingKey in keyMapping) {
                const mapping =
                  keyMapping[mappingKey as keyof typeof keyMapping]

                return range.matches(mapping, numGbfId)
              }

              return false
            })

            pending.add(
              apiPut('grid_weapons', gwId, '', {
                weapon: { [`weapon_key${slot + 1}_id`]: keyId },
              }),
            )
          }
        }

        if (ax) {
          const axPut: Partial<
            Record<`ax_${'modifier' | 'strength'}${1 | 2}`, number>
          > = {}
          for (const [i, axObj] of ax.entries()) {
            const axId = axObj['id']
            const axMod = axMapping[`ax${axId}` as keyof typeof axMapping]
            const putKey = i + 1 as 1 | 2

            axPut[`ax_modifier${putKey}`] = axMod
            axPut[`ax_strength${putKey}`] = parseInt(
              axObj['val'].replace('+', '').replace('%', ''),
            )
          }

          pending.add(apiPut('grid_weapons', gwId, '', { weapon: axPut }))
        }
      }
    }

    await Promise.all(pending)
  }

  async function __summons(
    friend: HenseiExport['friend_summon'] | undefined,
    summons: HenseiExport['summons'] | HenseiExport['sub_summons'],
    offset: 0 | 5,
  ) {
    // TODO: parallelize?
    for (
      const [i, { name: smName, id: gbId, uncap, transcend = 0, qs = false }]
        of summons.entries()
    ) {
      const smId = await __search<{ id: string; granblue_id: string }>(
        'summons',
        { query: smName, locale: input.lang },
        function (c) {
          return c.granblue_id == gbId
        },
      )

      if (smId.length > 0) {
        const main = offset == 0 && i == 0

        const pos = i - 1 + offset
        const { grid_summon: { id: gsId } } = await __add_and_fix_conflicts(
          'summons',
          pos,
          {
            summon: {
              'summon_id': smId,
              'party_id': partyId,
              'position': pos,
              'main': main,
              'friend': false,
              'uncap_level': uncap,
            },
          },
        )

        if (transcend > 0) {
          await __update_summon_level(gsId, 6, transcend)
        }

        if (qs) {
          await apiPost('summons/update_quick_summon', {
            summon: { id: gsId, 'quick_summon': true },
          })
        }
      }
    }

    if (friend) {
      const smId = await __search<
        { id: string; name: { en: string; ja: string } }
      >(
        'summons',
        { query: friend, locale: input.lang },
        (c) => c.name[input.lang] == friend,
      )

      if (smId.length > 0) {
        const {
          grid_summon: { id: frSmId, object: { uncap: allowedUncaps } },
        } = await __add_and_fix_conflicts('summons', 6, {
          summon: {
            'summon_id': smId,
            'party_id': partyId,
            'position': 6,
            'main': false,
            'friend': true,
            'uncap_level': 0,
          },
        })

        const uncapLvl = allowedUncaps.xlb
          ? 6
          : (allowedUncaps.ulb ? 5 : (allowedUncaps.flb ? 4 : 3))
        const transcend = uncapLvl == 6 ? 5 : 0
        await __update_summon_level(frSmId, uncapLvl, transcend)
      }
    }
  }

  function __update_summon_level(smId: string, lvl: number, transcend: number) {
    return apiPost('summons/update_uncap', {
      summon: { id: smId, 'uncap_level': lvl, 'transcendence_step': transcend },
    })
  }

  async function __add_and_fix_conflicts(
    namespace: 'characters',
    pos: number,
    data: {
      character: {
        character_id: string
        party_id: string
        position: number
        uncap_level: number
      }
    },
  ): Promise<{ id: string }>
  async function __add_and_fix_conflicts(
    namespace: 'weapons',
    pos: number,
    data: {
      weapon: {
        weapon_id: string
        party_id: string
        position: number
        mainhand: boolean
        uncap_level: number
      }
    },
  ): Promise<
    {
      grid_weapon: {
        id: string
        object: {
          awakenings: { id: string; name: { en: string; ja: string } }[]
          series: string
        }
      }
    }
  >
  async function __add_and_fix_conflicts(
    namespace: 'summons',
    pos: number,
    data: {
      summon: {
        summon_id: string
        party_id: string
        position: number
        main: boolean
        friend: boolean
        uncap_level: number
      }
    },
  ): Promise<
    {
      grid_summon: {
        id: string
        object: { uncap: Record<'flb' | 'ulb' | 'xlb', boolean> }
      }
    }
  >
  async function __add_and_fix_conflicts<T>(
    namespace: string,
    pos: number,
    data: object,
  ): Promise<T> {
    const obj = await apiPost<
      { conflicts: { id: string }[]; incoming: { id: string } }
    >(namespace, data)

    if ('conflicts' in obj) {
      return apiPost(`${namespace}/resolve`, {
        resolve: {
          conflicting: [obj.conflicts[0].id],
          incoming: obj.incoming.id,
          position: pos,
        },
      })
    }

    return obj
  }

  async function __search<T extends { id: string }>(
    endpoint: 'job_skills' | 'characters' | 'weapons' | 'summons',
    query: { query: string; job?: string; locale: 'en' | 'ja' },
    filter: (val: T) => boolean,
  ) {
    const { results } = await apiPost<{ results: T[] }>(`search/${endpoint}`, {
      search: query,
    })
    return __seek_id(results, filter)
  }

  /**
   * Returns the id of the first element that matches the predicate,
   * or the id of the first element; empty string if there is no element to choose
   */
  // TODO: just make this return undefined instead of weird empty string :(
  function __seek_id<T extends { id: string }>(
    arr: ArrayLike<T>,
    predicate: (val: T) => boolean,
  ): string {
    if (!arr || arr.length == 0) {
      return ''
    }
    const obj = Array.from(
      // TODO: remove this hack and just do arr.find() if it turns out all API result are real arrays
      'length' in arr ? arr : Object.values<T>(arr),
    ).find(predicate)
    if (obj) {
      return obj.id
    }
    return arr[0].id
  }

  function __get_auth() {
    const match = document.cookie.match(
      // can't write a %, would break the bookmarklet export
      new RegExp('token\u002522\u00253A\u002522(.+?)\u002522'),
    )
    if (match) {
      return match[1]
    }
  }

  function apiGet<T>(endpoint: string): Promise<T> {
    return apiFetch<T>('GET', endpoint)
  }

  function apiPut<T = void>(
    namespace: 'parties',
    id: string,
    endpoint: '' | 'jobs' | 'job_skills',
    payload: object,
  ): Promise<T>
  function apiPut<T = void>(
    namespace: 'grid_characters',
    id: string,
    endpoint: '',
    payload: object,
  ): Promise<T>
  function apiPut<T = void>(
    namespace: 'grid_weapons',
    id: string,
    endpoint: '',
    payload: object,
  ): Promise<T>
  function apiPut<T = void>(
    namespace: string,
    id: string,
    endpoint: string,
    payload: object,
  ): Promise<T> {
    return apiFetch<T>('PUT', `${namespace}/${id}/${endpoint}`, payload)
  }

  function apiPost<T = void>(endpoint: string, payload: object): Promise<T> {
    return apiFetch<T>('POST', endpoint, payload)
  }

  async function apiFetch<T = void>(
    method: 'GET' | 'PUT' | 'POST',
    endpoint: string,
    payload?: object,
  ): Promise<T> {
    // ratelimit?
    const request = await fetch(`${API_ORIGIN}/api/v1/${endpoint}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${auth}`,
      },
      body: payload && JSON.stringify(payload),
    })

    return request.json()
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

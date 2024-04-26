const API_ORIGIN = 'https://hensei-api-production-66fb.up.railway.app'

export function hasToken() {
  return !!getToken()
}

function getToken() {
  const match = location.hostname.endsWith('granblue.team') &&
    document.cookie.match(
      // can't write a %, would break the bookmarklet export
      new RegExp('token\u002522\u00253A\u002522(.+?)\u002522'),
    )
  if (match) {
    return match[1]
  }
}

export function get<T>(endpoint: string): Promise<T> {
  return apiFetch<T>('GET', endpoint)
}

export function put<T = void>(
  namespace: string,
  id: string,
  endpoint: string,
  payload: object,
): Promise<T> {
  return apiFetch<T>(
    'PUT',
    `${namespace}/${id}${endpoint ? `/${endpoint}` : ''}`,
    payload,
  )
}

// TODO: just PUT it properly the first time, or update POST to weapons/update_uncap -> PUT to grid_weapons/${id}
export function post<T = void>(
  endpoint: string,
  payload: object,
): Promise<T> {
  return apiFetch<T>('POST', endpoint, payload)
}

async function apiFetch<T = void>(
  method: 'GET' | 'PUT' | 'POST',
  endpoint: string,
  payload?: object,
  anonymous = false,
): Promise<T> {
  // ratelimit?
  const request = await fetch(`${API_ORIGIN}/api/v1/${endpoint}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...anonymous ? null : {
        'authorization': `Bearer ${getToken()}`,
      },
    },
    body: payload && JSON.stringify(payload),
  })

  return request.json()
}

/**
 * Searches and return the first result that fulfills the predicate
 *
 * Only paginates as needed
 */
export async function searchOne<T>(
  endpoint: string,
  query: { query: string; locale: 'en' | 'ja'; job?: string },
  predicate: (result: T) => boolean | Promise<boolean>,
) {
  for await (const result of searchGenerator<T>(endpoint, query)) {
    if (await predicate(result)) {
      return result
    }
  }
}

const PAGINATION_LIMIT = 3

/**
 * Searches and returns all results that fulfill the predicate, up to the optional limit
 *
 * Will not read more than PAGINATION_LIMIT pages
 *
 * @param limit maximum number of results to return
 */
export async function searchMany<T>(
  endpoint: string,
  query: { query: string; locale: 'en' | 'ja'; job?: string },
  predicate: (result: T) => boolean | Promise<boolean>,
  limit?: number,
) {
  const results: T[] = []
  for await (const result of searchGenerator<T>(endpoint, query)) {
    if (await predicate(result)) {
      results.push(result)
      if (limit && results.length >= limit) {
        return results
      }
    }
  }
  return results
}

/**
 * Searches and yields all results in order, paginating as needed;
 * close the iterator to stop paginating
 *
 * May read up to PAGINATION_LIMIT pages
 */
async function* searchGenerator<T>(
  endpoint: string,
  query: { query: string; locale: 'en' | 'ja'; job?: string },
) {
  interface SearchResults<T> {
    meta: { count: number; per_page: number; total_pages: number }
    results: T[]
  }

  const first = await apiFetch<SearchResults<T>>('POST', `search/${endpoint}`, {
    search: query,
  }, !hasToken())
  yield* first.results

  const { meta: { total_pages: pageCount } } = first
  const pages = Math.min(pageCount, PAGINATION_LIMIT)
  for (let page = 2; page <= pages; page++) {
    const next = await apiFetch<SearchResults<T>>(
      'POST',
      `search/${endpoint}`,
      {
        search: { ...query, page },
      },
      !hasToken(),
    )
    yield* next.results
  }
}

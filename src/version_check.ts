import buildVersion from '../version.json' with { type: 'json' }

const repo = 'Jessidhia/hensei-transfer'

export default async function assertVersion() {
  const time = new Date().getTime()
  try {
    const version: number = await (await fetch(
      `https://raw.githubusercontent.com/${repo}/main/version.json?_=${time}`,
    )).json()

    if (version > buildVersion) {
      if (
        confirm(
          'hensei-transfer has received an update. Please re-download the bookmarklet to ensure it\'s compatible with the latest changes, or click Cancel to proceed anyway.',
        )
      ) {
        open(`https://github.com/${repo}`, '_blank')
        return false
      }
    }
  } catch (e) {
    // log and ignore
    console.error(e)
  }

  return true
}

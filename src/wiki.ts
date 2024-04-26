import assertVersion from './version_check.ts'
import * as clipboard from './clipboard.ts'

import getGame from './gbf.ts'
import exportHensei from './gbf_to_json.ts'
import convertToWiki from './json_to_wiki.ts'

assertVersion().then((ok) => {
  if (!ok) return

  if (location.hostname.endsWith('game.granbluefantasy.jp')) {
    const wikitext = convertToWiki(exportHensei(getGame()))
    if (wikitext) {
      clipboard.write(wikitext)
      alert('Copied team data to clipboard!')
    }
  } else {
    alert('Can only be used in game.granbluefantasy.jp')
  }
})

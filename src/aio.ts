import assertVersion from './version_check.ts'

import getGame from './gbf.ts'
import exportHensei from './gbf_to_json.ts'
import importHensei from './json_to_hensei.ts'
import * as clipboard from './clipboard.ts'

assertVersion().then((ok) => {
  if (!ok) return

  if (location.hostname.endsWith('granblue.team')) {
    return importHensei()
  } else if (location.hostname.endsWith('game.granbluefantasy.jp')) {
    const str = JSON.stringify(exportHensei(getGame()))
    clipboard.write(str)

    if (
      confirm(
        'Copied team data to clipboard! If you press OK, a new tab in granblue.team will be open now - click the bookmark again on it and paste your data in there.',
      )
    ) {
      open('https://granblue.team', '_blank')
    }
  } else {
    alert('Can only be used in game.granbluefantasy.jp or granblue.team')
  }
})

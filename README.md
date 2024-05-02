# hensei-transfer

Bookmarklet pair to transfer teams from Granblue Fantasy to hensei/granblue.team
and the granblue wiki.

## Demonstration:

https://user-images.githubusercontent.com/1794735/225981630-22a45b8a-f819-46d9-b0f8-6ddbbd70d051.mp4

## Installation

- Copy
  [this code](https://raw.githubusercontent.com/Jessidhia/hensei-transfer/main/bookmarklets/aio.js)
  - GBF Wiki editors: Copy
    [this code](https://raw.githubusercontent.com/Jessidhia/hensei-transfer/main/bookmarklets/wiki.js)
    instead
- Create a new Bookmark in your browser, and in the URL/Address field, paste the
  code
- Go to your team screen, and press the bookmark
- Go to any team screen or the new team screen in app.granblue.team, and press
  the bookmark again

## Limitations

- Any character info (except Perpetuity Rings) isn't visible in the team screen,
  so can't be copied
- Friend Summon data from the simulator settings isn't visible in the team
  screen aside from the summon's name, so it can only be approximate
- Friend summons with multiple sprites can load the wrong one because of the
  previous point
- Characters with a "display" name being different from their "actual" name may
  not load properly (eg. "Chika" instead of "Aqours Second-Years")
- Uncap levels are mostly calculated from the item's current level, an item that
  is uncapped but not leveled will export the wrong uncap level
- R/SR characters/weapons/summons will not import to granblue.party
- (wiki-specific) Summon max uncap level is unknown from the party data so
  non-maxed summons may export with the wrong number of empty stars
- (wiki-specific) Weapon/Character/Summon names will be missing disambiguation
  annotations, such as `(Summon)` or `(SSR)`

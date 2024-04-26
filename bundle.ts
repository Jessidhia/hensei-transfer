import * as esbuild from 'https://deno.land/x/esbuild@v0.20.2/mod.js'
import denoJson from './deno.json' with { type: 'json' }

try {
  if (Deno.args.includes('release')) {
    await bumpVersion()
  }
  await Promise.all([
    build(['src/aio.ts', 'src/wiki.ts']),
  ])
} catch (e) {
  if ('errors' in e && 'warnings' in e) {
    // esbuild error, should have already been logged
  } else {
    console.error(e)
  }
  Deno.exit(1)
}
Deno.exit()

async function build(entrypoint: string | string[]) {
  const ctxOptions = {
    // banner option inserts a newline, we can't have that so we do our own file writing
    write: false,
    outdir: 'bookmarklets',
    format: 'iife',
    target: ['es2022'],
    entryPoints: Array.isArray(entrypoint) ? entrypoint : [entrypoint],
    bundle: true,
    minify: true,
    supported: { 'inline-script': false },
    legalComments: 'none',
    charset: 'utf8',
    logLevel: 'info',
    tsconfigRaw: `{ "compilerOptions": ${
      JSON.stringify(denoJson.compilerOptions)
    } }`,
  } satisfies esbuild.BuildOptions

  const result = await esbuild.build(ctxOptions)

  const enc = new TextEncoder()

  await Promise.all(result.outputFiles.map(async ({ path, contents }) => {
    // when will libraries start supporting Symbol.asyncDispose...
    let file: Deno.FsFile | undefined
    try {
      file = await Deno.create(path)
      await file.write(enc.encode('javascript:'))
      await file.write(contents)
    } finally {
      if (file) file.close()
    }
  }))
}

async function bumpVersion() {
  const newVersion = JSON.parse(await Deno.readTextFile('./version.json')) + 1
  console.log('Updating version to version', newVersion)
  await Deno.writeTextFile('./version.json', JSON.stringify(newVersion))
}

import * as esbuild from 'https://deno.land/x/esbuild@v0.20.2/mod.js'
import { parseArgs } from 'https://deno.land/x/std@0.224.0/cli/mod.ts'
import denoJson from './deno.json' with { type: 'json' }

const args = parseArgs(Deno.args, {
  boolean: ['release', 'encode', 'debug'],
  negatable: ['release', 'encode', 'debug'],
  default: { encode: true },
})
try {
  if (args.release) {
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
    minify: !args.debug,
    minifyWhitespace: args.encode,
    supported: { 'inline-script': false },
    legalComments: 'none',
    charset: 'utf8',
    logLevel: 'info',
    drop: args.debug ? [] : ['debugger'],
    define: { DEBUG: JSON.stringify(!!args.debug) },
    tsconfigRaw: `{ "compilerOptions": ${
      JSON.stringify(denoJson.compilerOptions)
    } }`,
  } satisfies esbuild.BuildOptions

  const result = await esbuild.build(ctxOptions)

  const enc = new TextEncoder()

  await Promise.all(result.outputFiles.map(async ({ path, text, contents }) => {
    using file = await Deno.create(path)
    if (args.encode) {
      await file.write(enc.encode('javascript:'))
      await file.write(
        enc.encode(
          encodeURI(
            // minifier makes use of raw newlines inside templates but that won't work on a bookmarklet
            text.trim().replaceAll('\n', '\\n'),
          ).replaceAll(
            // restore javascript:-uri safe characters
            /%(?:20|22|3C|3E|5B|5C|5D|5E|60|7B|7C|7D)/g,
            decodeURI,
          ),
        ),
      )
    } else {
      await file.write(contents)
    }
  }))
}

async function bumpVersion() {
  const newVersion = JSON.parse(await Deno.readTextFile('./version.json')) + 1
  console.log('Updating version to version', newVersion)
  await Deno.writeTextFile('./version.json', JSON.stringify(newVersion))
}

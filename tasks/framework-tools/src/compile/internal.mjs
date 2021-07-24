#!/usr/bin/env node
/* eslint-env node */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import swc from '@swc/core'
import fg from 'fast-glob'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const packageRoot = path.resolve(__dirname, '../../../../packages/internal')

const configFile = path.join(packageRoot, '.swcrc')
const srcRoot = path.resolve(packageRoot, 'src')

console.log('Compiling ', packageRoot)
console.time('...Done. Took')
// console.log('Config file:', path.join(packageRoot, '.swcrc'))
// console.log()

const code = fg.sync('**/*.ts', {
  cwd: srcRoot,
  ignore: ['**/*.test.ts', '**/__tests__/**', '**/__mocks__/**', '**/*.d.ts'],
})

// console.log('Compiling files...')

for (const srcPath of code) {
  const dest = path.join(packageRoot, 'dist', srcPath)
  const result = swc.transformFileSync(path.join(srcRoot, srcPath), {
    sourceMaps: 'inline',
    cwd: srcRoot,
    configFile,
    outputPath: dest,
  })

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, result.code)
  //console.log('', dest)
}

// console.log()
console.timeEnd('...Done. Took')

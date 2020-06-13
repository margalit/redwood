import fs from 'fs'
import path from 'path'

import concurrently from 'concurrently'
import terminalLink from 'terminal-link'
import { getConfig } from '@redwoodjs/internal'

import { getPaths } from 'src/lib'
import c from 'src/lib/colors'

const redwoodConfig = getConfig()

export const command = 'dev [side..]'
export const description = 'Start development servers for api, db, and web'
export const builder = (yargs) => {
  yargs
    .positional('side', {
      choices: ['api', 'db', 'web'],
      default: ['api', 'db', 'web'],
      description: 'Which dev server(s) to start',
      type: 'array',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/reference/command-line-interface#dev'
      )}`
    )
}

export const handler = async ({ side = ['api', 'db', 'web'] }) => {
  // We use BASE_DIR when we need to effectively set the working dir
  const BASE_DIR = getPaths().base
  // For validation, e.g. dirExists?, we use these
  // note: getPaths().web|api.base returns undefined on Windows
  const API_DIR_SRC = getPaths().api.src
  const WEB_DIR_SRC = getPaths().web.src
  const PRISMA_SCHEMA = getPaths().api.dbSchema

  const jobs = {
    api: {
      name: 'api',
      command: `cd "${path.join(BASE_DIR, 'api')}" && yarn dev-server`,
      prefixColor: 'cyan',
      runWhen: () => fs.existsSync(API_DIR_SRC),
    },
    db: {
      name: ' db', // prefixed with ` ` to match output indentation.
      command: `cd "${path.join(BASE_DIR, 'api')}" && DATABASE_URL=${
        redwoodConfig.databases.dev.url
      } yarn prisma generate --watch`,
      prefixColor: 'magenta',
      runWhen: () => fs.existsSync(PRISMA_SCHEMA),
    },
    web: {
      name: 'web',
      command: `cd "${path.join(
        BASE_DIR,
        'web'
      )}" && yarn webpack-dev-server --config ../node_modules/@redwoodjs/core/config/webpack.development.js`,
      prefixColor: 'blue',
      runWhen: () => fs.existsSync(WEB_DIR_SRC),
    },
  }

  concurrently(
    Object.keys(jobs)
      .map((n) => side.includes(n) && jobs[n])
      .filter((job) => job && job.runWhen()),
    {
      restartTries: 3,
      restartDelay: 1000,
      prefix: '{name} |',
      timestampFormat: 'HH:mm:ss',
    }
  ).catch((e) => {
    console.log(c.error(e.message))
  })
}

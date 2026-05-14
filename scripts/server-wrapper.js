const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const cwd = process.cwd()
const port = process.env.PORT || '3003'
const logPath = path.join(cwd, 'start-server.log')
const errorLogPath = path.join(cwd, 'start-server-error.log')

const out = fs.openSync(logPath, 'a')
const err = fs.openSync(errorLogPath, 'a')

const child = spawn(
  process.execPath,
  [
    path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next'),
    'start',
    '--port',
    port,
    '--hostname',
    '0.0.0.0',
  ],
  {
    cwd,
    stdio: ['ignore', out, err],
    windowsHide: true,
  },
)

child.on('exit', (code, signal) => {
  fs.appendFileSync(
    errorLogPath,
    `\nNext server exited at ${new Date().toISOString()} code=${code ?? 'null'} signal=${signal ?? 'null'}\n`,
    'utf8',
  )
  process.exit(code ?? 1)
})

process.on('SIGTERM', () => child.kill('SIGTERM'))
process.on('SIGINT', () => child.kill('SIGINT'))

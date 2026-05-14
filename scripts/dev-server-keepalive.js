const fs = require('fs')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const cwd = path.resolve(__dirname, '..')
const port = process.env.PORT || '3003'
const mode = process.env.NEXT_SERVER_MODE || 'dev'
const logPath = path.join(cwd, 'dev-server-keepalive.log')
const errorLogPath = path.join(cwd, 'dev-server-keepalive-error.log')

let child = null

function append(filePath, message) {
  fs.appendFileSync(filePath, `${new Date().toISOString()} ${message}\n`, 'utf8')
}

function listening() {
  const result = spawnSync('netstat.exe', ['-ano', '-p', 'tcp'], {
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) return false
  return result.stdout
    .split(/\r?\n/)
    .some((line) => {
      const parts = line.trim().split(/\s+/)
      return parts[0] === 'TCP' && parts[1]?.endsWith(`:${port}`) && parts[3] === 'LISTENING'
    })
}

function start() {
  if (child && child.exitCode == null) return

  const out = fs.openSync(logPath, 'a')
  const err = fs.openSync(errorLogPath, 'a')
  const args = [
    path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next'),
    mode === 'start' ? 'start' : 'dev',
    ...(mode === 'dev' ? ['--webpack'] : []),
    '--port',
    port,
    '--hostname',
    '0.0.0.0',
  ]

  child = spawn(process.execPath, args, {
    cwd,
    stdio: ['ignore', out, err],
    windowsHide: true,
  })

  append(logPath, `started next ${mode} pid=${child.pid}`)
  child.on('exit', (code, signal) => {
    append(errorLogPath, `next exited code=${code ?? 'null'} signal=${signal ?? 'null'}`)
    child = null
  })
}

append(logPath, `keepalive boot mode=${mode} port=${port}`)
start()

setInterval(() => {
  if (!listening()) {
    append(errorLogPath, `port ${port} is not listening; restarting`)
    if (child && child.exitCode == null) {
      child.kill('SIGTERM')
    }
    child = null
    start()
  }
}, 2000)

process.on('SIGTERM', () => {
  if (child && child.exitCode == null) child.kill('SIGTERM')
  process.exit(0)
})

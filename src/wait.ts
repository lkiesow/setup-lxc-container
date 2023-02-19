import * as core from '@actions/core'
import {ExecException, execFile} from 'child_process'

function exec(command: string[]): void {
  // We need at least one argument
  if (command.length < 1) {
    throw new Error('Need at least one argument to execute command')
  }

  const cmd = command[0]
  const args = command.slice(1)
  execFile(
    cmd,
    args,
    (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        throw error
      }
      if (stderr) {
        core.error(`stderr: ${stderr}`)
        return
      }
      core.info(`Successfully executed ${command.join(' ')}`)
      if (stdout) {
        core.info(`stdout: ${stdout}`)
      }
    }
  )
}

export function stopDocker(): void {
  exec(['sudo', 'systemctl', 'stop', 'docker.service'])
}

export function iptablesCleanup(): void {
  exec(['sudo', 'iptables', '-P', 'INPUT', 'ACCEPT'])
  exec(['sudo', 'iptables', '-P', 'FORWARD', 'ACCEPT'])
  exec(['sudo', 'iptables', '-P', 'OUTPUT', 'ACCEPT'])
  exec(['sudo', 'iptables', '-F'])
  exec(['sudo', 'iptables', '-X'])
  exec(['sudo', 'iptables', '-t', 'nat', '-F'])
  exec(['sudo', 'iptables', '-t', 'nat', '-X'])
}

export function installLxc(): void {
  exec(['sudo', 'apt', 'install', 'lxc'])
}

export function startContainer(
  name: string,
  dist: string,
  release: string
): void {
  exec([
    'sudo',
    'lxc-create',
    '-t',
    'download',
    '-n',
    name,
    '--',
    '--dist',
    dist,
    '--release',
    release,
    '--arch',
    'amd64'
  ])
  exec(['sudo', 'lxc-start', '--name', name, '--daemon'])
}

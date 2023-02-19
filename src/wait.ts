import * as core from '@actions/core'
import {ExecException, execFile} from 'child_process'

async function exec(command: string[]): Promise<void> {
  // We need at least one argument
  if (command.length < 1) {
    throw new Error('Need at least one argument to execute command')
  }

  const cmd = command[0]
  const args = command.slice(1)
  const child = execFile(
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
  return new Promise(resolve => {
    child.on('close', code => {
      core.debug(`child process close all stdio with code ${code}`)
      resolve()
    })
  })
}

export async function stopDocker(): Promise<void> {
  await exec(['sudo', 'systemctl', 'stop', 'docker.service'])
}

export async function iptablesCleanup(): Promise<void> {
  await exec(['sudo', 'iptables', '-P', 'INPUT', 'ACCEPT'])
  await exec(['sudo', 'iptables', '-P', 'FORWARD', 'ACCEPT'])
  await exec(['sudo', 'iptables', '-P', 'OUTPUT', 'ACCEPT'])
  await exec(['sudo', 'iptables', '-F'])
  await exec(['sudo', 'iptables', '-X'])
  await exec(['sudo', 'iptables', '-t', 'nat', '-F'])
  await exec(['sudo', 'iptables', '-t', 'nat', '-X'])
}

export async function installLxc(): Promise<void> {
  await exec(['sudo', 'apt', 'install', 'lxc'])
}

export async function startContainer(
  name: string,
  dist: string,
  release: string
): Promise<void> {
  const create = ['sudo', 'lxc-create', '-t', 'download', '-n', name, '--']
  const lxcdist = ['--dist', dist, '--release', release, '--arch', 'amd64']
  await exec(create.concat(lxcdist))
  await exec(['sudo', 'lxc-start', '--name', name, '--daemon'])
}

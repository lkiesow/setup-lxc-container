import * as core from '@actions/core'
import {ExecFileException, execFile} from 'child_process'
import {appendFileSync, writeFileSync} from 'fs'
import {homedir} from 'os'
import {randomBytes} from 'crypto'

async function exec(command: string[]): Promise<void> {
  // We need at least a binary to run
  if (command.length < 1) {
    throw new Error('Need at least one argument to execute command')
  }

  core.debug(`Executing ${command.join(' ')}`)
  const cmd = command[0]
  const args = command.slice(1)
  const child = execFile(
    cmd,
    args,
    null,
    (
      error: ExecFileException | null,
      stdout: string | Buffer,
      stderr: string | Buffer
    ) => {
      if (error) {
        throw error
      }
      if (stderr) {
        // Not a great solution to work around the problem that debian always throws an apt warning, but it works until
        // this has been fixed upstream:
        const log = stderr
          .toString()
          .startsWith('debconf: delaying package configuration')
          ? core.info
          : core.warning
        log(`stderr: ${stderr}`)
      }
      core.info(`Successfully executed ${command.join(' ')}`)
      if (stdout) {
        core.info(stdout.toString())
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
  await exec(['sudo', 'systemctl', '--quiet', 'stop', 'docker.socket'])
  await exec(['sudo', 'systemctl', '--quiet', 'stop', 'docker.service'])
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
  await exec(['sudo', 'apt-get', 'install', 'lxc'])
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

export async function getIp(name: string): Promise<string> {
  // Wait up to 20 seconds to get IP address
  for (let i = 0; i < 200; i++) {
    const info: string = await new Promise(resolve => {
      execFile(
        'sudo',
        ['lxc-info', '-n', name],
        null,
        (error: ExecFileException | null, stdout: string | Buffer) => {
          if (error) {
            throw error
          }
          core.debug(`Successfully called lxc-info: ${stdout}`)
          resolve(stdout.toString())
        }
      )
    })

    // Check if the container has an IP address
    const ipInfo = info.split('\n').filter((l: string) => l.startsWith('IP'))
    const ip = ipInfo?.[0]?.split(/  */)?.[1]

    if (ip) {
      return ip
    }

    // Sleep 100ms before retry
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // We did not get an IP after 200 tries (~20 sec)
  throw new Error('Container failed to get IP address')
}

export async function setHost(name: string, ip: string): Promise<void> {
  const cmd = `echo "${ip}  ${name}" >> /etc/hosts`
  await exec(['sudo', 'bash', '-c', cmd])
}

export async function sshKeygen(name: string): Promise<void> {
  // Generate SSH key
  const home = homedir()
  const keyPath = `${home}/.ssh/id_ed25519`
  await exec(['install', '-dm', '700', `${home}/.ssh/`])
  await exec(['ssh-keygen', '-t', 'ed25519', '-f', keyPath, '-N', ''])

  // Configure SSH
  let config = '\n'
  config += `Host ${name}\n`
  config += '  User root\n'
  config += '  IdentityFile ~/.ssh/id_ed25519\n'
  const configPath = `${home}/.ssh/config`
  appendFileSync(configPath, config)

  // Set key in container
  const lxc = ['sudo', 'lxc-attach', '-n', name, '--']
  await exec(lxc.concat(['install', '-m', '0700', '-d', '/root/.ssh/']))
  // TODO: replace with something less ugly
  let sh = 'cat ~/.ssh/id_ed25519.pub | '
  sh += lxc.join(' ')
  sh += ' tee /root/.ssh/authorized_keys'
  await exec(['bash', '-c', sh])
  await exec(lxc.concat(['chmod', '0600', '/root/.ssh/authorized_keys']))
}

export async function init(name: string, script: string): Promise<void> {
  // Turn sctipt into executable
  const random = randomBytes(20).toString('hex')
  const filename = `/lxc-init-${random}`
  const path = `/var/lib/lxc/${name}/rootfs/${filename}`
  writeFileSync(`/tmp${filename}`, `#!/bin/sh\n\n${script}`, {mode: 0o777})
  core.debug(`Wrote /tmp${filename}:\n\n#!/bin/sh\n\n${script}`)

  // Move script into container
  await exec(['sudo', 'mv', `/tmp${filename}`, path])
  core.debug(`Moved  /tmp${filename} to ${path}`)

  // Run script
  core.info(`Executing:\n${script}`)
  const lxc = ['sudo', 'lxc-attach', '-n', name, '--']
  await exec(lxc.concat([filename]))

  // Remove script
  await exec(['sudo', 'rm', path])
}

export async function sshKeyscan(name: string): Promise<void> {
  await exec(['bash', '-c', `ssh-keyscan ${name} &> ~/.ssh/known_hosts`])
}

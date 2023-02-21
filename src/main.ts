import * as core from '@actions/core'
import {
  getIp,
  init,
  installLxc,
  iptablesCleanup,
  setHost,
  sshKeygen,
  sshKeyscan,
  startContainer,
  stopDocker
} from './wait'

const INIT_CENTOS = `
dnf install -y openssh-server
systemctl start sshd.service
systemctl enable sshd.service`

const INIT_DEBIAN = `
apt-get update
apt-get install -yq openssh-server`

async function run(): Promise<void> {
  try {
    const name: string = core.getInput('name')
    const dist: string = core.getInput('dist')
    const release: string = core.getInput('release')
    const cfgHost: boolean = core.getBooleanInput('configure-etc-hosts')
    const cfgSsh: boolean = core.getBooleanInput('configure-ssh') && cfgHost
    const lxcInit: string = core.getInput('lxc-init')

    core.startGroup('Stopping Docker service')
    await stopDocker()
    core.endGroup()

    core.startGroup('Resetting iptables rules')
    await iptablesCleanup()
    core.endGroup()

    core.startGroup('Installing LXC')
    await installLxc()
    core.endGroup()

    core.startGroup(`Starting ${dist} ${release} container`)
    await startContainer(name, dist, release)
    core.endGroup()

    core.startGroup(`Get IP address of container`)
    const ip = await getIp(name)
    core.info(ip)
    core.setOutput('ip', ip)
    core.endGroup()

    if (cfgHost) {
      core.startGroup('Configuring /etc/hosts')
      await setHost(name, ip)
      core.endGroup()
    }

    if (cfgSsh) {
      core.startGroup('Configuring SSH and generating key')
      await sshKeygen(name)
      core.endGroup()
    }

    let script = ''
    if (lxcInit) {
      script = lxcInit
    } else if (cfgSsh) {
      // Automatic SSH server installation for supported distributions
      if (['almalinux', 'centos', 'fedora', 'rockylinux'].includes(dist)) {
        core.info(`Configuring automatic SSH server setup for ${dist}`)
        script = INIT_CENTOS
      } else if (['debian', 'ubuntu'].includes(dist)) {
        core.info(`Configuring automatic SSH server setup for ${dist}`)
        script = INIT_DEBIAN
      }
    }
    if (script) {
      core.startGroup(`Running initialization script`)
      await init(name, script)
      core.endGroup()
    }

    if (cfgSsh) {
      core.startGroup('Import container SSH host keys')
      await sshKeyscan(name)
      core.endGroup()
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()

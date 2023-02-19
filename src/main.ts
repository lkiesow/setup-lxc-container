import * as core from '@actions/core'
import {
  getIp,
  installLxc,
  iptablesCleanup,
  setHost,
  sshKeygen,
  startContainer,
  stopDocker
} from './wait'

async function run(): Promise<void> {
  try {
    const name: string = core.getInput('name')
    const dist: string = core.getInput('dist')
    const release: string = core.getInput('release')
    const configureEtcHost: string = core.getInput('configure-etc-hosts')
    const configureSsh: string = core.getInput('configure-ssh')

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

    if (configureEtcHost) {
      core.startGroup('Configuring /etc/hosts')
      await setHost(name, ip)
      core.endGroup()
    }

    if (configureEtcHost && configureSsh) {
      core.startGroup('Configuring SSH and generating key')
      await sshKeygen(name)
      core.endGroup()
    }
  } catch (error) {
    core.error(`error: ${error}`)
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()

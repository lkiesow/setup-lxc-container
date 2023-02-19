import * as core from '@actions/core'
import {
  getIp,
  installLxc,
  iptablesCleanup,
  setHost,
  startContainer,
  stopDocker
} from './wait'

async function run(): Promise<void> {
  try {
    const name: string = core.getInput('name')
    const dist: string = core.getInput('dist')
    const release: string = core.getInput('release')
    const configureEtcHost: string = core.getInput('configure-etc-hosts')

    core.info('Stopping Docker service')
    await stopDocker()

    core.info('Resetting iptables rules')
    await iptablesCleanup()

    core.info('Installing LXC')
    await installLxc()

    core.info(`Starting ${dist} ${release} container`)
    await startContainer(name, dist, release)

    core.info(`Get IP address of container`)
    const ip = await getIp(name)
    core.info(ip)
    core.setOutput('ip', ip)

    if (configureEtcHost) {
      core.info('Configuring /etc/hosts')
      await setHost(name, ip)
    }
  } catch (error) {
    core.error(`error: ${error}`)
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()

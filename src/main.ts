import * as core from '@actions/core'
import {installLxc, iptablesCleanup, startContainer, stopDocker} from './wait'

async function run(): Promise<void> {
  try {
    const name: string = core.getInput('name')
    const dist: string = core.getInput('dist')
    const release: string = core.getInput('release')

    core.info('Stopping Docker service')
    stopDocker()

    core.info('Resetting iptables rules')
    iptablesCleanup()

    core.info('Installing LXC')
    installLxc()

    core.info(`Starting ${dist} ${release} container`)
    startContainer(name, dist, release)

    core.setOutput('ip', '127.0.0.1')
  } catch (error) {
    core.error(`error: ${error}`)
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()

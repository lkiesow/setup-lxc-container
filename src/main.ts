import * as core from '@actions/core'
import {stopDocker} from './wait'

async function run(): Promise<void> {
  try {
    const ms: string = core.getInput('milliseconds')
    core.debug(`Waiting ${ms} milliseconds ...`) // debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true

    core.debug(new Date().toTimeString())
    await stopDocker()
    core.debug(new Date().toTimeString())

    core.setOutput('ip', '127.0.0.1')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()

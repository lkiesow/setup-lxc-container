/* eslint no-console: 0 */

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
        console.error(`error: ${error.message}`)
        return
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`)
        return
      }
      console.info(`stdout: ${stdout}`)
    }
  )
}

export async function stopDocker(): Promise<string> {
  return new Promise(() => {
    exec(['sudo', 'systemctl', 'stop', 'docker.service'])
  })
}

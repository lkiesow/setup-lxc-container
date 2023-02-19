/* eslint no-console: 0 */

import {ExecException, execFile} from 'child_process'

export async function stopDocker(): Promise<string> {
  return new Promise(() => {
    execFile(
      'sudo',
      ['systemctl', 'stop', 'docker.service'],
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
  })
}

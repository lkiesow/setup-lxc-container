const { exec } = require("child_process");

export async function stopDocker(): Promise<string> {
  return new Promise(resolve => {
    exec('sudo systemctl stop docker.service', (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
  })
}

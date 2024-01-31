import { exec } from "node:child_process";

export default function countCommitsSince(since: string) {
  return new Promise((resolve, reject) => {
    exec(
      `git rev-list --count HEAD --since="${since}"`,
      (error, stdout, stderr) => {
        if (error !== null) {
          reject(error);
        } else if (stderr) {
          reject(stderr);
        } else {
          const maybeNumber = Number.parseInt((stdout || "").trim());
          if (Number.isNaN(maybeNumber)) {
            reject("Could not parse stdout to number:\n" + stdout);
            return;
          }

          resolve(maybeNumber);
        }
      }
    );
  });
}

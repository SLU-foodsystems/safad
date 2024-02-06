import { exec } from "node:child_process";
import { promisify } from "node:util";

export default async function countCommitsSince(since: string) {
  try {
    const { stdout, stderr } = await promisify(exec)(
      `git rev-list --count HEAD --since="${since}"`
    );

    if (stderr) {
      return Promise.reject(stderr);
    }

    const maybeNumber = Number.parseInt((stdout || "").trim());
    if (Number.isNaN(maybeNumber)) {
      return Promise.reject("Could not parse stdout to number:\n" + stdout);
    }

    return maybeNumber;
  } catch (error) {
    return Promise.reject(error);
  }
}

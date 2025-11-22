import Command from "./Command";
import Process from "./Process";

export default class IOProcessor {
  private ioQueue: { process: Process; command: Command; remaining: number }[] =
    [];

  submitIO(process: Process, command: Command) {
    this.ioQueue.push({ process, command, remaining: command.executionTime });
    process.state = "BLOCKED_IO";
  }

  tick() {
    const done: { process: Process; command: Command }[] = [];

    this.ioQueue = this.ioQueue.filter((item) => {
      item.remaining--;
      if (item.remaining <= 0) {
        done.push({ process: item.process, command: item.command });
        return false;
      }
      return true;
    });

    return done;
  }
}

import Process from "./Process";
import Command from "./Command";

export default class IOProcessor {
  private ioQueue: Array<{ process: Process; command: Command; remaining: number }>;

  constructor() {
    this.ioQueue = [];
  }

  submitIO(process: Process, command: Command) {
    this.ioQueue.push({ process, command, remaining: command.executionTime });
    process.state = "BLOCKED_IO";
  }

  tick() {
    for (const item of this.ioQueue) {
      if (item.remaining > 0) item.remaining -= 1;
    }
    // Завершить готовые
    const done: Array<{ process: Process; command: Command }> = [];
    this.ioQueue = this.ioQueue.filter((it) => {
      if (it.remaining <= 0) {
        done.push({ process: it.process, command: it.command });
        return false;
      }
      return true;
    });
    return done;
  }
}



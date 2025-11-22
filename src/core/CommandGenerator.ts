import { commandsConfig } from "../config";
import Command, { CommandType, Operation } from "./Command";
import Process from "./Process";

export default class CommandGenerator {
  computeProb = commandsConfig.computeProb;
  ioProb = commandsConfig.ioProb;
  errorProb = commandsConfig.errorProb;
  ioMin = commandsConfig.ioMinTime;
  ioMax = commandsConfig.ioMaxTime;

  generateCommand(process: Process): Command {
    if (process.pc >= process.totalInstructions - 1) {
      return new Command("EXIT", undefined, 0, 0, 0, 1);
    }

    const r = Math.random();
    let type: CommandType = "COMPUTE";
    if (r < this.errorProb.value) {
      type = "ERROR";
    } else if (r < this.errorProb.value + this.ioProb.value) {
      type = "IO";
    } else if (
      r >=
      this.errorProb.value + this.ioProb.value + this.computeProb.value
    ) {
      type = "COMPUTE";
    }

    if (type === "COMPUTE") {
      const { operand1, operand2, resultAddr } = this.generateOperands(
        process.memory.getSize(),
      );
      return new Command(
        "COMPUTE",
        this.getRandomOperation(),
        operand1,
        operand2,
        resultAddr,
        1,
      );
    } else if (type === "IO") {
      const execTime = this.getRandomInt(this.ioMin.value, this.ioMax.value);
      return new Command("IO", undefined, 0, 0, 0, execTime);
    } else {
      return new Command("ERROR", undefined, 0, 0, 0, 1);
    }
  }

  private generateOperands(memorySize: number) {
    const addr = () => this.getRandomInt(0, memorySize - 1);
    return { operand1: addr(), operand2: addr(), resultAddr: addr() };
  }

  private getRandomOperation(): Operation {
    const ops: Operation[] = ["ADD", "SUB", "MUL", "DIV", "CMP"];
    return ops[this.getRandomInt(0, ops.length - 1)];
  }

  private getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

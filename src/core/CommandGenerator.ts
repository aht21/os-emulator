import Command, { CommandType, Operation } from "./Command";
import Process from "./Process";
import appConfig from "../config";

export default class CommandGenerator {
  computeProb: number;
  ioProb: number;
  errorProb: number;
  ioMin: number;
  ioMax: number;

  constructor() {
    const cfg = appConfig.commands;
    this.computeProb = cfg.computeProb;
    this.ioProb = cfg.ioProb;
    this.errorProb = cfg.errorProb;
    this.ioMin = cfg.ioMinTime;
    this.ioMax = cfg.ioMaxTime;
  }

  generateCommand(process: Process): Command {
    const r = Math.random();
    let type: CommandType = "COMPUTE";
    if (r < this.errorProb) type = "ERROR";
    else if (r < this.errorProb + this.ioProb) type = "IO";
    else if (process.pc >= process.totalInstructions - 1) type = "EXIT";
    else type = "COMPUTE";

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
    }
    if (type === "IO") {
      const execTime = this.getRandomInt(this.ioMin, this.ioMax);
      return new Command("IO", undefined, 0, 0, 0, execTime);
    }
    if (type === "EXIT") {
      return new Command("EXIT", undefined, 0, 0, 0, 1);
    }
    return new Command("ERROR", undefined, 0, 0, 0, 1);
  }

  private generateOperands(memorySize: number) {
    const addr = () => this.getRandomInt(0, Math.max(0, memorySize - 1));
    return { operand1: addr(), operand2: addr(), resultAddr: addr() };
  }

  private getRandomOperation(): Operation {
    const ops: Operation[] = ["ADD", "SUB", "MUL", "DIV", "CMP"];
    return ops[this.getRandomInt(0, ops.length - 1)];
  }

  private getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}



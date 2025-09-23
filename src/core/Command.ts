import Memory from "./Memory";

export type CommandType = "COMPUTE" | "IO" | "EXIT" | "ERROR";
export type Operation = "ADD" | "SUB" | "MUL" | "DIV" | "CMP";

export default class Command {
  type: CommandType;
  operation?: Operation;
  operand1: number;
  operand2: number;
  resultAddr: number;
  executionTime: number;
  completed: boolean;

  constructor(
    type: CommandType,
    operation?: Operation,
    operand1: number = 0,
    operand2: number = 0,
    resultAddr: number = 0,
    executionTime: number = 1,
  ) {
    this.type = type;
    this.operation = operation;
    this.operand1 = operand1;
    this.operand2 = operand2;
    this.resultAddr = resultAddr;
    this.executionTime = executionTime;
    this.completed = false;
  }

  execute(memory: Memory): number | null {
    if (this.type !== "COMPUTE" || !this.operation) return null;
    const a = memory.read(this.operand1);
    const b = memory.read(this.operand2);
    let res = 0;
    switch (this.operation) {
      case "ADD":
        res = a + b;
        break;
      case "SUB":
        res = a - b;
        break;
      case "MUL":
        res = a * b;
        break;
      case "DIV":
        res = b !== 0 ? Math.trunc(a / b) : 0;
        break;
      case "CMP":
        res = a === b ? 0 : a > b ? 1 : -1;
        break;
    }
    memory.write(this.resultAddr, res);
    this.completed = true;
    return res;
  }

  isComplete(): boolean {
    return this.completed;
  }

  getDescription(): string {
    if (this.type === "COMPUTE" && this.operation) {
      return `COMPUTE:${this.operation} [${this.operand1},${this.operand2}] -> ${this.resultAddr}`;
    }
    return this.type;
  }
}



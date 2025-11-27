import Process from "./Process";
import { generatorConfig, schedulerConfig } from "./config";

export default class JobGenerator {
  counter = 0;

  generateProcess(): Process {
    const { minMemory, maxMemory, minInstructions, maxInstructions } =
      generatorConfig;

    this.counter += 1;
    const pid = this.counter;
    const memorySize = this.getRandomInt(minMemory.value, maxMemory.value);
    const totalInstructions = this.getRandomInt(
      minInstructions.value,
      maxInstructions.value,
    );
    const { minPriority, maxPriority, basePriority } = schedulerConfig;
    const randomPriority =
      this.getRandomInt(minPriority.value, maxPriority.value) ||
      basePriority.value;

    return new Process(pid, memorySize, totalInstructions, randomPriority);
  }

  getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

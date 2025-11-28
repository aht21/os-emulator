import Process from "./Process";
import { generatorConfig, schedulerConfig } from "./config";

export default class JobGenerator {
  minMemory = generatorConfig.minMemory;
  maxMemory = generatorConfig.maxMemory;
  minInstructions = generatorConfig.minInstructions;
  maxInstructions = generatorConfig.maxInstructions;
  counter = 0;

  generateProcess(): Process {
    this.counter += 1;
    const pid = this.counter;
    const memorySize = this.getRandomInt(
      this.minMemory.value,
      this.maxMemory.value,
    );
    const totalInstructions = this.getRandomInt(
      this.minInstructions.value,
      this.maxInstructions.value,
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

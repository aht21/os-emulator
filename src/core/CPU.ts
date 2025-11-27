import { ref } from "vue";
import Process from "./Process";
import { cpuConfig } from "./config";

export default class CPU {
  activeProcesses = ref<Process[]>([]);
  state = cpuConfig.state;
  threadCount = cpuConfig.threadCount;
  ticksPerSecond = cpuConfig.ticksPerSecond;

  setProcess(process: Process) {
    if (this.activeProcesses.value.length >= this.threadCount.value) {
      throw new Error(
        `CPU уже выполняет максимальное количество процессов (${this.threadCount.value})`,
      );
    }

    this.activeProcesses.value.push(process);
    if (process.state === "READY") {
      process.setRunning();
    }
    this.state.value = "WORKING";
  }

  clearProcess(process: Process) {
    const index = this.activeProcesses.value.indexOf(process);
    if (index !== -1) {
      this.activeProcesses.value.splice(index, 1);
    }
    if (this.activeProcesses.value.length === 0) {
      this.state.value = "IDLE";
    }
  }

  clearAll() {
    this.activeProcesses.value = [];
    this.state.value = "IDLE";
  }

  tick() {
    for (let i = this.activeProcesses.value.length - 1; i >= 0; i--) {
      const process = this.activeProcesses.value[i];
      process.tick();

      if (process.isTerminated()) {
        this.activeProcesses.value.splice(i, 1);
      }
    }

    if (this.activeProcesses.value.length === 0) {
      this.state.value = "IDLE";
    }
  }

  getAllActiveProcesses(): Process[] {
    return [...this.activeProcesses.value] as Process[];
  }

  isQuantumExpired(process: Process): boolean {
    return process.state === "RUNNING" && process.pc % 5 === 0;
  }

  hasFreeThreads(): boolean {
    return this.activeProcesses.value.length < this.threadCount.value;
  }
}

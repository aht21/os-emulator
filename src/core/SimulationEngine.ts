import { watch } from "vue";
import { cpuConfig } from "../config";
import OS from "./OS";

export default class SimulationEngine {
  os: OS;
  intervalId: number | null = null;
  autoIntervalId: number | null = null;
  ticksPerSecond = cpuConfig.ticksPerSecond;
  workingTimeSeconds = 0;
  private elapsedMs = 0;

  private autoModeEnabled = false;

  constructor(os: OS) {
    this.os = os;

    watch(
      () => this.ticksPerSecond.value,
      (newVal) => {
        if (this.intervalId !== null) {
          clearInterval(this.intervalId);
          const interval = 1000 / newVal;
          this.intervalId = window.setInterval(() => {
            this.os.tick();
            this.updateWorkingTime(interval);
          }, interval);
        }
      },
    );
  }

  start() {
    if (this.intervalId) return;

    const interval = 1000 / this.ticksPerSecond.value;

    this.intervalId = window.setInterval(() => {
      this.os.tick();
      this.updateWorkingTime(interval);
    }, interval);
  }

  stop() {
    this.clearInterval("intervalId");
  }

  reboot() {
    this.stop();
    this.clearInterval("autoIntervalId");

    this.os.processTable.clearProcesses();
    this.os.initialize();

    this.workingTimeSeconds = 0;
    this.elapsedMs = 0;

    if (this.autoModeEnabled) this.enableAuto();
  }

  private updateWorkingTime(intervalMs: number) {
    this.elapsedMs += intervalMs;
    if (this.elapsedMs >= 1000) {
      this.workingTimeSeconds++;
      this.elapsedMs -= 1000;
    }
  }

  getWorkingTimeFormatted() {
    const h = Math.floor(this.workingTimeSeconds / 3600);
    const m = Math.floor((this.workingTimeSeconds % 3600) / 60);
    const s = this.workingTimeSeconds % 60;
    const pad = (n: number) => `${n}`.padStart(2, "0");

    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  setAutoMode(enabled: boolean) {
    if (this.autoModeEnabled === enabled) return;

    this.autoModeEnabled = enabled;

    if (enabled) {
      this.enableAuto();
    } else {
      this.clearInterval("autoIntervalId");
    }
  }

  isAutoModeEnabled() {
    return this.autoModeEnabled;
  }

  private enableAuto() {
    if (this.autoIntervalId) return;

    const intervalMs = 200;

    this.autoIntervalId = window.setInterval(() => {
      if (this.autoModeEnabled) this.tryAutoFill();
    }, intervalMs);
  }

  private tryAutoFill() {
    if (!this.os.processTable.hasSpace()) return;

    try {
      this.os.loadProcess();
    } catch {
      // Пробуем снова на следующем цикле
    }
  }

  private clearInterval(name: "intervalId" | "autoIntervalId") {
    const id = this[name];
    if (id) {
      clearInterval(id);
      this[name] = null;
    }
  }
}

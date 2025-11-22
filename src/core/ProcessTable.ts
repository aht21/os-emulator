import { Ref, ref } from "vue";
import Process from "./Process";

export default class ProcessTable {
  maxProcesses: number;
  processes: Ref<Process[]>;

  constructor(maxProcesses: number) {
    this.maxProcesses = maxProcesses;
    this.processes = ref([]);
  }

  hasSpace(): boolean {
    return this.processes.value.length < this.maxProcesses;
  }

  addProcess(process: Process) {
    const list = this.processes.value;

    if (list.length >= this.maxProcesses) {
      throw new Error("Таблица процессов заполнена!");
    }

    if (list.some((p) => p.id === process.id)) {
      throw new Error(`Процесс с PID "${process.id}" уже существует!`);
    }

    list.push(process);
  }

  removeProcess(id: number) {
    const list = this.processes.value;
    const index = list.findIndex((p) => p.id === id);

    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  getProcesses(): Process[] {
    return [...this.processes.value];
  }

  getProcess(id: number): Process | undefined {
    return this.processes.value.find((p) => p.id === id);
  }

  clearProcesses(): void {
    this.processes.value = [];
  }
}

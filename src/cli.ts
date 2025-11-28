import readline from "readline";
import OS from "./core/OS";
import { cpuConfig, schedulerConfig, systemConfig } from "./core/config";

const os = new OS();
let activeInterval: NodeJS.Timeout | null = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "os> ",
});

function renderProcessTable() {
  console.clear();
  console.log("=== Таблица процессов (PSW) ===");

  const processes = os.processTable.getProcesses();
  const tableData = processes.map((p) => {
    const cmdDesc = p.currentCommand ? p.currentCommand.type : "-";

    return {
      PID: p.id,
      State: p.state,
      PC: p.pc,
      Pri: p.dynamicPriority,
      Run: p.runTicks,
      Wait: p.waitTicks,
      Cmd: cmdDesc,
    };
  });

  if (tableData.length === 0) {
    console.log("Нет активных процессов.");
  } else {
    console.table(tableData);
  }

  const activeProcs = os.cpu.getAllActiveProcesses();
  const activePids = activeProcs.map((p) => p.id).join(", ");

  console.log(
    `CPU State: [${os.cpu.state}] | Threads: ${activeProcs.length}/${os.cpu.threadCount} | Running PIDs: ${activePids || "None"}`,
  );
  console.log("\n(Нажмите /ps снова для остановки автообновления)");
}

function renderMemoryStats() {
  const total = os.memoryManager.totalMemory.value;
  const free = os.memoryManager.freeMemory.value;
  const used = os.memoryManager.filledMemory.value;

  console.log(`\n=== Memory Statistics ===`);
  console.log(`Total: ${total}`);
  console.log(`Used:  ${used}`);
  console.log(`Free:  ${free}`);
  console.log(`Usage: ${((used / total) * 100).toFixed(1)}%\n`);
}

function renderSystemScreen() {
  console.clear();
  console.log("=== Монитор параметров ОС ===\n");

  const q = schedulerConfig.quantum.value;
  const minP = schedulerConfig.minPriority.value;
  const maxP = schedulerConfig.maxPriority.value;
  console.log(
    `Config: Mem=${systemConfig.totalMemory.value}, Threads=${cpuConfig.threadCount.value}, Quantum=${q}, Priority=[${minP}-${maxP}]`,
  );

  const totalTicks = os.metrics.totalTicks.value;
  const completed = os.metrics.completedProcessesCount.value;
  const cpuUtil =
    totalTicks > 0
      ? (os.metrics.busyThreadTicks /
          (totalTicks * cpuConfig.threadCount.value)) *
        100
      : 0;

  const throughput = totalTicks > 0 ? completed / totalTicks : 0;

  console.log(`Metrics: Ticks=${totalTicks}, Completed=${completed}`);
  console.log(`CPU Util: ${cpuUtil.toFixed(1)}%`);
  console.log(`Throughput: ${throughput.toFixed(4)} proc/tick`);
  console.log(
    `Avg Ready Queue: ${(os.metrics.readyQueueSamples / (os.metrics.readyQueueSamplesCount || 1)).toFixed(2)}`,
  );

  console.log(`\nLast Executed PIDs: [${os.metrics.lastExecuted.join(", ")}]`);

  console.log("\n-- Active Processes Snapshot --");
  const briefTable = os.processTable
    .getProcesses()
    .map((p) => ({
      ID: p.id,
      St: p.state,
      Pri: p.dynamicPriority,
      Life: os.metrics.totalTicks.value - (p.arrivalTick || 0),
    }))
    .slice(0, 10);

  console.table(briefTable);
  if (os.processTable.getProcesses().length > 10)
    console.log("... (displayed top 10)");
}

function renderPerformance() {
  console.clear();
  console.log("=== Анализ производительности ===");

  const completedCount = os.metrics.completedProcessesCount.value;
  const totalTicks = os.metrics.totalTicks.value;

  const avgService =
    os.metrics.completedProcessesCount.value > 0
      ? os.metrics.sumService / os.metrics.completedProcessesCount.value
      : 0;

  console.log(`Total Ticks:      ${totalTicks}`);
  console.log(`Completed Jobs:   ${completedCount}`);
  console.log(`Avg Service Time: ${avgService.toFixed(2)} ticks`);

  if (avgService > 0) {
    const idealMonoThroughput = totalTicks / avgService;
    const efficiency = (completedCount / idealMonoThroughput) * 100;
    console.log(
      `Ideal Mono Count: ${idealMonoThroughput.toFixed(2)} (Theoretical)`,
    );
    console.log(
      `Efficiency ratio: ${efficiency.toFixed(1)}% (vs Serial execution)`,
    );
  } else {
    console.log("Недостаточно данных для расчета эффективности.");
  }
}

function stopAutoRefresh() {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
    console.log(">> Автообновление остановлено.");
  }
}

function startAutoRefresh(callback: () => void, interval = 500) {
  stopAutoRefresh();
  callback(); // Сразу отрисовать первый кадр
  activeInterval = setInterval(callback, interval);
}

console.log("OS Emulator (CLI mode)");
console.log("Введите /? для справки.");

rl.on("line", (line) => {
  const cmd = line.trim().toLowerCase();

  if (
    !["/ps", "/screen", "/perf", "/analysis"].includes(cmd) &&
    activeInterval
  ) {
    stopAutoRefresh();
  }

  switch (cmd) {
    case "/start":
      os.simEngine.start();
      console.log("Симуляция запущена.");
      break;

    case "/stop":
      os.simEngine.stop();
      console.log("Симуляция остановлена.");
      break;

    case "/gen":
      try {
        const p = os.loadProcess();
        console.log(`[OK] Процесс PID=${p.id} создан и поставлен в очередь.`);
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.error(`[Error] Не удалось создать процесс: ${e.message}`);
        } else {
          console.error(`[Error] Неизвестная ошибка`, e);
        }
      }
      break;

    case "/init":
      try {
        os.initialLoad();
        console.log(
          `[OK] Начальная загрузка выполнена. Процессов: ${os.processTable.getProcesses().length}`,
        );
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.error(`[Error] ${e.message}`);
        } else {
          console.error(`[Error] Неизвестная ошибка`, e);
        }
      }
      break;

    case "/ps":
      if (activeInterval) stopAutoRefresh();
      else startAutoRefresh(renderProcessTable);
      break;

    case "/screen":
      if (activeInterval) stopAutoRefresh();
      else startAutoRefresh(renderSystemScreen);
      break;

    case "/perf":
      if (activeInterval) stopAutoRefresh();
      else startAutoRefresh(renderPerformance);
      break;

    case "/mem":
      renderMemoryStats();
      break;

    case "/reboot":
      os.simEngine.stop();
      os.simEngine.reboot();
      console.log("Система перезагружена. Память очищена.");
      break;

    case "/exit":
      rl.close();
      process.exit(0);
      break;

    case "/?":
    case "/help":
      console.log(`
Commands:
  /start    - Запуск симуляции
  /stop     - Пауза
  /gen      - Создать один случайный процесс
  /init     - Заполнить память процессами (Initial Load)
  /ps       - Таблица процессов (вкл/выкл автообновление)
  /screen   - Общий монитор ресурсов (вкл/выкл)
  /mem      - Статистика памяти
  /perf     - Оценка производительности
  /reboot   - Сброс системы
  /exit     - Выход
      `);
      break;

    default:
      if (cmd !== "")
        console.log("Неизвестная команда. Введите /? для справки.");
  }

  rl.prompt();
});

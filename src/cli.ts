import readline from "readline";
import appConfig from "./config";
import OS from "./core/OS";

const os = new OS({
  totalMemory: appConfig.system.totalMemory,
  maxProcesses: appConfig.system.maxProcesses,
});

let psInterval: ReturnType<typeof setInterval> | null = null;

function renderPS() {
  console.clear();
  console.log("Таблица процессов (автообновление)");
  console.table(os.getPSWTable());
  const activeProcesses = os.cpu.getAllActiveProcesses();
  console.log(
    `CPU: ${os.cpu.state} | Активных процессов: ${activeProcesses.length}/${os.cpu.maxThreads} | Активные PID: ${activeProcesses.map(p => p.id).join(', ') || '-'}`,
  );
  console.log("Нажмите /ps ещё раз, чтобы остановить автообновление.");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "os> ",
});

const helpText = `
Доступные команды:
/start   — запустить симуляцию
/stop    — остановить симуляцию
/gen     — сгенерировать новый процесс
/init    — начальная загрузка (генерировать и загрузить пока хватает памяти)
/ps      — список процессов
/screen  — интерактивная индикация параметров системы
/mem     — показать статистику памяти
/exit    — выйти из программы
/?       — показать эту справку

Алгоритм планировщика: Относительные приоритеты
- Каждый READY-процесс стареет: priority += agingStep (до maxPriority)
- RUNNING получает штраф: priority -= runPenaltyStep (до minPriority)
- Выбор: процесс с максимальным dynamicPriority
- Квант: ${appConfig.scheduler.quantum} тактов; по исчерпании — возврат в READY
`;

console.log("OS Emulator (CLI mode)");
console.log(helpText);

rl.prompt();

rl.on("line", (line) => {
  const cmd = line.trim();

  switch (cmd) {
    case "/start":
      os.simEngine.start();
      console.log("Симуляция запущена");
      break;

    case "/stop":
      os.simEngine.stop();
      console.log("Симуляция остановлена");
      break;

    case "/gen":
      try {
        const { minMemory, maxMemory, minInstructions, maxInstructions } =
          appConfig.generator;
        const p = os.generateJob(
          minMemory,
          maxMemory,
          minInstructions,
          maxInstructions,
        );
        if (os.canLoad(p.memorySize)) {
          os.loadProcess(p);
          console.log(`Процесс создан и загружен: PID=${p.id}`);
        } else {
          console.log(
            `Недостаточно памяти для загрузки процесса PID=${p.id} (size=${p.memorySize}). Свободно=${os.memoryManager.getFreeMemory()}`,
          );
        }
      } catch (e) {
        console.error("Ошибка генерации процесса:", e);
      }
      break;

    case "/init":
      try {
        const { minMemory, maxMemory, minInstructions, maxInstructions } =
          appConfig.generator;
        os.initialLoad(minMemory, maxMemory, minInstructions, maxInstructions);
        console.log("Начальная загрузка завершена");
      } catch (e) {
        console.error("Ошибка начальной загрузки:", e);
      }
      break;

    case "/ps":
      if (psInterval) {
        clearInterval(psInterval);
        psInterval = null;
        console.log("Автообновление таблицы процессов остановлено.");
      } else {
        renderPS();
        psInterval = setInterval(renderPS, 500);
      }
      break;

    case "/screen": {
      const renderScreen = () => {
        console.clear();
        console.log("Модель ОС — Индикация параметров\n");
        // Постоянная информация
        console.log("Постоянно: Алгоритм — Относительные приоритеты; Управление — /start, /stop, /ps, /screen, /mem, /?\n");
        // Параметры системы
        const sys = appConfig.system;
        console.log(`Система: Память=${sys.totalMemory}, Таблица процессов=${sys.maxProcesses}, Потоков ЦП=${appConfig.simulation.threadCount}`);
        // Параметры генератора
        const gen = appConfig.generator;
        console.log(`Задание: Память[${gen.minMemory}-${gen.maxMemory}], Команды[${gen.minInstructions}-${gen.maxInstructions}]`);
        // Параметры планировщика
        const sch = appConfig.scheduler;
        console.log(`Планировщик: квант=${sch.quantum}, приоритет[${sch.minPriority}-${sch.maxPriority}], agingStep=${sch.agingStep}/${sch.agingIntervalTicks}, penalty=${sch.runPenaltyStep}`);
        // Параметры CPU
        const active = os.cpu.getAllActiveProcesses();
        const stats = os.getSystemParams();
        console.log(`CPU: состояние=${os.cpu.state}, активных=${active.length}/${os.cpu.maxThreads}, утилизация=${(stats.cpuUtilization*100).toFixed(1)}%`);
        // Последовательность
        console.log(`Последние процессы: ${stats.lastExecuted.join(", ") || "-"}`);
        // Очереди/средние
        console.log(`Очередь READY(avg)=${stats.avgReadyLen.toFixed(2)}, Выполнено=${stats.completed}, AvgWait=${stats.avgWaiting.toFixed(2)}, AvgTurn=${stats.avgTurnaround.toFixed(2)}, Throughput=${stats.throughputPerTick.toFixed(3)} per tick\n`);
        // Таблица процессов (все параметры на одном окне)
        console.table(
          os.processTable.getProcesses().map((p) => ({
            PID: p.id,
            State: p.state,
            PC: p.pc,
            PriBase: (p as any).basePriority,
            PriDyn: (p as any).dynamicPriority,
            Run: (p as any).runTicks,
            Wait: (p as any).waitTicks,
            Arr: (p as any).arrivalTick ?? "",
            Start: (p as any).startTick ?? "",
            End: (p as any).endTick ?? "",
            Cmd: (p as any).getCurrentCommandDescription ? (p as any).getCurrentCommandDescription() : "",
          })),
        );
      };
      renderScreen();
      if (psInterval) clearInterval(psInterval);
      psInterval = setInterval(renderScreen, 500);
      break;
    }

    case "/mem":
      const mem = os.getMemoryStats();
      console.log(
        `Память: total=${mem.total}, used=${mem.used}, free=${mem.free}`,
      );
      break;

    case "/exit":
      rl.close();
      break;

    case "/?":
      console.log(helpText);
      break;

    default:
      console.log(
        "Неизвестная команда:",
        cmd,
        "\nВведите /? для списка команд",
      );
  }

  rl.prompt();
}).on("close", () => {
  console.log("Завершение работы CLI");
  process.exit(0);
});

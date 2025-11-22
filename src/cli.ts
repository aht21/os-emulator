import readline from "readline";
import {
  cpuConfig,
  generatorConfig,
  schedulerConfig,
  systemConfig,
} from "./config";
import OS from "./core/OS";

const os = new OS();

let psInterval: ReturnType<typeof setInterval> | null = null;

function renderPS() {
  console.clear();
  console.log("Таблица процессов (автообновление)");
  console.table(os.getPSWTable());
  const activeProcesses = os.cpu.getAllActiveProcesses();
  console.log(
    `CPU: ${os.cpu.state} | Активных процессов: ${activeProcesses.length}/${os.cpu.maxThreads} | Активные PID: ${activeProcesses.map((p) => p.id).join(", ") || "-"}`,
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
/analysis — разложение T_mono/T_multi по процессам
/perf     — производительность vs. монорежим
/reboot  — перезапустить ОС (очистить состояние)
/exit    — выйти из программы
/?       — показать эту справку

Алгоритм планировщика: Относительные приоритеты
- Каждый READY-процесс стареет: priority += agingStep (до maxPriority)
- RUNNING получает штраф: priority -= runPenaltyStep (до minPriority)
- Выбор: процесс с максимальным dynamicPriority
- Квант: ${schedulerConfig.quantum} тактов; по исчерпании — возврат в READY
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
        const p = os.loadProcess();
        console.log(`Процесс создан и загружен: PID=${p.id}`);
      } catch (e) {
        console.error("Ошибка генерации процесса:", e);
      }
      break;

    case "/init":
      try {
        os.initialLoad();
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
        console.log(
          "Постоянно: Алгоритм — Относительные приоритеты; Управление — /start, /stop, /ps, /screen, /mem, /?\n",
        );
        // Параметры системы
        console.log(
          `Система: Память=${systemConfig.totalMemory.value}, Таблица процессов=${systemConfig.maxProcesses.value}, Потоков ЦП=${cpuConfig.threadCount.value}`,
        );
        // Параметры генератора
        const gen = generatorConfig;
        console.log(
          `Задание: Память[${gen.minMemory}-${gen.maxMemory}], Команды[${gen.minInstructions}-${gen.maxInstructions}]`,
        );
        // Параметры планировщика
        const sch = schedulerConfig;
        console.log(
          `Планировщик: квант=${sch.quantum}, приоритет[${sch.minPriority}-${sch.maxPriority}], agingStep=${sch.agingStep}/${sch.agingIntervalTicks}, penalty=${sch.runPenaltyStep}`,
        );
        // Параметры CPU
        const active = os.cpu.getAllActiveProcesses();
        const stats = os.getSystemParams();
        console.log(
          `CPU: состояние=${os.cpu.state}, активных=${active.length}/${os.cpu.maxThreads}, утилизация=${(stats.cpuUtilization * 100).toFixed(1)}%`,
        );
        // Последовательность
        console.log(
          `Последние процессы: ${stats.lastExecuted.join(", ") || "-"}`,
        );
        // Очереди/средние
        console.log(
          `Очередь READY(avg)=${stats.avgReadyLen.toFixed(2)}, Выполнено=${stats.completed}, AvgWait=${stats.avgWaiting.toFixed(2)}, AvgTurn=${stats.avgTurnaround.toFixed(2)}, Throughput=${stats.throughputPerTick.toFixed(3)} per tick\n`,
        );
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
            Cmd: (p as any).getCurrentCommandDescription
              ? (p as any).getCurrentCommandDescription()
              : "",
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

    case "/analysis": {
      const renderAnalysis = () => {
        console.clear();
        console.log(
          "Анализ: компактная таблица T_mono/T_multi (повторный /analysis остановит автообновление)\n",
        );
        console.log(
          [
            "St: состояние",
            "Instr: число команд",
            "Run: отработанные тики",
            "Wait: тики ожидания (READY)",
            "IO: длительность I/O",
            "OvhIO: инициализация I/O + ISR",
            "OvhCtx: переключения контекста",
            "Tm: T_mono",
            "Tt: T_multi",
          ].join(" | "),
        );
        console.log("");
        const table = os.getTimeBreakdownTable();
        const compact = table.map((r: any) => ({
          PID: r.PID,
          St: r.State,
          Instr: r.totalInstructions,
          Run: r.runTicks,
          Wait: r.waitTicks,
          IO: r.ioBusyTicks,
          OvhIO: r.ioInitOverheadTicks + r.ioInterruptServiceTicks,
          OvhCtx: r.contextSwitchOverheadTicks,
          Tm: r.T_mono,
          Tt: r.T_multi ?? "-",
        }));
        console.table(compact);
      };
      if (psInterval) {
        clearInterval(psInterval);
        psInterval = null;
        console.log("Автообновление analysis остановлено.");
      } else {
        renderAnalysis();
        psInterval = setInterval(renderAnalysis, 500);
      }
      break;
    }

    case "/perf": {
      const renderPerf = () => {
        console.clear();
        console.log(
          "Производительность (auto-refresh): /perf снова — остановка\n",
        );
        const perf = os.getMonoMultiMetrics();
        console.log(
          `Ticks=${perf.totalTicks}, Completed=${perf.completedCount}, Avg T_mono=${perf.avgTmono.toFixed(2)} такт.`,
        );
        console.log(
          `Моно-возможные завершения: ${perf.monoPossibleCompleted.toFixed(2)}; Фактически завершено: ${perf.completedCount}`,
        );
        console.log(
          `Производительность (к мультипрограммированию): ${perf.performancePercent.toFixed(1)}%`,
        );
        if (perf.details && perf.details.length > 0) {
          const head = perf.details.slice(-5);
          console.log("Последние процессы (до 5):");
          console.table(head);
        }
      };
      if (psInterval) {
        clearInterval(psInterval);
        psInterval = null;
        console.log("Автообновление perf остановлено.");
      } else {
        renderPerf();
        psInterval = setInterval(renderPerf, 500);
      }
      break;
    }

    case "/reboot":
      os.simEngine.reboot();
      console.log("ОС перезапущена");
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

import readline from "readline";
import appConfig from "./config";
import OS from "./core/OS";

const os = new OS({
  totalMemory: appConfig.system.totalMemory,
  maxProcesses: appConfig.system.maxProcesses,
});

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
      console.table(os.getPSWTable());
      break;

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
  console.log("👋 Завершение работы CLI");
  process.exit(0);
});

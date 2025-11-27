import {
  systemConfig,
  cpuConfig,
  generatorConfig,
  schedulerConfig,
  commandsConfig,
  simulationConfig,
} from "../config";
import preset from "./rndConfig.json"; // Импорт JSON пресета

/**
 * Утилита для получения случайного целого числа в диапазоне [min, max]
 */
const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Утилита для выбора случайного элемента из массива
 */
const getRandomChoice = <T>(options: T[]): T => {
  const index = Math.floor(Math.random() * options.length);
  return options[index];
};

/**
 * Основная функция для рандомизации конфигурации
 */
export const randomizeConfig = () => {
  systemConfig.totalMemory.value = getRandomInt(
    preset.system.totalMemory[0],
    preset.system.totalMemory[1],
  );
  systemConfig.maxProcesses.value = getRandomInt(
    preset.system.maxProcesses[0],
    preset.system.maxProcesses[1],
  );
  cpuConfig.ticksPerSecond.value = getRandomInt(
    preset.cpu.ticksPerSecond[0],
    preset.cpu.ticksPerSecond[1],
  );
  cpuConfig.threadCount.value = getRandomChoice(preset.cpu.threadCount);
  cpuConfig.state.value = "IDLE";

  const genMinMem = getRandomInt(
    preset.generator.minMemory[0],
    preset.generator.minMemory[1],
  );
  const genMaxMem = getRandomInt(
    Math.max(genMinMem, preset.generator.maxMemory[0]),
    preset.generator.maxMemory[1],
  );
  generatorConfig.minMemory.value = genMinMem;
  generatorConfig.maxMemory.value = genMaxMem;

  const genMinInstr = getRandomInt(
    preset.generator.minInstructions[0],
    preset.generator.minInstructions[1],
  );
  const genMaxInstr = getRandomInt(
    Math.max(genMinInstr, preset.generator.maxInstructions[0]),
    preset.generator.maxInstructions[1],
  );
  generatorConfig.minInstructions.value = genMinInstr;
  generatorConfig.maxInstructions.value = genMaxInstr;

  schedulerConfig.quantum.value = getRandomInt(
    preset.scheduler.quantum[0],
    preset.scheduler.quantum[1],
  );

  const prioStart = preset.scheduler.priorityRange[0];
  const prioEnd = preset.scheduler.priorityRange[1];
  const p1 = getRandomInt(prioStart, prioEnd);
  const p2 = getRandomInt(prioStart, prioEnd);

  schedulerConfig.minPriority.value = Math.min(p1, p2);
  schedulerConfig.maxPriority.value = Math.max(p1, p2);
  schedulerConfig.basePriority.value = getRandomInt(
    schedulerConfig.minPriority.value,
    schedulerConfig.maxPriority.value,
  );

  schedulerConfig.agingStep.value = getRandomInt(
    preset.scheduler.agingStep[0],
    preset.scheduler.agingStep[1],
  );
  schedulerConfig.runPenaltyStep.value = getRandomInt(
    preset.scheduler.runPenaltyStep[0],
    preset.scheduler.runPenaltyStep[1],
  );
  schedulerConfig.agingIntervalTicks.value = getRandomInt(
    preset.scheduler.agingIntervalTicks[0],
    preset.scheduler.agingIntervalTicks[1],
  );

  const wCompute = getRandomInt(
    preset.commands.weights.compute[0],
    preset.commands.weights.compute[1],
  );
  const wIo = getRandomInt(
    preset.commands.weights.io[0],
    preset.commands.weights.io[1],
  );
  const wError = getRandomInt(
    preset.commands.weights.error[0],
    preset.commands.weights.error[1],
  );

  const totalWeight = wCompute + wIo + wError;

  const rawCompute = wCompute / totalWeight;
  const rawIo = wIo / totalWeight;

  commandsConfig.computeProb.value = Number(rawCompute.toFixed(2));
  commandsConfig.ioProb.value = Number(rawIo.toFixed(2));
  commandsConfig.errorProb.value = Number(
    (
      1 -
      commandsConfig.computeProb.value -
      commandsConfig.ioProb.value
    ).toFixed(2),
  );

  const ioMin = getRandomInt(
    preset.commands.ioMinTime[0],
    preset.commands.ioMinTime[1],
  );
  const ioMax = getRandomInt(
    Math.max(ioMin, preset.commands.ioMaxTime[0]),
    preset.commands.ioMaxTime[1],
  );

  commandsConfig.ioMinTime.value = ioMin;
  commandsConfig.ioMaxTime.value = ioMax;

  simulationConfig.removeTerminatedAfterTicks.value = getRandomInt(
    preset.simulation.removeTerminatedAfterTicks[0],
    preset.simulation.removeTerminatedAfterTicks[1],
  );
  simulationConfig.generateProcessInterval.value = getRandomInt(
    preset.simulation.generateProcessInterval[0],
    preset.simulation.generateProcessInterval[1],
  );
};

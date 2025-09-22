import OS from "./OS";

/**
 * Класс SimulationEngine управляет временем выполнения процессов
 */
export default class SimulationEngine {
  os: OS;
  intervalId: null | ReturnType<typeof setInterval>;
  speed: number;
  minSpeed: number;
  maxSpeed: number;

  /**
   * @param cpu - объект CPU
   */
  constructor(os: OS) {
    this.os = os;
    this.intervalId = null; // ID таймера
    this.speed = 2; // тактов в секунду (2 по умолчанию)
    this.minSpeed = 0.1;
    this.maxSpeed = 1000;
  }

  /**
   * Запуск симуляции
   */
  start() {
    if (this.intervalId) return; // уже запущено

    const interval = 1000 / this.speed; // миллисекунд между тактами
    this.intervalId = setInterval(() => {
      this.os.tick();
    }, interval);
  }

  /**
   * Остановка симуляции
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Установить скорость (тактов в секунду)
   */
  setSpeed(speed: number) {
    this.speed = Math.min(this.maxSpeed, Math.max(this.minSpeed, speed));
    if (this.intervalId) {
      this.stop();
      this.start(); // перезапускаем таймер с новой скоростью
    }
  }

  /**
   * Получить текущую скорость
   */
  getSpeed(): number {
    return this.speed;
  }
}

export default class Memory {
  private words: number[];
  private size: number;

  constructor(size: number) {
    this.size = size;
    this.words = new Array(size).fill(0);
  }

  read(address: number): number {
    if (!this.isValidAddress(address)) {
      throw new Error(`Memory read OOB at ${address}`);
    }
    return this.words[address];
  }

  write(address: number, value: number): void {
    if (!this.isValidAddress(address)) {
      throw new Error(`Memory write OOB at ${address}`);
    }
    this.words[address] = value;
  }

  isValidAddress(address: number): boolean {
    return Number.isInteger(address) && address >= 0 && address < this.size;
  }

  getSize(): number {
    return this.size;
  }
}

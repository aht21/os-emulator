import { ref, computed } from "vue";
import { systemConfig } from "./config";

export default class MemoryManager {
  totalMemory = systemConfig.totalMemory;
  filledMemory = ref(0);
  freeMemory = computed(() => {
    const free = this.totalMemory.value - this.filledMemory.value;
    return free < 0 ? 0 : free;
  });

  hasSpace(size: number): boolean {
    return this.filledMemory.value + size <= this.totalMemory.value;
  }

  allocate(size: number): boolean {
    if (!this.hasSpace(size)) return false;
    this.filledMemory.value += size;
    return true;
  }

  free(size: number) {
    this.filledMemory.value -= size;
    if (this.filledMemory.value < 0) {
      this.filledMemory.value = 0;
    }
  }
}

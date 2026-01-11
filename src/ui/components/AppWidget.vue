<script setup lang="ts">
const props = defineProps({ name: String });
</script>

<template>
  <div class="widget corner_border">
    <span class="widget__header">{{ props.name }}</span>
    <slot />
  </div>
</template>

<style scoped>
.widget {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.widget__header {
  text-transform: uppercase;
}
</style>

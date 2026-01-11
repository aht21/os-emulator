<script setup lang="ts">
import InfoModal from "./InfoModal.vue";
</script>

<template>
  <div class="container">
    <div class="navbar_inner">
      <span>os emulator</span>
      <InfoModal />
    </div>
  </div>
</template>

<style scoped>
.navbar_inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
}
</style>

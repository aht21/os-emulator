<script setup lang="ts">
import { provide } from "vue";
import OS from "../core/OS";
import AppDashboard from "./components/AppDashboard.vue";
import AppNavbar from "./components/AppNavbar.vue";
import useOS from "./composables/useOS";

const os = useOS();
provide<OS>("os", os as OS);
</script>

<template>
  <div class="app_inner">
    <AppNavbar />
    <AppDashboard />
  </div>
</template>

<style scoped>
.app_inner {
  height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
}
</style>

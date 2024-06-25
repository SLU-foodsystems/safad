<script setup lang="ts">
  import LoadingOverlay from '../LoadingOverlay.vue';
</script>

<template>
  <div class="foods-listbox foods-listbox-placeholder stack-s">
    <label><strong>Search:</strong></label>
    <div class="listbox-placeholder" />
    <LoadingOverlay :show="true" />
  </div>
</template>

<style lang="scss" scoped>
@import "../../styles/constants";

.foods-listbox-placeholder {
  position: relative;
}

label {
  padding-left: 1.25rem;
}

.listbox-placeholder {
  border: 2px solid $gray;
  width: 100%;
  height: 250px;
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import { VueLoader } from '@dev-to/vue-loader'

const origin = ref('http://localhost:5173')
const name = ref('RemoteCard')
const componentProps = { title: 'Loaded by @dev-to/vue-loader' }
</script>

<template>
  <div class="app">
    <h1>@dev-to/vue-playground</h1>
    <p class="subtitle">
      Vite host app loading a remote component from a Vite dev server.
    </p>

    <div class="controls">
      <label>
        <span>Origin</span>
        <input v-model="origin" />
      </label>
      <label>
        <span>Name</span>
        <input v-model="name" />
      </label>
    </div>

    <div class="preview">
      <VueLoader :origin="origin" :name="name" :component-props="componentProps" />
    </div>
  </div>
</template>

<style scoped>
.app {
  padding: 24px;
  color: #0f172a;
}

.subtitle {
  margin: 8px 0 16px;
  color: #475569;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

label {
  display: flex;
  gap: 8px;
  align-items: center;
}

label span {
  width: 64px;
  color: #0f172a;
}

input {
  width: 280px;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.preview {
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}
</style>

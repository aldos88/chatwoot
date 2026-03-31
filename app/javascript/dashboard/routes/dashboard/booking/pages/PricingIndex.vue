<template>
  <div class="w-full h-full overflow-y-auto p-6">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold text-n-slate-12 mb-1">Smart Pricing</h1>
      <p class="text-sm text-n-slate-11 mb-6">Настройки динамического ценообразования</p>

      <!-- Loading -->
      <div v-if="state === 'loading'" class="flex items-center justify-center py-20">
        <div class="animate-spin w-6 h-6 border-2 border-n-brand border-t-transparent rounded-full" />
      </div>

      <!-- Not configured -->
      <div v-else-if="state === 'not_configured'" class="text-center py-20 text-n-slate-11">
        <div class="i-lucide-settings w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>Bridge API не настроен</p>
      </div>

      <!-- Content -->
      <div v-else-if="state === 'success'">
        <!-- Master toggle -->
        <div class="bg-white border border-n-strong rounded-xl p-5 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-n-slate-12">Динамические скидки</h3>
              <p class="text-xs text-n-slate-11 mt-1">Автоматические скидки на пустые слоты</p>
            </div>
            <button
              class="relative w-12 h-7 rounded-full transition-colors"
              :class="config.enabled ? 'bg-n-teal-9' : 'bg-n-slate-6'"
              @click="togglePricing"
            >
              <span
                class="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform"
                :class="config.enabled ? 'left-6' : 'left-1'"
              />
            </button>
          </div>
        </div>

        <div v-if="config.enabled">
          <!-- Max discount -->
          <div class="bg-white border border-n-strong rounded-xl p-5 mb-4">
            <label class="block text-sm font-medium text-n-slate-12 mb-3">
              Макс. скидка: <span class="text-n-brand">{{ config.maxDiscountPct }}%</span>
            </label>
            <input
              type="range"
              min="1"
              max="30"
              :value="config.maxDiscountPct"
              class="w-full accent-n-brand"
              @input="config.maxDiscountPct = Number($event.target.value)"
              @change="saveConfig"
            />
            <div class="flex justify-between text-xs text-n-slate-10 mt-1">
              <span>1%</span>
              <span>30%</span>
            </div>
          </div>

          <!-- Flash deal threshold -->
          <div class="bg-white border border-n-strong rounded-xl p-5 mb-4">
            <label class="block text-sm font-medium text-n-slate-12 mb-3">
              Порог FLASH DEAL: <span class="text-n-brand">≥ {{ config.flashDealThreshold }}%</span>
            </label>
            <input
              type="range"
              min="3"
              max="20"
              :value="config.flashDealThreshold"
              class="w-full accent-n-brand"
              @input="config.flashDealThreshold = Number($event.target.value)"
              @change="saveConfig"
            />
            <div class="flex justify-between text-xs text-n-slate-10 mt-1">
              <span>3%</span>
              <span>20%</span>
            </div>
          </div>

          <!-- Weights -->
          <div class="bg-white border border-n-strong rounded-xl p-5 mb-4">
            <h3 class="font-semibold text-n-slate-12 mb-4">Веса факторов</h3>

            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-n-slate-11">Загруженность дня</span>
                  <span class="font-medium">{{ Math.round(config.weights.occupancy * 100) }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="config.weights.occupancy * 100"
                  class="w-full accent-n-brand"
                  @input="config.weights.occupancy = Number($event.target.value) / 100"
                  @change="saveConfig"
                />
              </div>

              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-n-slate-11">Размер окна</span>
                  <span class="font-medium">{{ Math.round(config.weights.gapSize * 100) }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="config.weights.gapSize * 100"
                  class="w-full accent-n-brand"
                  @input="config.weights.gapSize = Number($event.target.value) / 100"
                  @change="saveConfig"
                />
              </div>

              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-n-slate-11">Срочность</span>
                  <span class="font-medium">{{ Math.round(config.weights.urgency * 100) }}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="config.weights.urgency * 100"
                  class="w-full accent-n-brand"
                  @input="config.weights.urgency = Number($event.target.value) / 100"
                  @change="saveConfig"
                />
              </div>
            </div>
          </div>

          <!-- Thresholds -->
          <div class="bg-white border border-n-strong rounded-xl p-5 mb-4">
            <h3 class="font-semibold text-n-slate-12 mb-4">Пороговые значения</h3>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-n-slate-10 mb-1">Низкая загрузка (%)</label>
                <input
                  type="number"
                  :value="config.occupancyThresholds.low * 100"
                  class="w-full px-3 py-2 border border-n-strong rounded-lg text-sm bg-transparent"
                  @change="config.occupancyThresholds.low = Number($event.target.value) / 100; saveConfig()"
                />
              </div>
              <div>
                <label class="block text-xs text-n-slate-10 mb-1">Высокая загрузка (%)</label>
                <input
                  type="number"
                  :value="config.occupancyThresholds.high * 100"
                  class="w-full px-3 py-2 border border-n-strong rounded-lg text-sm bg-transparent"
                  @change="config.occupancyThresholds.high = Number($event.target.value) / 100; saveConfig()"
                />
              </div>
              <div>
                <label class="block text-xs text-n-slate-10 mb-1">Малое окно (мин)</label>
                <input
                  type="number"
                  :value="config.gapMinutes.small"
                  class="w-full px-3 py-2 border border-n-strong rounded-lg text-sm bg-transparent"
                  @change="config.gapMinutes.small = Number($event.target.value); saveConfig()"
                />
              </div>
              <div>
                <label class="block text-xs text-n-slate-10 mb-1">Большое окно (мин)</label>
                <input
                  type="number"
                  :value="config.gapMinutes.large"
                  class="w-full px-3 py-2 border border-n-strong rounded-lg text-sm bg-transparent"
                  @change="config.gapMinutes.large = Number($event.target.value); saveConfig()"
                />
              </div>
              <div>
                <label class="block text-xs text-n-slate-10 mb-1">Скоро (часов)</label>
                <input
                  type="number"
                  :value="config.urgencyHours.soon"
                  class="w-full px-3 py-2 border border-n-strong rounded-lg text-sm bg-transparent"
                  @change="config.urgencyHours.soon = Number($event.target.value); saveConfig()"
                />
              </div>
              <div>
                <label class="block text-xs text-n-slate-10 mb-1">Далеко (часов)</label>
                <input
                  type="number"
                  :value="config.urgencyHours.far"
                  class="w-full px-3 py-2 border border-n-strong rounded-lg text-sm bg-transparent"
                  @change="config.urgencyHours.far = Number($event.target.value); saveConfig()"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Save status -->
        <div v-if="saveStatus" class="text-center text-sm py-2" :class="saveStatus === 'saved' ? 'text-n-teal-11' : 'text-n-ruby-9'">
          {{ saveStatus === 'saved' ? '✓ Сохранено' : '✗ Ошибка сохранения' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import HimatildaAPI from 'dashboard/api/himatilda';

const BASE = import.meta.env.VITE_HIMATILDA_API_BASE_URL || '';

const state = ref('loading');
const config = ref({});
const saveStatus = ref(null);

onMounted(() => fetchConfig());

async function fetchConfig() {
  if (!BASE) {
    state.value = 'not_configured';
    return;
  }
  state.value = 'loading';
  try {
    const { data } = await HimatildaAPI.getBookingPricing();
    config.value = data;
    state.value = 'success';
  } catch {
    state.value = 'error';
  }
}

async function togglePricing() {
  config.value.enabled = !config.value.enabled;
  await saveConfig();
}

let saveTimer = null;
async function saveConfig() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await HimatildaAPI.updateBookingPricing(config.value);
      saveStatus.value = 'saved';
      setTimeout(() => { saveStatus.value = null; }, 2000);
    } catch {
      saveStatus.value = 'error';
      setTimeout(() => { saveStatus.value = null; }, 3000);
    }
  }, 500);
}
</script>

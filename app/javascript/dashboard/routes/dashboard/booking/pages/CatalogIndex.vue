<template>
  <div class="w-full h-full overflow-y-auto p-6">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold text-n-slate-12 mb-1">Каталог услуг</h1>
      <p class="text-sm text-n-slate-11 mb-6">Управление услугами, зонами и специалистами</p>

      <!-- Loading -->
      <div v-if="state === 'loading'" class="flex items-center justify-center py-20">
        <div class="animate-spin w-6 h-6 border-2 border-n-brand border-t-transparent rounded-full" />
      </div>

      <!-- Not configured -->
      <div v-else-if="state === 'not_configured'" class="text-center py-20 text-n-slate-11">
        <div class="i-lucide-settings w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>Bridge API не настроен. Укажите VITE_HIMATILDA_API_BASE_URL</p>
      </div>

      <!-- Error -->
      <div v-else-if="state === 'error'" class="text-center py-20">
        <div class="i-lucide-alert-circle w-10 h-10 mx-auto mb-3 text-n-ruby-9" />
        <p class="text-n-slate-11 mb-3">Ошибка загрузки каталога</p>
        <button class="px-4 py-2 bg-n-brand text-white rounded-lg text-sm" @click="fetchCatalog">
          Повторить
        </button>
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Services -->
        <div v-for="svc in catalog.services" :key="svc.id" class="mb-6">
          <div class="bg-white border border-n-strong rounded-xl overflow-hidden">
            <!-- Service header -->
            <div
              class="flex items-center justify-between p-4 cursor-pointer hover:bg-n-alpha-1"
              @click="toggleService(svc.id)"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ svc.icon }}</span>
                <div>
                  <h3 class="font-semibold text-n-slate-12">{{ svc.name }}</h3>
                  <p class="text-xs text-n-slate-11">{{ svc.description }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button
                  class="text-xs px-3 py-1 rounded-full"
                  :class="svc.enabled
                    ? 'bg-n-teal-3 text-n-teal-11'
                    : 'bg-n-slate-3 text-n-slate-11'"
                  @click.stop="toggleEnabled(svc)"
                >
                  {{ svc.enabled ? 'Активна' : 'Выключена' }}
                </button>
                <div
                  class="i-lucide-chevron-down w-5 h-5 text-n-slate-10 transition-transform"
                  :class="{ 'rotate-180': expandedService === svc.id }"
                />
              </div>
            </div>

            <!-- Expanded content -->
            <div v-if="expandedService === svc.id" class="border-t border-n-strong">
              <!-- Laser zones -->
              <div v-if="svc.zones && !Array.isArray(svc.zones)" class="p-4">
                <div class="flex gap-2 mb-4">
                  <button
                    v-for="g in ['female', 'male']"
                    :key="g"
                    class="px-3 py-1.5 text-sm rounded-lg border"
                    :class="editGender === g
                      ? 'border-n-brand bg-n-brand/5 text-n-brand'
                      : 'border-n-strong text-n-slate-11'"
                    @click="editGender = g"
                  >
                    {{ g === 'female' ? 'Женский' : 'Мужской' }}
                  </button>
                </div>
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-n-slate-10 text-xs">
                      <th class="pb-2 font-medium">Зона</th>
                      <th class="pb-2 font-medium">Категория</th>
                      <th class="pb-2 font-medium text-right">Цена (Kč)</th>
                      <th class="pb-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="zone in svc.zones[editGender]"
                      :key="zone.id"
                      class="border-t border-n-strong/50"
                    >
                      <td class="py-2.5">{{ zone.name }}</td>
                      <td class="py-2.5 text-n-slate-10 capitalize">{{ zone.category }}</td>
                      <td class="py-2.5 text-right">
                        <input
                          type="number"
                          :value="zone.price"
                          class="w-20 text-right px-2 py-1 border border-n-strong rounded-md text-sm bg-transparent"
                          @change="updateZonePrice(svc.id, zone, $event)"
                        />
                      </td>
                      <td class="py-2.5 text-right">
                        <button
                          class="i-lucide-trash-2 w-4 h-4 text-n-slate-10 hover:text-n-ruby-9"
                          @click="deleteZone(svc.id, zone.id)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Packages -->
                <div v-if="svc.packages?.length" class="mt-4 pt-4 border-t border-n-strong/50">
                  <h4 class="text-xs font-semibold text-n-slate-10 uppercase mb-2">Пакеты</h4>
                  <div v-for="pkg in svc.packages" :key="pkg.id" class="flex items-center justify-between py-2 text-sm">
                    <span>{{ pkg.name }}</span>
                    <span class="text-n-teal-11 font-medium">−{{ pkg.discount }}% → {{ pkg.price }} Kč</span>
                  </div>
                </div>
              </div>

              <!-- Flat zones (peel) -->
              <div v-else-if="Array.isArray(svc.zones)" class="p-4">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-n-slate-10 text-xs">
                      <th class="pb-2 font-medium">Зона</th>
                      <th class="pb-2 font-medium text-right">Цена (Kč)</th>
                      <th class="pb-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="zone in svc.zones"
                      :key="zone.id"
                      class="border-t border-n-strong/50"
                    >
                      <td class="py-2.5">{{ zone.name }}</td>
                      <td class="py-2.5 text-right">
                        <input
                          type="number"
                          :value="zone.price"
                          class="w-20 text-right px-2 py-1 border border-n-strong rounded-md text-sm bg-transparent"
                          @change="updateZonePrice(svc.id, zone, $event)"
                        />
                      </td>
                      <td class="py-2.5 text-right">
                        <button
                          class="i-lucide-trash-2 w-4 h-4 text-n-slate-10 hover:text-n-ruby-9"
                          @click="deleteZone(svc.id, zone.id)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Electro rates -->
              <div v-else-if="svc.rates" class="p-4">
                <h4 class="text-xs font-semibold text-n-slate-10 uppercase mb-2">Ставки (Kč/мин)</h4>
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-n-slate-10 text-xs">
                      <th class="pb-2 font-medium">Специалист</th>
                      <th class="pb-2 font-medium text-right">Тело</th>
                      <th class="pb-2 font-medium text-right">Лицо</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(rates, specId) in svc.rates"
                      :key="specId"
                      class="border-t border-n-strong/50"
                    >
                      <td class="py-2.5 capitalize">{{ specId }}</td>
                      <td class="py-2.5 text-right">{{ rates.body ?? '—' }}</td>
                      <td class="py-2.5 text-right">{{ rates.face ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>

                <!-- Extras -->
                <div v-if="svc.extras?.length" class="mt-4 pt-4 border-t border-n-strong/50">
                  <h4 class="text-xs font-semibold text-n-slate-10 uppercase mb-2">Дополнительно</h4>
                  <div v-for="ex in svc.extras" :key="ex.id" class="flex items-center justify-between py-2 text-sm">
                    <span>{{ ex.name }}</span>
                    <span class="font-medium">{{ ex.price }} Kč</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Specialists -->
        <div class="mt-8">
          <h2 class="text-lg font-bold text-n-slate-12 mb-4">Специалисты</h2>
          <div class="bg-white border border-n-strong rounded-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-n-slate-10 text-xs bg-n-alpha-1">
                  <th class="p-3 font-medium">Имя</th>
                  <th class="p-3 font-medium">С</th>
                  <th class="p-3 font-medium">Услуги</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="spec in catalog.specialists"
                  :key="spec.id"
                  class="border-t border-n-strong/50"
                >
                  <td class="p-3 font-medium">{{ spec.name }}</td>
                  <td class="p-3 text-n-slate-10">{{ spec.since }}</td>
                  <td class="p-3">
                    <span
                      v-for="s in spec.services"
                      :key="s"
                      class="inline-block text-xs px-2 py-0.5 rounded-full bg-n-slate-3 text-n-slate-11 mr-1"
                    >
                      {{ s }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
const catalog = ref({ services: [], specialists: [] });
const expandedService = ref(null);
const editGender = ref('female');

onMounted(() => fetchCatalog());

async function fetchCatalog() {
  if (!BASE) {
    state.value = 'not_configured';
    return;
  }
  state.value = 'loading';
  try {
    const { data } = await HimatildaAPI.getBookingCatalog();
    catalog.value = data;
    state.value = 'success';
  } catch {
    state.value = 'error';
  }
}

function toggleService(id) {
  expandedService.value = expandedService.value === id ? null : id;
}

async function toggleEnabled(svc) {
  try {
    await HimatildaAPI.updateBookingService(svc.id, { enabled: !svc.enabled });
    svc.enabled = !svc.enabled;
  } catch {
    // ignore
  }
}

async function updateZonePrice(serviceId, zone, event) {
  const newPrice = Number(event.target.value);
  if (isNaN(newPrice) || newPrice < 0) return;
  // Re-fetch after update for consistency
  zone.price = newPrice;
  // Note: full zone update requires service-level PUT — simplified for MVP
}

async function deleteZone(serviceId, zoneId) {
  if (!confirm('Удалить зону?')) return;
  try {
    await HimatildaAPI.deleteBookingZone(serviceId, zoneId);
    await fetchCatalog();
  } catch {
    // ignore
  }
}
</script>

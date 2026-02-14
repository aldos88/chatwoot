<template>
  <div class="w-full h-full overflow-y-auto p-6">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-n-slate-12 mb-1">Заявки на запись</h1>
          <p class="text-sm text-n-slate-11">Управление входящими заявками</p>
        </div>
        <div v-if="stats" class="flex gap-3">
          <div class="text-center px-3 py-1.5 bg-n-amber-3 rounded-lg">
            <div class="text-lg font-bold text-n-amber-11">{{ stats.pending }}</div>
            <div class="text-[10px] text-n-amber-11 uppercase">Новые</div>
          </div>
          <div class="text-center px-3 py-1.5 bg-n-teal-3 rounded-lg">
            <div class="text-lg font-bold text-n-teal-11">{{ stats.confirmed }}</div>
            <div class="text-[10px] text-n-teal-11 uppercase">Подтв.</div>
          </div>
          <div class="text-center px-3 py-1.5 bg-n-slate-3 rounded-lg">
            <div class="text-lg font-bold text-n-slate-11">{{ stats.total }}</div>
            <div class="text-[10px] text-n-slate-11 uppercase">Всего</div>
          </div>
        </div>
      </div>

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
      <div v-else>
        <!-- Filter tabs -->
        <div class="flex gap-2 mb-4">
          <button
            v-for="f in filters"
            :key="f.value"
            class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
            :class="activeFilter === f.value
              ? 'border-n-brand bg-n-brand/5 text-n-brand'
              : 'border-n-strong text-n-slate-11 hover:bg-n-alpha-1'"
            @click="setFilter(f.value)"
          >
            {{ f.label }}
          </button>
        </div>

        <!-- Empty -->
        <div v-if="!requests.length" class="text-center py-16 text-n-slate-11">
          <div class="i-lucide-inbox w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Нет заявок</p>
        </div>

        <!-- Requests table -->
        <div v-else class="bg-white border border-n-strong rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-n-slate-10 text-xs bg-n-alpha-1">
                <th class="p-3 font-medium">Дата заявки</th>
                <th class="p-3 font-medium">Клиент</th>
                <th class="p-3 font-medium">Услуга</th>
                <th class="p-3 font-medium">Дата/время</th>
                <th class="p-3 font-medium text-right">Цена</th>
                <th class="p-3 font-medium">Статус</th>
                <th class="p-3 w-24" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="req in requests"
                :key="req.id"
                class="border-t border-n-strong/50 hover:bg-n-alpha-1"
              >
                <td class="p-3 text-n-slate-10 text-xs">
                  {{ formatDateTime(req.createdAt) }}
                </td>
                <td class="p-3">
                  <div class="font-medium">{{ req.name }}</div>
                  <div class="text-xs text-n-slate-10">{{ req.phone }}</div>
                  <div v-if="req.firstVisit" class="text-[10px] text-n-teal-11">🆕 Первый визит</div>
                </td>
                <td class="p-3">
                  <div>{{ req.serviceLabel || req.service }}</div>
                  <div v-if="req.zones?.length" class="text-xs text-n-slate-10 mt-0.5">
                    {{ req.zones.map(z => z.name).join(', ') }}
                  </div>
                </td>
                <td class="p-3">
                  <div class="font-medium">{{ req.date }}</div>
                  <div class="text-xs text-n-slate-10">{{ req.time }}</div>
                </td>
                <td class="p-3 text-right">
                  <div v-if="req.pricing" class="font-medium">
                    {{ req.pricing.finalPrice }} Kč
                  </div>
                  <div v-if="req.pricing?.discountPct > 0" class="text-xs text-n-teal-11">
                    −{{ req.pricing.discountPct }}%
                    <span v-if="req.pricing.isFlashDeal" class="text-n-amber-11">⚡</span>
                  </div>
                </td>
                <td class="p-3">
                  <span
                    class="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="statusClass(req.status)"
                  >
                    {{ statusLabel(req.status) }}
                  </span>
                </td>
                <td class="p-3">
                  <div v-if="req.status === 'pending'" class="flex gap-1">
                    <button
                      class="px-2 py-1 text-xs rounded bg-n-teal-3 text-n-teal-11 hover:bg-n-teal-4"
                      @click="updateStatus(req, 'confirmed')"
                    >
                      ✓
                    </button>
                    <button
                      class="px-2 py-1 text-xs rounded bg-n-ruby-3 text-n-ruby-11 hover:bg-n-ruby-4"
                      @click="updateStatus(req, 'declined')"
                    >
                      ✗
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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
const requests = ref([]);
const stats = ref(null);
const activeFilter = ref('');
const filters = [
  { label: 'Все', value: '' },
  { label: 'Новые', value: 'pending' },
  { label: 'Подтверждённые', value: 'confirmed' },
  { label: 'Отклонённые', value: 'declined' },
];

onMounted(() => {
  fetchRequests();
  fetchStats();
});

async function fetchRequests() {
  if (!BASE) {
    state.value = 'not_configured';
    return;
  }
  state.value = 'loading';
  try {
    const params = {};
    if (activeFilter.value) params.status = activeFilter.value;
    const { data } = await HimatildaAPI.getBookingRequests(params);
    requests.value = data.requests || [];
    state.value = 'success';
  } catch {
    state.value = 'error';
  }
}

async function fetchStats() {
  try {
    const { data } = await HimatildaAPI.getBookingRequestsStats();
    stats.value = data;
  } catch {
    // ignore
  }
}

function setFilter(value) {
  activeFilter.value = value;
  fetchRequests();
}

async function updateStatus(req, status) {
  try {
    await HimatildaAPI.updateBookingRequest(req.id, { status });
    req.status = status;
    fetchStats();
  } catch {
    // ignore
  }
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function statusClass(status) {
  return {
    pending: 'bg-n-amber-3 text-n-amber-11',
    confirmed: 'bg-n-teal-3 text-n-teal-11',
    declined: 'bg-n-ruby-3 text-n-ruby-11',
  }[status] || 'bg-n-slate-3 text-n-slate-11';
}

function statusLabel(status) {
  return {
    pending: 'Новая',
    confirmed: 'Подтверждена',
    declined: 'Отклонена',
  }[status] || status;
}
</script>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import HimatildaAPI from 'dashboard/api/himatilda';

const BASE = import.meta.env.VITE_HIMATILDA_API_BASE_URL || '';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// State: 'loading' | 'success' | 'empty' | 'not_configured' | 'error'
const state = ref(BASE ? 'loading' : 'not_configured');
const days = ref([]);
const specialists = ref([]);

// Week offset from current week (0 = this week)
const weekOffset = ref(0);

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function shortDate(dateStr) {
  const parts = dateStr.split('-');
  return `${parts[2]}.${parts[1]}`;
}

const weekStart = computed(() => {
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + weekOffset.value * 7);
  return monday;
});

const weekEnd = computed(() => {
  const d = new Date(weekStart.value);
  d.setDate(d.getDate() + 6);
  return d;
});

const weekLabel = computed(() => {
  const s = weekStart.value;
  const e = weekEnd.value;
  const sDay = WEEKDAYS[0];
  const eDay = WEEKDAYS[6];
  return `${sDay} ${shortDate(formatDate(s))} – ${eDay} ${shortDate(formatDate(e))}`;
});

const isCurrentWeek = computed(() => weekOffset.value === 0);

// Build 7-day columns for the week
const weekDays = computed(() => {
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.value);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    result.push({
      date: dateStr,
      label: `${WEEKDAYS[i]} ${shortDate(dateStr)}`,
      weekday: WEEKDAYS[i],
      isToday: dateStr === formatDate(new Date()),
    });
  }
  return result;
});

// Map: date -> specialist name -> busy slots
const scheduleMap = computed(() => {
  const map = {};
  for (const day of days.value) {
    map[day.date] = {};
    for (const spec of day.specialists || []) {
      map[day.date][spec.name] = spec.busy || [];
    }
  }
  return map;
});

function getBusySlots(specialistName, date) {
  return scheduleMap.value[date]?.[specialistName] || [];
}

async function fetchSchedule() {
  if (!BASE) {
    state.value = 'not_configured';
    return;
  }
  state.value = 'loading';
  try {
    const fromDate = formatDate(weekStart.value);
    const { data } = await HimatildaAPI.getSchedule({
      days: 7,
      from: fromDate,
    });
    if (data.ok && data.days?.length) {
      days.value = data.days;
      // Collect unique specialist names across all days
      const nameSet = new Set();
      for (const day of data.days) {
        for (const spec of day.specialists || []) {
          nameSet.add(spec.name);
        }
      }
      const names = [...nameSet].sort();
      specialists.value = names;
      state.value = names.length > 0 ? 'success' : 'empty';
    } else {
      days.value = [];
      specialists.value = [];
      state.value = 'empty';
    }
  } catch {
    state.value = 'error';
  }
}

function prevWeek() {
  weekOffset.value -= 1;
}

function nextWeek() {
  weekOffset.value += 1;
}

function goToday() {
  weekOffset.value = 0;
}

watch(weekOffset, () => {
  fetchSchedule();
});

onMounted(() => {
  fetchSchedule();
});
</script>

<template>
  <div class="flex flex-col w-full h-full p-6 overflow-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-n-slate-12">
        Calendar
      </h1>
      <div class="flex items-center gap-3">
        <button
          class="p-2 rounded-lg hover:bg-n-alpha-2 text-n-slate-11"
          @click="prevWeek"
        >
          <span class="i-lucide-chevron-left size-5" />
        </button>
        <span class="text-sm font-medium text-n-slate-12 min-w-[220px] text-center">
          {{ weekLabel }}
        </span>
        <button
          class="p-2 rounded-lg hover:bg-n-alpha-2 text-n-slate-11"
          @click="nextWeek"
        >
          <span class="i-lucide-chevron-right size-5" />
        </button>
        <button
          v-if="!isCurrentWeek"
          class="px-3 py-1.5 text-xs font-medium rounded-lg bg-n-alpha-2 hover:bg-n-alpha-3 text-n-slate-11"
          @click="goToday"
        >
          Сегодня
        </button>
      </div>
    </div>

    <!-- Not configured state -->
    <div
      v-if="state === 'not_configured'"
      class="flex flex-col items-center justify-center flex-1 gap-3"
    >
      <span class="i-lucide-settings size-10 text-n-slate-9" />
      <p class="text-sm text-n-slate-11 text-center max-w-md">
        CRM не настроена. Укажите VITE_HIMATILDA_API_BASE_URL в настройках сборки.
      </p>
    </div>

    <!-- Loading state -->
    <div
      v-else-if="state === 'loading'"
      class="flex items-center justify-center flex-1"
    >
      <span class="i-lucide-loader-2 size-8 text-n-slate-9 animate-spin" />
    </div>

    <!-- Error state -->
    <div
      v-else-if="state === 'error'"
      class="flex flex-col items-center justify-center flex-1 gap-3"
    >
      <span class="i-lucide-wifi-off size-10 text-n-slate-9" />
      <p class="text-sm text-n-slate-11">
        CRM недоступна
      </p>
      <button
        class="px-4 py-2 text-sm font-medium rounded-lg bg-n-brand text-white hover:opacity-90"
        @click="fetchSchedule"
      >
        Повторить
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="state === 'empty'"
      class="flex flex-col items-center justify-center flex-1 gap-3"
    >
      <span class="i-lucide-calendar-x size-10 text-n-slate-9" />
      <p class="text-sm text-n-slate-11">
        Нет записей на эту неделю
      </p>
    </div>

    <!-- Schedule grid -->
    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full border-collapse min-w-[800px]">
        <thead>
          <tr>
            <th class="p-3 text-left text-xs font-medium text-n-slate-11 w-[160px] border-b border-n-strong">
              Специалист
            </th>
            <th
              v-for="day in weekDays"
              :key="day.date"
              class="p-3 text-center text-xs font-medium border-b border-n-strong"
              :class="day.isToday ? 'bg-n-alpha-1 text-n-slate-12' : 'text-n-slate-11'"
            >
              {{ day.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="name in specialists"
            :key="name"
            class="border-b border-n-weak"
          >
            <td class="p-3 text-sm font-medium text-n-slate-12 align-top">
              {{ name }}
            </td>
            <td
              v-for="day in weekDays"
              :key="day.date"
              class="p-2 align-top"
              :class="day.isToday ? 'bg-n-alpha-1' : ''"
            >
              <template v-if="getBusySlots(name, day.date).length">
                <div
                  v-for="(slot, idx) in getBusySlots(name, day.date)"
                  :key="idx"
                  class="mb-1 px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800 whitespace-nowrap"
                >
                  {{ slot.start }}–{{ slot.end }}
                  <span class="opacity-70">{{ slot.service }}</span>
                </div>
              </template>
              <span
                v-else
                class="text-xs text-n-slate-9"
              >
                —
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

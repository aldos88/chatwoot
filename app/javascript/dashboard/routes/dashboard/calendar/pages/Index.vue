<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import HimatildaAPI from 'dashboard/api/himatilda';

const BASE = import.meta.env.VITE_HIMATILDA_API_BASE_URL || '';

// ── Constants ──
const START_HOUR = 9;
const END_HOUR = 20;
const HOUR_PX = 80;
const TOTAL_PX = (END_HOUR - START_HOUR) * HOUR_PX;

const WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const WEEKDAYS_FULL = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
  'Четверг', 'Пятница', 'Суббота',
];

const SPECIALISTS = {
  'Диана Степанова': { initials: 'ДС', color: '#8b5cf6', role: 'Электролог' },
  'Ольга Любченко': { initials: 'ОЛ', color: '#ec4899', role: 'Электролог' },
  'Юлия Калиниченко': { initials: 'ЮК', color: '#3b82f6', role: 'Лазер + прессо' },
  'Наталья Бутко': { initials: 'НБ', color: '#10b981', role: 'Лазер + электро' },
  'Александра Дорошенкова': { initials: 'АД', color: '#f59e0b', role: 'Электролог (стажёр)' },
  'Светлана Резниченко': { initials: 'СР', color: '#ef4444', role: 'Руководитель' },
};

const LEGEND = [
  { label: 'Электро', color: '#f59e0b' },
  { label: 'Лазер', color: '#6366f1' },
  { label: 'Прессо', color: '#10b981' },
  { label: 'Пилинг', color: '#a855f7' },
  { label: 'Другое', color: '#ec4899' },
];

const SERVICE_COLORS = {
  electro: { bg: '#fef9ee', border: '#f59e0b', text: '#92400e' },
  laser: { bg: '#eef4ff', border: '#6366f1', text: '#3730a3' },
  presso: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  peeling: { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8' },
  block: { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280' },
  other: { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d' },
};

// ── State ──
const state = ref(BASE ? 'loading' : 'not_configured');
const currentView = ref('day');
const currentDate = ref(new Date());
const days = ref([]);
const selectedAppt = ref(null);
const gridWrapperRef = ref(null);
const nowPx = ref(null);
const weekKey = ref('');
let nowTimer = null;

// ── Utility functions ──
function fmtISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayISO() {
  return fmtISO(new Date());
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timeToPx(t) {
  return ((timeToMin(t) - START_HOUR * 60) / 60) * HOUR_PX;
}

function calcNowPx() {
  const n = new Date();
  const m = n.getHours() * 60 + n.getMinutes();
  if (m < START_HOUR * 60 || m > END_HOUR * 60) return null;
  return ((m - START_HOUR * 60) / 60) * HOUR_PX;
}

function getSpec(name) {
  return SPECIALISTS[name] || {
    initials: name.split(' ').map(w => w[0]).join(''),
    color: '#6b7280',
    role: '',
  };
}

function getServiceType(service) {
  const s = service.toLowerCase();
  if (s.includes('электро')) return 'electro';
  if (s.includes('прессо')) return 'presso';
  if (s.includes('пилинг')) return 'peeling';
  if (s === 'блок') return 'block';
  if (
    s.includes('лазер') || s.includes('подмышк') || s.includes('ноги') ||
    s.includes('бикини') || s.includes('голен') || s.includes('руки') ||
    s.includes('комплекс')
  ) return 'laser';
  return 'other';
}

function shortService(s) {
  return s
    .replace('Комплекс: ', '')
    .replace('подмышки+глубокое бикини', 'Подм+бикини')
    .replace('подмышки + глубокое бикини + голени с коленями', 'Подм+бикини+голени')
    .replace('Электроэпиляция', 'Электро')
    .replace('Прессотерапия', 'Прессо');
}

function formatDetailDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${WEEKDAYS_RU[d.getDay()]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

// ── Computed ──
const hours = computed(() => {
  const result = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    result.push({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      top: (h - START_HOUR) * HOUR_PX,
    });
  }
  return result;
});

const currentWeekMonday = computed(() => fmtISO(getMonday(currentDate.value)));

const dateLabel = computed(() => {
  if (currentView.value === 'day') {
    const d = currentDate.value;
    return `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
  }
  const monday = getMonday(currentDate.value);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = d =>
    `${WEEKDAYS_RU[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(monday)} – ${fmt(sunday)}`;
});

const currentDayData = computed(() => {
  const dateStr = fmtISO(currentDate.value);
  return days.value.find(d => d.date === dateStr) || null;
});

const daySpecialists = computed(() => {
  if (!currentDayData.value) return [];
  return [...(currentDayData.value.specialists || [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru')
  );
});

const weekDays = computed(() => {
  const monday = getMonday(currentDate.value);
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dateStr = fmtISO(d);
    const dayData = days.value.find(dd => dd.date === dateStr);
    const specs = dayData?.specialists || [];
    const appointments = [];
    for (const spec of specs) {
      for (const slot of spec.busy || []) {
        appointments.push({ ...slot, specialistName: spec.name });
      }
    }
    result.push({
      date: dateStr,
      weekday: WEEKDAYS_RU[d.getDay()],
      dayNum: d.getDate(),
      isToday: dateStr === todayISO(),
      specCount: specs.length,
      appointments,
    });
  }
  return result;
});

// ── Appointment helpers ──
function apptStyle(slot) {
  const top = timeToPx(slot.start);
  const height = Math.max(timeToPx(slot.end) - top, 16);
  const colors = SERVICE_COLORS[getServiceType(slot.service)];
  return {
    top: `${top}px`,
    height: `${height}px`,
    background: colors.bg,
    borderLeftColor: colors.border,
    color: colors.text,
  };
}

function apptH(slot) {
  return Math.max(timeToPx(slot.end) - timeToPx(slot.start), 16);
}

function apptDur(slot) {
  return timeToMin(slot.end) - timeToMin(slot.start);
}

function apptId(date, name, start) {
  return `${date}_${name}_${start}`;
}

function isSelected(id) {
  return selectedAppt.value?.id === id;
}

// ── API ──
async function fetchSchedule() {
  if (!BASE) {
    state.value = 'not_configured';
    return;
  }
  state.value = 'loading';
  try {
    const monday = fmtISO(getMonday(currentDate.value));
    const { data } = await HimatildaAPI.getSchedule({ days: 7, from: monday });
    if (data.ok && data.days?.length) {
      days.value = data.days;
      weekKey.value = monday;
      state.value = data.days.some(d => d.specialists?.length) ? 'success' : 'empty';
    } else {
      days.value = [];
      state.value = 'empty';
    }
  } catch {
    state.value = 'error';
  }
}

// ── Navigation ──
function navigate(dir) {
  const d = new Date(currentDate.value);
  d.setDate(d.getDate() + (currentView.value === 'day' ? dir : dir * 7));
  currentDate.value = d;
}

function goToday() {
  currentDate.value = new Date();
}

function setView(v) {
  currentView.value = v;
}

// ── Detail panel ──
function selectAppt(data) {
  selectedAppt.value = data;
}

function closeDetail() {
  selectedAppt.value = null;
}

// ── Scroll ──
async function scrollToRelevant() {
  await nextTick();
  const wrapper = gridWrapperRef.value;
  if (!wrapper) return;
  const np = calcNowPx();
  const dayDate = currentDayData.value?.date;
  if (dayDate === todayISO() && np !== null) {
    wrapper.scrollTop = Math.max(0, np - 200);
  } else {
    wrapper.scrollTop = HOUR_PX * 2;
  }
}

// ── Now line ──
function updateNow() {
  nowPx.value = calcNowPx();
}

// ── Watchers ──
watch(currentWeekMonday, newMonday => {
  if (newMonday !== weekKey.value) {
    fetchSchedule();
  }
});

watch([currentView, currentDate], () => {
  selectedAppt.value = null;
});

watch(currentView, () => {
  scrollToRelevant();
});

watch(state, val => {
  if (val === 'success') scrollToRelevant();
});

// ── Lifecycle ──
onMounted(() => {
  fetchSchedule();
  updateNow();
  nowTimer = setInterval(updateNow, 60000);
});

onUnmounted(() => {
  if (nowTimer) clearInterval(nowTimer);
});
</script>

<template>
  <div class="cal-app">
    <div class="cal-main">
      <!-- ═══ Header ═══ -->
      <div class="cal-header">
        <div class="cal-header-left">
          <button class="cal-today-btn" @click="goToday">
            СЕГОДНЯ
          </button>
          <div class="cal-nav-arrows">
            <button @click="navigate(-1)">
              ‹
            </button>
            <button @click="navigate(1)">
              ›
            </button>
          </div>
          <span class="cal-date-label">{{ dateLabel }}</span>
        </div>
        <div class="cal-header-right">
          <div class="cal-view-toggle">
            <button
              :class="{ active: currentView === 'day' }"
              @click="setView('day')"
            >
              ДЕНЬ
            </button>
            <button
              :class="{ active: currentView === 'week' }"
              @click="setView('week')"
            >
              НЕДЕЛЯ
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ Legend ═══ -->
      <div class="cal-legend">
        <div
          v-for="item in LEGEND"
          :key="item.label"
          class="cal-legend-item"
        >
          <div class="cal-legend-dot" :style="{ background: item.color }" />
          {{ item.label }}
        </div>
      </div>

      <!-- ═══ State screens ═══ -->
      <div v-if="state === 'not_configured'" class="cal-state-center">
        <span class="i-lucide-settings cal-state-icon" />
        <p class="cal-state-text">
          CRM не настроена. Укажите VITE_HIMATILDA_API_BASE_URL.
        </p>
      </div>

      <div v-else-if="state === 'loading'" class="cal-state-center">
        <span class="i-lucide-loader-2 cal-state-icon cal-spin" />
      </div>

      <div v-else-if="state === 'error'" class="cal-state-center">
        <span class="i-lucide-wifi-off cal-state-icon" />
        <p class="cal-state-text">
          CRM недоступна
        </p>
        <button class="cal-retry-btn" @click="fetchSchedule">
          Повторить
        </button>
      </div>

      <div v-else-if="state === 'empty'" class="cal-state-center">
        <span class="i-lucide-calendar-x cal-state-icon" />
        <p class="cal-state-text">
          Нет записей
        </p>
      </div>

      <!-- ═══ Success: Calendar grid ═══ -->
      <template v-else>
        <!-- DAY: specialist column headers -->
        <div v-if="currentView === 'day'" class="cal-columns-header">
          <template v-if="daySpecialists.length">
            <div
              v-for="spec in daySpecialists"
              :key="spec.name"
              class="cal-col-header"
            >
              <div
                class="cal-col-avatar"
                :style="{ background: getSpec(spec.name).color }"
              >
                {{ getSpec(spec.name).initials }}
              </div>
              <div class="cal-col-name">
                {{ spec.name.split(' ')[0] }}
              </div>
            </div>
          </template>
          <div v-else class="cal-col-empty">
            Нет записей на этот день
          </div>
        </div>

        <!-- WEEK: day column headers -->
        <div v-else class="cal-week-header">
          <div
            v-for="wd in weekDays"
            :key="wd.date"
            class="cal-week-day-header"
            :class="{ today: wd.isToday }"
          >
            {{ wd.weekday }}
            <span
              class="cal-day-num"
              :class="{ 'cal-day-num-today': wd.isToday }"
            >{{ wd.dayNum }}</span>
            <div v-if="wd.specCount" class="cal-spec-count">
              {{ wd.specCount }} спец.
            </div>
            <div v-else class="cal-spec-count cal-spec-count-empty">
              —
            </div>
          </div>
        </div>

        <!-- ═══ Scrollable grid ═══ -->
        <div ref="gridWrapperRef" class="cal-grid-wrapper">
          <div class="cal-grid" :style="{ height: TOTAL_PX + 'px' }">
            <!-- Time axis -->
            <div class="cal-time-axis">
              <div
                v-for="h in hours"
                :key="h.hour"
                class="cal-time-slot"
              >
                {{ h.label }}
              </div>
            </div>

            <!-- Columns area -->
            <div class="cal-columns-area">
              <!-- Hour lines -->
              <template v-for="h in hours" :key="'hl-' + h.hour">
                <div class="cal-hour-line" :style="{ top: h.top + 'px' }" />
                <div
                  class="cal-half-hour-line"
                  :style="{ top: (h.top + HOUR_PX / 2) + 'px' }"
                />
              </template>
              <div class="cal-hour-line" :style="{ top: TOTAL_PX + 'px' }" />

              <!-- ── DAY columns ── -->
              <template v-if="currentView === 'day'">
                <!-- Now line (spans all columns) -->
                <div
                  v-if="currentDayData?.date === todayISO() && nowPx !== null"
                  class="cal-now-line"
                  :style="{ top: nowPx + 'px' }"
                >
                  <div class="cal-now-dot" />
                </div>

                <div
                  v-for="spec in daySpecialists"
                  :key="spec.name"
                  class="cal-spec-column"
                >
                  <div
                    v-for="(slot, idx) in spec.busy"
                    :key="idx"
                    class="cal-appt"
                    :class="{ selected: isSelected(apptId(currentDayData.date, spec.name, slot.start)) }"
                    :style="apptStyle(slot)"
                    @click="selectAppt({
                      id: apptId(currentDayData.date, spec.name, slot.start),
                      specialistName: spec.name,
                      service: slot.service,
                      start: slot.start,
                      end: slot.end,
                      date: currentDayData.date,
                    })"
                  >
                    <div class="cal-appt-service">
                      {{ shortService(slot.service) }}
                    </div>
                    <div v-if="apptH(slot) > 28" class="cal-appt-time">
                      {{ slot.start }} – {{ slot.end }}
                    </div>
                    <div v-if="apptH(slot) > 42" class="cal-appt-duration">
                      {{ apptDur(slot) }} мин
                    </div>
                  </div>
                </div>

                <!-- Empty day -->
                <div
                  v-if="!daySpecialists.length"
                  class="cal-spec-column"
                  style="flex: 1"
                >
                  <div class="cal-empty-day">
                    Выходной
                  </div>
                </div>
              </template>

              <!-- ── WEEK columns ── -->
              <template v-else>
                <div
                  v-for="wd in weekDays"
                  :key="wd.date"
                  class="cal-week-col"
                >
                  <!-- Now line (per column) -->
                  <div
                    v-if="wd.isToday && nowPx !== null"
                    class="cal-now-line"
                    :style="{ top: nowPx + 'px' }"
                  >
                    <div class="cal-now-dot" />
                  </div>

                  <div
                    v-if="!wd.appointments.length"
                    class="cal-empty-day"
                  >
                    —
                  </div>

                  <div
                    v-for="(appt, idx) in wd.appointments"
                    :key="idx"
                    class="cal-week-appt"
                    :class="{ selected: isSelected(apptId(wd.date, appt.specialistName, appt.start)) }"
                    :style="apptStyle(appt)"
                    @click="selectAppt({
                      id: apptId(wd.date, appt.specialistName, appt.start),
                      specialistName: appt.specialistName,
                      service: appt.service,
                      start: appt.start,
                      end: appt.end,
                      date: wd.date,
                    })"
                  >
                    <div class="cal-wa-service">
                      {{ shortService(appt.service) }}
                    </div>
                    <div v-if="apptH(appt) > 20" class="cal-wa-name">
                      {{ appt.start }}–{{ appt.end }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ Detail sidebar ═══ -->
    <div v-if="selectedAppt" class="cal-sidebar-detail">
      <div class="cal-detail-header">
        <h3>Запись</h3>
        <button class="cal-detail-close" @click="closeDetail">
          ×
        </button>
      </div>
      <div class="cal-detail-body">
        <div class="cal-detail-specialist">
          <div
            class="cal-detail-spec-avatar"
            :style="{ background: getSpec(selectedAppt.specialistName).color }"
          >
            {{ getSpec(selectedAppt.specialistName).initials }}
          </div>
          <div class="cal-detail-spec-info">
            <div class="cal-detail-spec-name">
              {{ selectedAppt.specialistName }}
            </div>
            <div class="cal-detail-spec-role">
              {{ getSpec(selectedAppt.specialistName).role }}
            </div>
          </div>
        </div>

        <div
          class="cal-detail-service-badge"
          :style="{
            background: SERVICE_COLORS[getServiceType(selectedAppt.service)].bg,
            color: SERVICE_COLORS[getServiceType(selectedAppt.service)].text,
          }"
        >
          {{ selectedAppt.service }}
        </div>

        <div class="cal-detail-rows">
          <div class="cal-detail-row">
            <span class="cal-detail-label">Дата</span>
            <span class="cal-detail-value">{{ formatDetailDate(selectedAppt.date) }}</span>
          </div>
          <div class="cal-detail-row">
            <span class="cal-detail-label">Время</span>
            <span class="cal-detail-value">{{ selectedAppt.start }} – {{ selectedAppt.end }}</span>
          </div>
          <div class="cal-detail-row">
            <span class="cal-detail-label">Длительность</span>
            <span class="cal-detail-value">{{ timeToMin(selectedAppt.end) - timeToMin(selectedAppt.start) }} мин</span>
          </div>
          <div class="cal-detail-row">
            <span class="cal-detail-label">Специалист</span>
            <span class="cal-detail-value">{{ selectedAppt.specialistName.split(' ')[0] }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.cal-app {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  color: #1a1d23;
}

.cal-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ── Header ── */
.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.cal-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cal-today-btn {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: #374151;
}

.cal-today-btn:hover {
  background: #f3f4f6;
}

.cal-nav-arrows {
  display: flex;
  gap: 0;
}

.cal-nav-arrows button {
  background: none;
  border: 1px solid #d1d5db;
  padding: 6px 10px;
  cursor: pointer;
  color: #6b7280;
  font-size: 14px;
}

.cal-nav-arrows button:first-child {
  border-radius: 8px 0 0 8px;
}

.cal-nav-arrows button:last-child {
  border-radius: 0 8px 8px 0;
  border-left: none;
}

.cal-nav-arrows button:hover {
  background: #f3f4f6;
}

.cal-date-label {
  font-size: 16px;
  font-weight: 600;
}

.cal-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cal-view-toggle {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.cal-view-toggle button {
  background: white;
  border: none;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: #6b7280;
}

.cal-view-toggle button.active {
  background: #4f46e5;
  color: white;
}

.cal-view-toggle button:not(:last-child) {
  border-right: 1px solid #d1d5db;
}

/* ── Legend ── */
.cal-legend {
  display: flex;
  gap: 14px;
  padding: 10px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.cal-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #6b7280;
}

.cal-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

/* ── State screens ── */
.cal-state-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.cal-state-icon {
  width: 40px;
  height: 40px;
  color: #9ca3af;
}

.cal-state-text {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  max-width: 400px;
}

.cal-retry-btn {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  background: #4f46e5;
  color: white;
  border: none;
  cursor: pointer;
}

.cal-retry-btn:hover {
  opacity: 0.9;
}

.cal-spin {
  animation: cal-spin 1s linear infinite;
}

@keyframes cal-spin {
  to { transform: rotate(360deg); }
}

/* ── DAY: specialist column headers ── */
.cal-columns-header {
  display: flex;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 0 12px 60px;
  flex-shrink: 0;
}

.cal-col-header {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 8px;
}

.cal-col-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.cal-col-name {
  font-size: 14px;
  font-weight: 500;
}

.cal-col-empty {
  flex: 1;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

/* ── WEEK: day column headers ── */
.cal-week-header {
  display: flex;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 0 0 60px;
  flex-shrink: 0;
}

.cal-week-day-header {
  flex: 1;
  text-align: center;
  padding: 12px 4px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  border-right: 1px solid #f0f1f3;
}

.cal-week-day-header:last-child {
  border-right: none;
}

.cal-week-day-header.today {
  color: #4f46e5;
  font-weight: 700;
}

.cal-day-num {
  font-size: 20px;
  font-weight: 700;
  display: block;
  margin-top: 2px;
}

.cal-day-num-today {
  background: #4f46e5;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cal-spec-count {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 2px;
}

.cal-spec-count-empty {
  color: #d1d5db;
}

/* ── Grid ── */
.cal-grid-wrapper {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.cal-grid {
  display: flex;
  position: relative;
}

.cal-time-axis {
  width: 60px;
  min-width: 60px;
  flex-shrink: 0;
}

.cal-time-slot {
  height: 80px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0 10px 0 0;
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  position: relative;
}

.cal-time-slot::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  border-top: 1px solid #e5e7eb;
}

.cal-columns-area {
  flex: 1;
  display: flex;
  position: relative;
}

.cal-spec-column {
  flex: 1;
  position: relative;
  border-right: 1px solid #f0f1f3;
  min-height: 100%;
}

.cal-spec-column:last-child {
  border-right: none;
}

/* Hour lines */
.cal-hour-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid #eef0f2;
  height: 0;
  z-index: 0;
  pointer-events: none;
}

.cal-half-hour-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed #f5f6f7;
  height: 0;
  z-index: 0;
  pointer-events: none;
}

/* ── Now indicator ── */
.cal-now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #ef4444;
  z-index: 20;
  pointer-events: none;
}

.cal-now-dot {
  position: absolute;
  left: -5px;
  top: -4px;
  width: 10px;
  height: 10px;
  background: #ef4444;
  border-radius: 50%;
}

/* ── DAY: appointment blocks ── */
.cal-appt {
  position: absolute;
  left: 4px;
  right: 4px;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
  cursor: pointer;
  overflow: hidden;
  z-index: 2;
  transition: box-shadow 0.15s, transform 0.15s;
  border-left: 3px solid;
}

.cal-appt:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: scale(1.01);
  z-index: 10;
}

.cal-appt.selected {
  box-shadow: 0 0 0 2px #4f46e5, 0 4px 12px rgba(79, 70, 229, 0.2);
  z-index: 15;
}

.cal-appt-service {
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.3;
  margin-bottom: 2px;
}

.cal-appt-time {
  font-size: 10px;
  opacity: 0.8;
}

.cal-appt-duration {
  font-size: 9px;
  opacity: 0.6;
  margin-top: 1px;
}

/* ── WEEK: columns & appointment blocks ── */
.cal-week-col {
  flex: 1;
  position: relative;
  border-right: 1px solid #f0f1f3;
  min-height: 100%;
}

.cal-week-col:last-child {
  border-right: none;
}

.cal-week-appt {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 4px;
  padding: 3px 5px;
  font-size: 9px;
  cursor: pointer;
  overflow: hidden;
  z-index: 2;
  border-left: 3px solid;
  transition: box-shadow 0.15s;
}

.cal-week-appt:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.cal-week-appt.selected {
  box-shadow: 0 0 0 2px #4f46e5, 0 4px 12px rgba(79, 70, 229, 0.2);
  z-index: 15;
}

.cal-wa-service {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cal-wa-name {
  font-size: 9px;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Empty day ── */
.cal-empty-day {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: #d1d5db;
}

/* ── Detail sidebar ── */
.cal-sidebar-detail {
  width: 340px;
  min-width: 340px;
  background: white;
  border-left: 1px solid #e5e7eb;
  overflow-y: auto;
}

.cal-detail-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cal-detail-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.cal-detail-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #9ca3af;
  padding: 4px 8px;
  border-radius: 6px;
}

.cal-detail-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.cal-detail-body {
  padding: 20px;
}

.cal-detail-specialist {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
}

.cal-detail-spec-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.cal-detail-spec-info {
  display: flex;
  flex-direction: column;
}

.cal-detail-spec-name {
  font-size: 14px;
  font-weight: 600;
}

.cal-detail-spec-role {
  font-size: 12px;
  color: #6b7280;
}

.cal-detail-service-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 8px;
}

.cal-detail-rows {
  margin-top: 20px;
}

.cal-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.cal-detail-row:last-child {
  border-bottom: none;
}

.cal-detail-label {
  font-size: 12px;
  color: #6b7280;
}

.cal-detail-value {
  font-size: 13px;
  font-weight: 500;
  text-align: right;
}
</style>

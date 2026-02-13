import { frontendURL } from '../../../helper/URLHelper';
import CalendarPageRouteView from './pages/CalendarPageRouteView.vue';
import CalendarIndex from './pages/Index.vue';

const meta = {
  permissions: ['administrator', 'agent'],
};

export const routes = [
  {
    path: frontendURL('accounts/:accountId/calendar'),
    component: CalendarPageRouteView,
    children: [
      {
        path: '',
        component: CalendarIndex,
        name: 'calendar_index',
        meta,
      },
    ],
  },
];

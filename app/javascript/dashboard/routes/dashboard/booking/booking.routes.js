import { frontendURL } from '../../../helper/URLHelper';
import BookingPageRouteView from './pages/BookingPageRouteView.vue';
import CatalogIndex from './pages/CatalogIndex.vue';
import PricingIndex from './pages/PricingIndex.vue';
import RequestsIndex from './pages/RequestsIndex.vue';

const meta = {
  permissions: ['administrator'],
};

export const routes = [
  {
    path: frontendURL('accounts/:accountId/booking'),
    component: BookingPageRouteView,
    children: [
      {
        path: 'catalog',
        component: CatalogIndex,
        name: 'booking_catalog',
        meta,
      },
      {
        path: 'pricing',
        component: PricingIndex,
        name: 'booking_pricing',
        meta,
      },
      {
        path: 'requests',
        component: RequestsIndex,
        name: 'booking_requests',
        meta,
      },
      {
        path: '',
        redirect: 'catalog',
      },
    ],
  },
];

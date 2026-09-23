import { Routes } from '@angular/router';
import { ActivityCreate } from './activities/activity-create/activity-create';
import { ActivityDetail } from './activities/activity-detail/activity-detail';
import { ActivityList } from './activities/activity-list/activity-list';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'activities' },
  { path: 'activities', component: ActivityList, title: 'Revision activities' },
  { path: 'activities/new', component: ActivityCreate, title: 'New activity' },
  { path: 'activities/:id', component: ActivityDetail, title: 'Revision activity' },
  { path: '**', redirectTo: 'activities' },
];

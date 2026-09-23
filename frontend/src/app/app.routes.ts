import { Routes } from '@angular/router';
import { AdminPage } from './admin/admin-page/admin-page';
import { ActivityCreate } from './activities/activity-create/activity-create';
import { ActivityDetail } from './activities/activity-detail/activity-detail';
import { ActivityEdit } from './activities/activity-edit/activity-edit';
import { ActivityList } from './activities/activity-list/activity-list';
import { ActivityPlayer } from './activities/activity-player/activity-player';
import { Account } from './auth/account/account';
import { AttemptDetail } from './attempts/attempt-detail/attempt-detail';
import { MyResults } from './attempts/my-results/my-results';
import { permissionGuard, signedInGuard } from './auth/auth.guards';
import { PERMISSIONS } from './auth/auth.service';
import { Register } from './auth/register/register';
import { SignIn } from './auth/sign-in/sign-in';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'activities' },
  { path: 'activities', component: ActivityList, title: 'Revision activities' },
  {
    path: 'activities/new',
    component: ActivityCreate,
    title: 'New activity',
    canActivate: [signedInGuard],
  },
  { path: 'activities/:id', component: ActivityDetail, title: 'Revision activity' },
  {
    path: 'activities/:id/edit',
    component: ActivityEdit,
    title: 'Edit the activity',
    canActivate: [signedInGuard],
  },
  { path: 'activities/:id/play', component: ActivityPlayer, title: 'Revision activity' },
  { path: 'results', component: MyResults, title: 'My results', canActivate: [signedInGuard] },
  {
    path: 'results/:id',
    component: AttemptDetail,
    title: 'Result',
    canActivate: [signedInGuard],
  },
  { path: 'sign-in', component: SignIn, title: 'Sign in' },
  { path: 'register', component: Register, title: 'Create an account' },
  { path: 'account', component: Account, title: 'Account', canActivate: [signedInGuard] },
  {
    path: 'admin',
    component: AdminPage,
    title: 'Administration',
    canActivate: [permissionGuard(PERMISSIONS.manageRoles)],
  },
  { path: '**', redirectTo: 'activities' },
];

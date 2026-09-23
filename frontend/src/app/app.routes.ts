import { Routes } from '@angular/router';
import { ActivityCreate } from './activities/activity-create/activity-create';
import { ActivityDetail } from './activities/activity-detail/activity-detail';
import { ActivityList } from './activities/activity-list/activity-list';
import { ActivityPlayer } from './activities/activity-player/activity-player';
import { Account } from './auth/account/account';
import { signedInGuard } from './auth/auth.guards';
import { Register } from './auth/register/register';
import { SignIn } from './auth/sign-in/sign-in';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'activities' },
  { path: 'activities', component: ActivityList, title: 'Revision activities' },
  { path: 'activities/new', component: ActivityCreate, title: 'New activity' },
  { path: 'activities/:id', component: ActivityDetail, title: 'Revision activity' },
  { path: 'activities/:id/play', component: ActivityPlayer, title: 'Revision activity' },
  { path: 'sign-in', component: SignIn, title: 'Sign in' },
  { path: 'register', component: Register, title: 'Create an account' },
  { path: 'account', component: Account, title: 'Account', canActivate: [signedInGuard] },
  { path: '**', redirectTo: 'activities' },
];

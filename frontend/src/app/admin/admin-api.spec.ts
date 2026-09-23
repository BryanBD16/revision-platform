import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminApi } from './admin-api';

describe('AdminApi', () => {
  let api: AdminApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets a page of users, with the search when there is one', () => {
    api.getUsers('', 1).subscribe();
    api.getUsers('ada', 2).subscribe();

    http.expectOne({ method: 'GET', url: '/api/admin/users?page=1' }).flush({});
    http.expectOne({ method: 'GET', url: '/api/admin/users?page=2&search=ada' }).flush({});
  });

  it('grants and revokes roles', () => {
    api.grantRole(3, 'admin').subscribe();
    api.revokeRole(3, 'admin').subscribe();

    http.expectOne({ method: 'PUT', url: '/api/admin/users/3/roles/admin' }).flush(null);
    http.expectOne({ method: 'DELETE', url: '/api/admin/users/3/roles/admin' }).flush(null);
  });

  it('gets the roles and the role changes', () => {
    api.getRoles().subscribe();
    api.getRoleChanges(2).subscribe();

    http.expectOne({ method: 'GET', url: '/api/admin/roles' }).flush([]);
    http.expectOne({ method: 'GET', url: '/api/admin/role-changes?page=2' }).flush({});
  });
});

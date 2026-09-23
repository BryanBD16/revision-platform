import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Theme } from '../activities/activity';
import { ThemeApi } from './theme-api';

describe('ThemeApi', () => {
  let api: ThemeApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ThemeApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets the themes', () => {
    let result: Theme[] | undefined;
    api.getThemes().subscribe((themes) => (result = themes));

    http.expectOne({ method: 'GET', url: '/api/themes' }).flush([{ id: 1, name: 'Biology' }]);

    expect(result).toEqual([{ id: 1, name: 'Biology' }]);
  });

  it('gets the courses', () => {
    let result: Theme[] | undefined;
    api.getCourses().subscribe((courses) => (result = courses));

    http.expectOne({ method: 'GET', url: '/api/courses' }).flush([{ id: 2, name: 'BIO 101' }]);

    expect(result).toEqual([{ id: 2, name: 'BIO 101' }]);
  });
});

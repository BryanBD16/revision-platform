import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Theme } from '../activities/activity';

@Injectable({ providedIn: 'root' })
export class ThemeApi {
  private readonly http = inject(HttpClient);

  getThemes(): Observable<Theme[]> {
    return this.http.get<Theme[]>('/api/themes');
  }

  getCourses(): Observable<Theme[]> {
    return this.http.get<Theme[]>('/api/courses');
  }
}

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ActivityCreate } from './activity-create';

describe('ActivityCreate', () => {
  let fixture: ComponentFixture<ActivityCreate>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ActivityCreate],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ActivityCreate);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function type(selector: string, value: string): void {
    const input = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('shows validation errors and sends nothing when the form is incomplete', async () => {
    type('#title', '   ');

    await submit();

    expect(element.textContent).toContain('The title is required.');
    expect(element.textContent).toContain('At least one theme is required.');
    http.expectNone('/api/activities');
  });

  it('creates the activity and opens it', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    type('#title', '  Cell biology ');
    type('#description', '  ');
    type('#themes', 'Biology, cells, , biology');

    await submit();

    const request = http.expectOne({ method: 'POST', url: '/api/activities' });
    expect(request.request.body).toEqual({
      title: 'Cell biology',
      description: null,
      themes: ['Biology', 'cells'],
    });
    request.flush({ id: 5 });
    expect(navigate).toHaveBeenCalledWith(['/activities', 5]);
  });

  it('shows validation messages returned by the server', async () => {
    type('#title', 'Cell biology');
    type('#themes', 'Biology');

    await submit();
    http
      .expectOne('/api/activities')
      .flush(
        { errors: { title: ['The title must be at most 200 characters.'] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(element.textContent).toContain('The title must be at most 200 characters.');
    expect(element.querySelector('button')!.disabled).toBe(false);
  });
});

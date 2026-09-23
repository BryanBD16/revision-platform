import { ParamMap, Params } from '@angular/router';
import { ActivityListQuery, Visibility } from '../activity';

export const EMPTY_QUERY: ActivityListQuery = {
  page: 1,
  title: null,
  courseId: null,
  themeIds: [],
  visibility: null,
};

const VISIBILITIES: Visibility[] = ['private', 'public'];

/** Reads the list query from the URL query parameters, ignoring invalid values. */
export function queryFromParams(params: ParamMap): ActivityListQuery {
  const themeIds = params
    .getAll('themeIds')
    .map(positiveInteger)
    .filter((id) => id !== null);

  return {
    page: positiveInteger(params.get('page')) ?? 1,
    title: params.get('title')?.trim() || null,
    courseId: positiveInteger(params.get('courseId')),
    themeIds: [...new Set(themeIds)],
    visibility: visibility(params.get('visibility')),
  };
}

/** The URL query parameters of a list query; default values are left out of the URL. */
export function paramsFromQuery(query: ActivityListQuery): Params {
  return {
    page: query.page === 1 ? null : query.page,
    title: query.title,
    courseId: query.courseId,
    themeIds: query.themeIds.length > 0 ? query.themeIds : null,
    visibility: query.visibility,
  };
}

export function hasFilters(query: ActivityListQuery): boolean {
  return (
    query.title !== null ||
    query.courseId !== null ||
    query.themeIds.length > 0 ||
    query.visibility !== null
  );
}

function visibility(value: string | null): Visibility | null {
  return VISIBILITIES.find((v) => v === value) ?? null;
}

function positiveInteger(value: string | null): number | null {
  const number = Number(value);
  return value && Number.isInteger(number) && number > 0 ? number : null;
}

import { ParamMap, Params } from '@angular/router';
import { ActivityListQuery } from '../activity';

/** Reads the list query from the URL query parameters, ignoring invalid values. */
export function queryFromParams(params: ParamMap): ActivityListQuery {
  return { page: positiveInteger(params.get('page')) ?? 1 };
}

/** The URL query parameters of a list query; default values are left out of the URL. */
export function paramsFromQuery(query: ActivityListQuery): Params {
  return { page: query.page === 1 ? null : query.page };
}

function positiveInteger(value: string | null): number | null {
  const number = Number(value);
  return value && Number.isInteger(number) && number > 0 ? number : null;
}

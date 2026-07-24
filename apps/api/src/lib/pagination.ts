export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export function parsePagination(
  pageValue: string | undefined,
  pageSizeValue: string | undefined,
): PaginationParams {
  const page = Math.max(1, Number(pageValue ?? DEFAULT_PAGE));
  const parsedPageSize = Number(pageSizeValue ?? DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(parsedPageSize) ? parsedPageSize : DEFAULT_PAGE_SIZE),
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function paginationMeta(total: number, page: number, pageSize: number) {
  return { page, pageSize, total };
}

type QueryLike = Record<string, unknown>;
export function getPagination(query: QueryLike) {
  const page = Math.max(parseInt(String(query.page ?? '1'), 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(String(query.pageSize ?? '20'), 10) || 20, 1), 100);
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  return { page, pageSize, skip, take };
}

export function listResponse<T>(items: T[], page: number, pageSize: number, total: number) {
  return { items, page, pageSize, total };
}

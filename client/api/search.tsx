// api/search.tsx
import { authFetch } from "@/utils/fetch-interceptor";
import { DOMAIN } from "@/้host";

const API = `${DOMAIN}/home`;

// ─── Types ───
export type SearchProduct = {
  id: string;
  title: string;
  price: number;
  rating: number;
  image_url?: string;
  image_id?: string;
  store_name?: string;
  category_id?: string;
};

export type SearchResult = {
  total: number;
  products: SearchProduct[];
  has_more: boolean;
  limit: number;
  offset: number;
};

export type SearchParams = {
  query?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: "newest" | "price_asc" | "price_desc" | "rating";
  limit?: number;
  offset?: number;
};

// ─── ค้นหาสินค้า ───
export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.append("query", params.query);
  if (params.category_id) searchParams.append("category_id", params.category_id);
  if (params.min_price !== undefined) searchParams.append("min_price", String(params.min_price));
  if (params.max_price !== undefined) searchParams.append("max_price", String(params.max_price));
  if (params.sort_by) searchParams.append("sort_by", params.sort_by);
  if (params.limit) searchParams.append("limit", String(params.limit));
  if (params.offset !== undefined) searchParams.append("offset", String(params.offset));

  const url = `${API}/search?${searchParams.toString()}`;
  const res = await authFetch(url);

  if (!res.ok) throw new Error("Failed to search products");
  const json = await res.json();
  return json.data;
}
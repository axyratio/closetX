// api/adminDashboard.ts
import { DOMAIN } from '@/้host';
import axios from 'axios';

const API_URL = `${DOMAIN}`;

// Interface definitions
export interface DashboardOverview {
  total_stores: number;
  total_products: number;
  total_orders: number;
  total_users: number;
}

export interface CategoryData {
  category: string;
  count: number;
}

export interface SalesData {
  label: string;
  value: number;
}

export interface PaymentMethodData {
  method: string;
  count: number;
  percentage: number;
}

export interface OrderStatusData {
  status: string;
  count: number;
}

export interface VTONUsageData {
  total_usage: number;
  by_model: Array<{
    model: string;
    count: number;
  }>;
}

export interface LowStockItem {
  type: 'product' | 'variant';
  id: string;
  name: string;
  stock: number;
  store_name: string;
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface RatingsOverview {
  average_rating: number;
  total_reviews: number;
  distribution: RatingDistribution[];
}

// Service functions
export const adminDashboardService = {
  // ดึงภาพรวม Dashboard
  getOverview: async (token: string) => {
    const response = await axios.get<{ data: DashboardOverview }>(
      `${API_URL}/admin/dashboard/overview`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data;
  },

  // ดึงจำนวนสินค้าแต่ละหมวดหมู่
  getProductsByCategory: async (token: string) => {
    const response = await axios.get<{ data: { categories: CategoryData[] } }>(
      `${API_URL}/admin/dashboard/products-by-category`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data.categories;
  },

  // ดึงยอดขาย (daily, weekly, monthly)
  getSalesStatistics: async (token: string, period: 'daily' | 'weekly' | 'monthly') => {
    const response = await axios.get<{ data: { period: string; data: SalesData[] } }>(
      `${API_URL}/admin/dashboard/sales`,
      {
        params: { period },
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data;
  },

  // ดึงสัดส่วนช่องทางการชำระเงิน
  getPaymentMethods: async (token: string) => {
    const response = await axios.get<{ data: { methods: PaymentMethodData[] } }>(
      `${API_URL}/admin/dashboard/payment-methods`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data.methods;
  },

  // ดึงจำนวนออเดอร์แต่ละสถานะ
  getOrderStatus: async (token: string) => {
    const response = await axios.get<{ data: { statuses: OrderStatusData[] } }>(
      `${API_URL}/admin/dashboard/order-status`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data.statuses;
  },

  // ดึงการใช้งาน VTON
  getVTONUsage: async (token: string) => {
    const response = await axios.get<{ data: VTONUsageData }>(
      `${API_URL}/admin/dashboard/vton-usage`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data;
  },

  // ดึงสินค้าที่เหลือน้อย
  getLowStockProducts: async (token: string, threshold: number = 10) => {
    const response = await axios.get<{ 
      data: { 
        threshold: number; 
        products: LowStockItem[]; 
        variants: LowStockItem[];
        total_count: number;
      } 
    }>(
      `${API_URL}/admin/dashboard/low-stock-products`,
      {
        params: { threshold },
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data;
  },

  // ดึงภาพรวมเรทติ้ง
  getRatings: async (token: string) => {
    const response = await axios.get<{ data: RatingsOverview }>(
      `${API_URL}/admin/dashboard/ratings`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data;
  }
};
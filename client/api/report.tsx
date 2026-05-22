// client/api/report.tsx
import { DOMAIN } from "@/้host";
import { getToken } from "@/utils/secure-store";

export interface CreateReportData {
  report_type: "user" | "store";
  reported_id: string;
  reason: string;
  description: string;
  image_urls: string[];
}

export async function createReport(data: CreateReportData) {
  const token = await getToken();
  const formData = new FormData();
  
  formData.append("report_type", data.report_type);
  formData.append("reported_id", data.reported_id);
  formData.append("reason", data.reason);
  formData.append("description", data.description);
  formData.append("image_urls", JSON.stringify(data.image_urls));

  const response = await fetch(`${DOMAIN}/reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return await response.json();
}

export async function getAllReports(params?: {
  report_type?: string;
  status?: string;
  reason?: string;
  skip?: number;
  limit?: number;
}) {
  const token = await getToken();
  const queryParams = new URLSearchParams();

  if (params?.report_type) queryParams.append("report_type", params.report_type);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.reason) queryParams.append("reason", params.reason);
  if (params?.skip !== undefined) queryParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());

  const response = await fetch(`${DOMAIN}/reports?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return await response.json();
}

// ✅ อัพเดท: เพิ่ม autoMarkReviewing parameter
export async function getReportDetail(reportId: string, autoMarkReviewing: boolean = false) {
  const token = await getToken();
  const queryParams = new URLSearchParams();
  
  if (autoMarkReviewing) {
    queryParams.append("auto_mark_reviewing", "true");
  }
  
  const url = `${DOMAIN}/reports/${reportId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return await response.json();
}

export async function updateReportStatus(
  reportId: string,
  status: string,
  adminNote?: string
) {
  const token = await getToken();
  const formData = new FormData();
  
  formData.append("status", status);
  if (adminNote) formData.append("admin_note", adminNote);

  const response = await fetch(`${DOMAIN}/reports/${reportId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return await response.json();
}

export const formatReportReason = (reason: string) => {
  const reasons: any = {
    spam: "สแปม",
    harassment: "การล่วงละเมิด",
    inappropriate: "เนื้อหาไม่เหมาะสม",
    scam: "การหลอกลวง",
    fake: "ปลอม/สินค้าปลอม",
    copyright: "ละเมิดลิขสิทธิ์",
    other: "อื่นๆ",
  };
  return reasons[reason] || reason;
};

export const formatReportStatus = (status: string) => {
  const statuses: any = {
    pending: "รอตรวจสอบ",
    reviewing: "กำลังตรวจสอบ",
    resolved: "แก้ไขแล้ว",
    rejected: "ปฏิเสธ",
  };
  return statuses[status] || status;
};
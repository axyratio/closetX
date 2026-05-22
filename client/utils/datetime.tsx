// utils/datetime.ts
export function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";

  // ใช้ Intl ถ้ามี (Expo/Hermes ส่วนใหญ่มี)
  try {
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    // fallback กันพัง
    return d.toISOString().replace("T", " ").slice(0, 16);
  }
}

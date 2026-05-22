// components/tab/index.tsx
import { Box, Pressable, Text } from "native-base";
import React, { useMemo, useState } from "react";

type TabKey = "products" | "categories" | "closed";

type MyTabsProps = {
  productContent: React.ReactNode;
  categoryContent: React.ReactNode;

  // ✅ เพิ่มแบบ optional: ถ้าไม่ส่งมา จะไม่มีแท็บ “ปิดการขาย”
  closedContent?: React.ReactNode;

  // ✅ ให้ initialTab รองรับ closed ด้วย (แต่ถ้าไม่มี closedContent แล้ว initialTab=closed จะ fallback)
  initialTab?: TabKey;
};

export default function MyTabs({
  productContent,
  categoryContent,
  closedContent,
  initialTab = "products",
}: MyTabsProps) {
  const tabs = useMemo(() => {
    const base: Array<{ key: TabKey; label: string }> = [
      { key: "products", label: "รายการสินค้า" },
      { key: "categories", label: "หมวดหมู่" },
    ];
    if (closedContent) base.push({ key: "closed", label: "ปิดการขาย" });
    return base;
  }, [closedContent]);

  const safeInitialTab: TabKey =
    initialTab === "closed" && !closedContent ? "products" : initialTab;

  const [tab, setTab] = useState<TabKey>(safeInitialTab);

  const renderContent = () => {
    if (tab === "products") return productContent;
    if (tab === "categories") return categoryContent;
    return closedContent ?? productContent; // กันพัง
  };

  return (
    <Box flex={1}>
      <Box flexDirection="row" bg="white" shadow={2}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              flex={1}
              p={3}
              onPress={() => setTab(t.key)}
              style={{ alignItems: "center" }}
            >
              <Text
                color={active ? "violet.600" : "gray.500"}
                fontWeight={active ? "bold" : "normal"}
              >
                {t.label}
              </Text>
              {active && (
                <Box height="2px" bg="violet.600" width="50%" mt={2} />
              )}
            </Pressable>
          );
        })}
      </Box>

      <Box flex={1} p={4}>
        {renderContent()}
      </Box>
    </Box>
  );
}

// File: components/category/category-list.tsx
// Issue #12: Hardcode 5 หมวดหมู่ + SVG inline + ปุ่มดูทั้งหมด

import { useRouter } from "expo-router";
import { Box, Text } from "native-base";
import React from "react";
import { Pressable, View } from "react-native";
import { Circle, Path, Svg } from "react-native-svg";

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const TshirtIcon = ({ size = 36 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Path
      d="M20 8 L8 20 L16 24 L16 56 L48 56 L48 24 L56 20 L44 8 C44 8 40 14 32 14 C24 14 20 8 20 8Z"
      fill="#7c3aed"
      stroke="#5b21b6"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShirtIcon = ({ size = 36 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Path
      d="M20 8 L8 20 L16 24 L16 56 L48 56 L48 24 L56 20 L44 8 C44 8 40 12 32 12 C24 12 20 8 20 8Z"
      fill="#2563eb"
      stroke="#1d4ed8"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <Path d="M32 12 L32 30" stroke="#1d4ed8" strokeWidth="2" />
    <Path d="M28 14 L36 14" stroke="#1d4ed8" strokeWidth="1.5" />
    <Path d="M27 18 L37 18" stroke="#1d4ed8" strokeWidth="1.5" />
  </Svg>
);

const FormalIcon = ({ size = 36 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Path
      d="M20 6 L8 22 L16 26 L16 58 L48 58 L48 26 L56 22 L44 6 L38 14 L32 8 L26 14 Z"
      fill="#1f2937"
      stroke="#111827"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <Path d="M26 14 L32 8 L38 14 L35 30 L29 30 Z" fill="#fff" />
    <Circle cx="32" cy="22" r="2" fill="#7c3aed" />
    <Circle cx="32" cy="29" r="2" fill="#7c3aed" />
  </Svg>
);

const CuteIcon = ({ size = 36 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Path
      d="M20 8 L8 20 L16 24 L16 56 L48 56 L48 24 L56 20 L44 8 C44 8 40 14 32 14 C24 14 20 8 20 8Z"
      fill="#ec4899"
      stroke="#db2777"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <Circle cx="24" cy="35" r="3" fill="#fce7f3" />
    <Circle cx="40" cy="35" r="3" fill="#fce7f3" />
    <Path
      d="M27 44 Q32 49 37 44"
      stroke="#fce7f3"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
);

const SportIcon = ({ size = 36 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Path
      d="M22 6 L8 18 L16 23 L16 56 L48 56 L48 23 L56 18 L42 6 C42 6 38 12 32 12 C26 12 22 6 22 6Z"
      fill="#059669"
      stroke="#047857"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <Path
      d="M22 6 L28 22 L32 18 L36 22 L42 6"
      stroke="#d1fae5"
      strokeWidth="1.5"
      fill="none"
    />
  </Svg>
);

// ─── Hardcoded Categories ─────────────────────────────────────────────────────

const HARDCODED_CATEGORIES = [
  {
    slug: "tshirt",
    name: "เสื้อยืด",
    bg: "#ede9fe",
    Icon: TshirtIcon,
  },
  {
    slug: "shirt",
    name: "เสื้อเชิ้ต",
    bg: "#dbeafe",
    Icon: ShirtIcon,
  },
  {
    slug: "formal",
    name: "เสื้อทางการ",
    bg: "#f3f4f6",
    Icon: FormalIcon,
  },
  {
    slug: "cute",
    name: "เสื้อน่ารัก",
    bg: "#fce7f3",
    Icon: CuteIcon,
  },
  {
    slug: "sport",
    name: "เสื้อกีฬา",
    bg: "#d1fae5",
    Icon: SportIcon,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  categories?: any[]; // รับ prop เดิมไว้ก็ได้ แต่ไม่ใช้แล้ว
};

export const HomeCategoryList: React.FC<Props> = () => {
  const router = useRouter();

  return (
    <Box mt={6}>
      {/* Header row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
      >
        <Text fontWeight="600" fontSize="md">
          หมวดหมู่
        </Text>
        <Pressable
          onPress={() => router.push("/(home)/categories" as any)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text fontSize="xs" color="violet.600" fontWeight="500">
            ดูทั้งหมด →
          </Text>
        </Pressable>
      </View>

      {/* Category icons row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
      >
        {HARDCODED_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.slug}
            onPress={() =>
              router.push({
                pathname: "/(home)/categories",
                params: { categorySlug: cat.slug, categoryName: cat.name },
              } as any)
            }
            style={({ pressed }) => ({
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: cat.bg,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 6,
              }}
            >
              <cat.Icon size={34} />
            </View>
            <Text fontSize="2xs" numberOfLines={1} textAlign="center">
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </Box>
  );
};

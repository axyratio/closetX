// components/home/HomeBannerSlider.tsx
import { HomeBanner } from "@/api/home";
import { useNavigationState } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Box, Button, Text } from "native-base";
import React from "react";
import { Dimensions, ScrollView, View } from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32; // margin ซ้ายขวา

type Props = {
  banners: HomeBanner[];
};

export const HomeBannerSlider: React.FC<Props> = ({ banners }) => {
  const router = useRouter();
  const routes = useNavigationState((state) => state?.routes);
  console.log(
    "NAV STACK:",
    JSON.stringify(
      routes?.map((r) => r.name),
      null,
      2,
    ),
  );
  console.log(
    "FULL STATE:",
    JSON.stringify(
      useNavigationState((s) => s),
      null,
      2,
    ),
  );

  const handlePress = (banner: HomeBanner) => {
    if (banner.route) {
      router.navigate("/vton" as any);
    }
  };

  if (!banners.length) return null;

  return (
    <Box mt={4}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {banners.map((banner) => (
          <View
            key={banner.id}
            style={{
              width: CARD_WIDTH,
              marginRight: 12,
            }}
          >
            <Box
              bg="#f5e9ff"
              h={180}
              borderRadius={16}
              p={4}
              flexDirection="row"
              alignItems="center"
            >
              {/* ฝั่งซ้าย: รูปภาพ */}
              {/* <Image
                source={{ uri: banner.imageUrl }}
                style={{
                  width: 110,
                  height: 180,
                  borderRadius: 12,
                }}
                resizeMode="cover"
              /> */}

              {/* ฝั่งขวา: content + button แนวตั้ง */}
              <Box flex={1} ml={4} justifyContent="space-between">
                <Box>
                  <Text fontSize="md" fontWeight="bold" color="#1f2933">
                    {banner.title}
                  </Text>
                  {banner.subtitle && (
                    <Text mt={2} fontSize="xs" color="#4b5563">
                      {banner.subtitle}
                    </Text>
                  )}
                </Box>

                <Button
                  mt={4}
                  borderRadius={999}
                  bg="#7c3aed"
                  _pressed={{ bg: "#6d28d9" }}
                  alignSelf="flex-start"
                  onPress={() => handlePress(banner)}
                >
                  {banner.buttonLabel}
                </Button>
              </Box>
            </Box>
          </View>
        ))}
      </ScrollView>
    </Box>
  );
};

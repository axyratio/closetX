// components/image.tsx
import { Box, Text } from "native-base";
import React, { useEffect, useRef } from "react";
import {
    Dimensions,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    View,
} from "react-native";

type ProductImage = {
  imageId: string;
  imageUrl: string;
};

type MainImageProps = {
  images: ProductImage[];
  selectedIndex: number;
  onChangeIndex?: (index: number) => void;
};

type ThumbnailStripProps = {
  images: ProductImage[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ProductMainImage: React.FC<MainImageProps> = ({
  images,
  selectedIndex,
  onChangeIndex,
}) => {
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      x: selectedIndex * SCREEN_WIDTH,
      animated: true,
    });
  }, [selectedIndex]);

  const handleMomentumEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);

    if (
      newIndex !== selectedIndex &&
      newIndex >= 0 &&
      newIndex < images.length
    ) {
      onChangeIndex?.(newIndex); // 👈 แจ้ง parent ให้เปลี่ยน selectedIndex
    }
  };

  return (
    <Box position="relative" bg="black">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {images.map((img) => (
          <Image
            key={img.imageId}
            source={{ uri: img.imageUrl }}
            style={{ width: SCREEN_WIDTH, height: 390 }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      <Box
        position="absolute"
        bottom={2}
        right={2}
        bg="rgba(10, 9, 9, 0.5)"
        borderRadius={999}
        px={4}
        py={1}
      >
        <Text color="white" fontSize="xs">
          {images.length
            ? `${selectedIndex + 1} / ${images.length}`
            : "0 / 0"}
        </Text>
      </Box>
    </Box>
  );
};

export const ProductThumbnailStrip: React.FC<ThumbnailStripProps> = ({
  images,
  selectedIndex,
  onSelect,
}) => {
  const scrollRef = useRef<ScrollView | null>(null);

  // เวลา selectedIndex เปลี่ยน (ทั้งจากการสไลด์ / จากการกด thumbnail)
  // ให้เลื่อนแถบ thumbnail ให้รูปที่เลือกไม่หลุดจอ
  useEffect(() => {
    if (!scrollRef.current) return;
    const ITEM_SIZE = 60;      // กว้างภาพ
    const ITEM_MARGIN = 8;     // marginRight
    const PADDING = 16;        // paddingHorizontal ของ ScrollView

    const x = selectedIndex * (ITEM_SIZE + ITEM_MARGIN) - PADDING;
    scrollRef.current.scrollTo({
      x: Math.max(0, x),
      animated: true,
    });
  }, [selectedIndex]);

  return (
    <Box bg="white" py={2}>
      <Box flexDirection="row" px={4} mb={1}>
        <Text fontSize="xs" color="gray.500">
          {images.length} ตัวเลือก
        </Text>
      </Box>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {images.map((img, index) => {
          const isActive = index === selectedIndex;
          return (
            <Pressable
              key={img.imageId}
              onPress={() => onSelect(index)}
              style={{ marginRight: 8 }}
            >
              <View
                style={{
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive ? "#8b5cf6" : "#e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: img.imageUrl }}
                  style={{ width: 60, height: 60 }}
                  resizeMode="cover"
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};

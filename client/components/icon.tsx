// components/IconWithBadge.tsx
import { Box, Text } from "native-base";
import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";

type IconWithBadgeProps = {
  icon: React.ReactNode;          // ส่ง <Ionicons ... /> เข้ามาได้เลย
  count?: number;                 // จำนวนบน badge
  maxCount?: number;              // เกินนี้ให้โชว์เป็น "99+"
  onPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export const IconWithBadge: React.FC<IconWithBadgeProps> = ({
  icon,
  count = 0,
  maxCount = 99,
  onPress,
  containerStyle,
}) => {
  const showBadge = count > 0;
  const displayCount =
    count > maxCount ? `${maxCount}+` : String(count);

  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          width: 32,
          height: 32,
          borderRadius: 999,
          backgroundColor: "rgba(175, 175, 175, 0.4)",
          alignItems: "center",
          justifyContent: "center",
        },
        containerStyle,
      ]}
    >
      {icon}

      {showBadge && (
        <Box
          position="absolute"
          top={-2}
          right={-2}
          bg="red.500"
          borderRadius={999}
          px={1.5}
          minWidth={4}
          height={4}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize="9px" color="white">
            {displayCount}
          </Text>
        </Box>
      )}
    </Pressable>
  );
};

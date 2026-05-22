import Feather from "@expo/vector-icons/Feather";
import { Box, HStack, IBoxProps, Pressable, Text, VStack } from "native-base";
import React, { useEffect, useState } from "react";
import {
  Pressable as RNPressable,
  PressableProps as RNPressableProps,
} from "react-native";
import { getRole } from "../../utils/secure-store";

/* -------------------------------------------------------------
   CustomPressable — iOS-style menu row
------------------------------------------------------------- */
type CustomPressableProps = RNPressableProps &
  IBoxProps & {
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
    justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
    color?: string;
    fontSize?: number;
    showChevron?: boolean;
    rolesAllowed?: ("user" | "admin" | "seller" | string)[];
  };

export const CustomPressable: React.FC<CustomPressableProps> = ({
  title,
  subtitle,
  children,
  icon,
  iconPosition = "left",
  justifyContent = "flex-start",
  color,
  fontSize,
  showChevron = true,
  rolesAllowed,
  onPress,
  ...props
}) => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getRole().then(setRole);
  }, []);

  const isAllowed = !rolesAllowed || (role && rolesAllowed.includes(role));
  if (!isAllowed) return null;

  // ตรวจว่าเป็นปุ่ม destructive (สีแดง) หรือเปล่า
  const isDestructive = color === "red.500" || color === "#ef4444";

  return (
    <RNPressable onPress={onPress}>
      {({ pressed }) => (
        <Box
          bg={pressed ? "purple.50" : "white"}
          px={4}
          py={3}
          {...props}
        >
          <HStack alignItems="center" space={3}>
            {/* Icon */}
            {icon && iconPosition === "left" && (
              <Box
                w={9} h={9}
                borderRadius={10}
                bg={isDestructive ? "red.50" : "purple.50"}
                justifyContent="center"
                alignItems="center"
              >
                {icon}
              </Box>
            )}

            {/* Title + subtitle */}
            <Box flex={1}>
              {title ? (
                <Text
                  fontSize={fontSize ?? 15}
                  fontWeight="medium"
                  color={isDestructive ? "red.500" : (color ?? "gray.800")}
                >
                  {title}
                </Text>
              ) : (
                children
              )}
              {subtitle ? (
                <Text fontSize={12} color="gray.400" mt={0.5}>
                  {subtitle}
                </Text>
              ) : null}
            </Box>

            {/* Chevron */}
            {showChevron && !isDestructive && (
              <Feather name="chevron-right" size={16} color="#a78bfa" />
            )}

            {/* Right icon */}
            {icon && iconPosition === "right" && <Box ml={2}>{icon}</Box>}
          </HStack>
        </Box>
      )}
    </RNPressable>
  );
};

/* -------------------------------------------------------------
   EditPressable — inline editable row
------------------------------------------------------------- */
type FormProfileProps = {
  value: string;
  title: string;
  onPress?: () => void;
  rolesAllowed?: ("user" | "admin" | string)[];
};

export const EditPressable = ({
  value,
  title,
  onPress,
  rolesAllowed,
}: FormProfileProps) => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getRole().then(setRole);
  }, []);

  const isAllowed = !rolesAllowed || (role && rolesAllowed.includes(role));
  if (!isAllowed) return null;

  return (
    <Pressable onPress={onPress} w="100%">
      {({ isPressed }) => (
        <Box
          bg={isPressed ? "purple.50" : "white"}
          px={4}
          py={3}
          w="100%"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <VStack>
              <Text fontSize={12} color="gray.400" mb={0.5}>
                {title}
              </Text>
              <Text fontSize={15} color="gray.800" fontWeight="medium">
                {value || "—"}
              </Text>
            </VStack>
            <Feather name="chevron-right" size={16} color="#a78bfa" />
          </HStack>
        </Box>
      )}
    </Pressable>
  );
};
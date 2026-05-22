// components/address/SelectedAddressCard.tsx
import { Ionicons } from "@expo/vector-icons";
import {
  Box,
  HStack,
  Icon,
  Pressable,
  Spinner,
  Text,
  VStack,
} from "native-base";
import React from "react";
import { ShippingAddress } from "@/api/address";

type Props = {
  address?: ShippingAddress;
  loading?: boolean;
  onPressChange?: () => void;
};

export const SelectedAddressCard: React.FC<Props> = ({
  address,
  loading,
  onPressChange,
}) => {
  return (
    <Box bg="white" p={3} borderRadius="md" shadow={1}>
      <HStack justifyContent="space-between" alignItems="flex-start">
        <VStack flex={1} space={1}>
          <HStack alignItems="center" space={1}>
            <Icon as={Ionicons} name="location-sharp" size="sm" color="violet.600" />
            <Text fontSize="sm" fontWeight="semibold">
              ที่อยู่จัดส่ง
            </Text>
          </HStack>

          {loading ? (
            <Spinner size="sm" mt={2} />
          ) : address ? (
            <>
              <Text fontSize="xs" color="coolGray.800">
                {address.full_name}  {address.phone_number}
              </Text>
              <Text fontSize="xs" color="coolGray.600">
                {address.address_line}
                {address.sub_district ? ` ${address.sub_district}` : ""}
                {address.district ? ` ${address.district}` : ""}
                {address.province ? ` ${address.province}` : ""}{" "}
                {address.postal_code || ""}
              </Text>
            </>
          ) : (
            <Text fontSize="xs" color="coolGray.500">
              ยังไม่มีที่อยู่ กรุณาเพิ่มที่อยู่จัดส่ง
            </Text>
          )}
        </VStack>

        <Pressable onPress={onPressChange} ml={3}>
          <Icon as={Ionicons} name="pencil" size="md" color="violet.700" />
        </Pressable>
      </HStack>
    </Box>
  );
};

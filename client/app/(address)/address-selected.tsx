// components/address/AddressSelectScreen.tsx
import { useAddressStore } from "@/components/address/address-store";
import { AppBarNoCheck } from "@/components/navbar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Box,
  Button,
  Divider,
  HStack,
  Icon,
  Pressable,
  ScrollView,
  Text,
  VStack,
} from "native-base";
import React, { useEffect, useState } from "react";

export const AddressSelectScreen: React.FC = () => {
  const router = useRouter();
  const { addresses, selected, fetchAll, selectById } = useAddressStore();

  // ✅ ให้ state เริ่มจาก selected ใน store ถ้ามี
  const [selectedId, setSelectedId] = useState<string | null>(
    selected?.ship_addr_id ?? null
  );

  useEffect(() => {
    fetchAll();
  }, []);

  // ✅ ถ้า selected ใน store เปลี่ยน (เช่น มาจากหน้าอื่น / จาก fetchAll logic)
  // ให้ sync เข้า local state ด้วย
  useEffect(() => {
    if (selected?.ship_addr_id) {
      setSelectedId(selected.ship_addr_id);
    }
  }, [selected?.ship_addr_id]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleConfirm = () => {
    if (!selectedId) {
      alert("กรุณาเลือกที่อยู่ก่อน");
      return;
    }
    selectById(selectedId); // อัปเดตเข้า global store
    router.back();
  };

  const handleEdit = (id: string) => {
    router.push({ pathname: "address-edit", params: { id } } as any);
  };

  const handleAddNew = () => {
    router.push("address-new" as any);
  };

  return (
    <Box flex={1} bg="coolGray.50">
      <AppBarNoCheck title="เลือกที่อยู่จัดส่ง" />

      <ScrollView flex={1} contentContainerStyle={{ padding: 16 }}>
        {addresses.map((addr) => {
          const id = String(addr.ship_addr_id);
          const isSelected = selectedId === id;

          return (
            <Pressable key={id} onPress={() => handleSelect(id)}>
              <Box
                bg="white"
                p={3}
                borderRadius="md"
                mb={2}
                shadow={1}
                borderWidth={isSelected ? 1 : 0}
                borderColor={isSelected ? "violet.600" : "coolGray.200"}
              >
                <HStack alignItems="flex-start" space={3}>
                  {/* วงกลม radio แบบ custom */}
                  <Box
                    mt={1}
                    w={5}
                    h={5}
                    borderRadius="full"
                    borderWidth={1}
                    borderColor={isSelected ? "violet.600" : "coolGray.400"}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {isSelected && (
                      <Box w={3} h={3} borderRadius="full" bg="violet.600" />
                    )}
                  </Box>

                  {/* การ์ดข้อมูล */}
                  <VStack flex={1} space={1}>
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="sm" fontWeight="semibold">
                        {addr.full_name || "ไม่มีชื่อ"}
                      </Text>
                      <Pressable onPress={() => handleEdit(addr.ship_addr_id)}>
                        <Icon
                          as={Ionicons}
                          name="pencil"
                          size="sm"
                          color="violet.700"
                        />
                      </Pressable>
                    </HStack>

                    <Text fontSize="xs" color="coolGray.800">
                      {addr.phone_number}
                    </Text>
                    <Text fontSize="xs" color="coolGray.600">
                      {addr.address_line || "ที่อยู่"}
                      {addr.sub_district ? ` ${addr.sub_district}` : ""}
                      {addr.district ? ` ${addr.district}` : ""}
                      {addr.province ? ` ${addr.province}` : ""}{" "}
                      {addr.postal_code || ""}
                    </Text>

                    {addr.is_default && (
                      <Box
                        mt={1}
                        alignSelf="flex-start"
                        px={2}
                        py={0.5}
                        borderRadius="full"
                        bg="violet.50"
                      >
                        <Text fontSize="2xs" color="violet.700">
                          ค่าเริ่มต้น
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </HStack>
              </Box>
            </Pressable>
          );
        })}

        <Divider my={3} />

        <Button
          variant="outline"
          borderColor="violet.600"
          _text={{ color: "violet.700", fontSize: "sm" }}
          leftIcon={<Icon as={Ionicons} name="add-circle-outline" size="sm" />}
          onPress={handleAddNew}
        >
          เพิ่มที่อยู่ใหม่
        </Button>
      </ScrollView>

      <Box px={4} pb={6}>
        <Button onPress={handleConfirm}>ยืนยันที่อยู่</Button>
      </Box>
    </Box>
  );
};

export default AddressSelectScreen;

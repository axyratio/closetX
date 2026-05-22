// components/cart/cart-item-card.tsx
import { CartItem } from "@/api/cart";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  Box,
  Checkbox,
  HStack,
  Icon,
  IconButton,
  Image,
  Pressable,
  Text,
  VStack,
} from "native-base";
import React from "react";

type Props = {
  item: CartItem;
  selected: boolean;
  onToggleSelected: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  isEditMode?: boolean;
  onDelete?: () => void;
  onPressItem?: () => void;
};

const _CartItemCard: React.FC<Props> = ({
  item,
  selected,
  onToggleSelected,
  onIncrease,
  onDecrease,
  isEditMode = false,
  onDelete,
  onPressItem,
}) => {
  const img = item.image_url || "";
  const isMax = item.quantity >= (item.stock_available ?? Infinity);

  return (
    <Box
      bg="white"
      px={3}
      py={3}
      borderBottomWidth={1}
      borderColor="coolGray.100"
    >
      <HStack space={3} alignItems="flex-start">
        {!isEditMode ? (
          <Checkbox
            value={item.cart_item_id}
            isChecked={selected}
            onChange={onToggleSelected}
            accessibilityLabel="เลือกสินค้า"
            _checked={{ bg: "violet.600", borderColor: "violet.600" }}
          />
        ) : (
          <Box w={5} />
        )}

        <Box flex={1}>
          <HStack space={3} alignItems="flex-start">
            <Box
              width={"64px"}
              height={"64px"}
              backgroundColor={"coolGray.100"}
              borderRadius={5}
              alignItems="center"
              justifyContent="center"
            >
              {img && img.trim() !== "" ? (
                <Image
                  source={{ uri: img }}
                  alt="Product Image"
                  width={"64px"}
                  height={"64px"}
                  borderRadius={5}
                  resizeMode="cover"
                />
              ) : (
                <Text fontSize="8px" color="gray.500" textAlign="center">
                  ไม่มีรูปภาพ
                </Text>
              )}
            </Box>

            <VStack flex={1} space={1}>
              <Pressable onPress={onPressItem}>
                <Text
                  numberOfLines={2}
                  fontSize="sm"
                  fontWeight="medium"
                  color="coolGray.800"
                >
                  {item.product_name}
                </Text>
                <Text fontSize="xs" color="violet.600">
                  ตัวเลือก: {item.variant_name}
                </Text>
              </Pressable>

              <HStack mt={1} alignItems="center" justifyContent="space-between">
                <VStack>
                  {/* ✅ แสดงราคาต่อหน่วย × จำนวน */}
                  <Text fontSize="sm" color="violet.600" fontWeight="bold">
                    ฿{item.price_at_addition} 
                  </Text>
                  {/* ✅ แสดง subtotal (ราคารวม) */}
                  
                </VStack>

                {!isEditMode ? (
                  <HStack space={1} alignItems="center">
                    <Box backgroundColor={"coolGray.100"}>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        onPress={onDecrease}
                        accessibilityLabel="ลดจำนวนสินค้า"
                      >
                        <Icon
                          as={Ionicons}
                          name="remove-outline"
                          color="coolGray.700"
                        />
                      </IconButton>
                    </Box>
                    <Text fontSize="sm" w={6} textAlign="center">
                      {item.quantity}
                    </Text>
                    <Box
                      backgroundColor={"coolGray.100"}
                      borderRadius={6}
                      opacity={isMax ? 0.4 : 1}
                      pointerEvents={isMax ? "none" : "auto"}
                    >
                      <IconButton
                        size="sm"
                        variant="ghost"
                        accessibilityLabel="เพิ่มจำนวนสินค้า"
                        onPress={onIncrease}
                        isDisabled={isMax}
                      >
                        <Icon
                          as={Ionicons}
                          name="add-outline"
                          color="coolGray.700"
                        />
                      </IconButton>
                    </Box>
                  </HStack>
                ) : (
                  <Pressable
                    onPress={onDelete}
                    bg="red.400"
                    px={4}
                    py={1}
                    borderRadius={8}
                  >
                    <HStack space={1} alignItems="center">
                      <Icon
                        as={MaterialIcons}
                        name="delete"
                        size="xs"
                        color="white"
                      />
                      <Text fontSize="xs" color="white">
                        ลบ
                      </Text>
                    </HStack>
                  </Pressable>
                )}
              </HStack>
            </VStack>
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
};

export const CartItemCard = React.memo(_CartItemCard, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.item.quantity === next.item.quantity &&
    prev.item.subtotal === next.item.subtotal &&
    prev.isEditMode === next.isEditMode
  );
});
// components/navbar.tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Box, HStack, Icon, IconButton, Text, View } from "native-base";
import React, { useEffect } from "react";

type AppBarAction = {
  iconName: React.ComponentProps<typeof MaterialIcons>["name"];
  iconColor?: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

type AppBarNoCheckProps = {
  title: string;
  titleColor?: string;
  backgroundColor?: string;
  statusBarColor?: string;
  statusBarStyle?: "light" | "dark";
  backIconName?: React.ComponentProps<typeof MaterialIcons>["name"];
  backIconColor?: string;
  onBackPress?: () => void;
  fontWeight?: "thin" | "normal" | "bold" | "semi-bold" | number;
  actions?: AppBarAction[];
};

export const AppBarNoCheck = ({
  title,
  titleColor = "white",
  backgroundColor = "#7c3aed",
  statusBarColor,
  backIconName = "arrow-back",
  backIconColor = "white",
  fontWeight = "thin",
  onBackPress,
  actions = [],
}: AppBarNoCheckProps) => {
  const router = useRouter();
  const handleBack = onBackPress ?? (() => router.back());

  // ถ้าไม่ระบุ statusBarColor ให้ใช้ backgroundColor
  // แต่ถ้า backgroundColor เป็น native-base token (เช่น "violet.800")
  // ต้องส่ง hex จริงๆ ให้ StatusBar → รับเป็น prop แยก
  const resolvedStatusBarColor =
    statusBarColor ??
    (backgroundColor.startsWith("#") ? backgroundColor : "#3700B3");

  return (
    <Box safeAreaTop bg={backgroundColor}>
      <StatusBar backgroundColor={resolvedStatusBarColor} style="auto" />
      <HStack
        bg={backgroundColor}
        px="1"
        py="3"
        justifyContent="space-between"
        alignItems="center"
        w="100%"
      >
        {/* ── ซ้าย: back + title ── */}
        <HStack alignItems="center" flex={1}>
          <IconButton
            icon={
              <Icon
                size="lg"
                as={MaterialIcons}
                name={backIconName}
                color={backIconColor}
              />
            }
            accessibilityLabel="ย้อนกลับ"
            onPress={handleBack}
          />
          <Text
            color={titleColor}
            fontSize="20"
            fontWeight={fontWeight === "thin" ? "300" : fontWeight}
            numberOfLines={1}
            flex={1}
          >
            {title}
          </Text>
        </HStack>

        {/* ── ขวา: action icons (ถ้ามี) ── */}
        {actions.length > 0 && (
          <HStack alignItems="center">
            {actions.map((action, index) => (
              <IconButton
                key={index}
                icon={
                  <Icon
                    size="lg"
                    as={MaterialIcons}
                    name={action.iconName}
                    color={action.iconColor ?? "white"}
                  />
                }
                accessibilityLabel={
                  action.accessibilityLabel ?? action.iconName
                }
                onPress={action.onPress}
              />
            ))}
          </HStack>
        )}
      </HStack>
    </Box>
  );
};

// components/home/HomeNavbar.tsx
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useCartStore } from "./cart/cart-memo";
import { IconWithBadge } from "./icon";

type HomeNavbarProps = {
  searchValue: string;
  onChangeSearch: (text: string) => void;
  onSubmitSearch?: () => void;
};

export const HomeNavbar: React.FC<HomeNavbarProps> = ({
  searchValue,
  onChangeSearch,
  onSubmitSearch,
}) => {
  const router = useRouter();
  const cartQuantity = useCartStore((state) => state.getTotalQuantity());
  const backgroundSync = useCartStore((state) => state.backgroundSync);

  useEffect(() => {
    backgroundSync();
  }, []);

  const handlePressCart = () => router.push("/(cart)/cart" as any);
  const handlePressFilter = () =>
    router.push("/(customer)/search-filter" as any);

  const handleSearchSubmit = () => {
    if (onSubmitSearch) {
      onSubmitSearch();
    }
  };

  return (
    <Box bg="#7c3aed" pb={4} px={4} pt={10}>
      {/* ส่วนบน: ตะกร้าสินค้า */}
      <HStack justifyContent="flex-end" alignItems="center" mb={2}>
        <IconWithBadge
          count={cartQuantity}
          icon={<Ionicons name="cart-outline" size={25} color="#fff" />}
          onPress={handlePressCart}
          containerStyle={{
            backgroundColor: "transparent",
            width: 40,
            height: 35,
          }}
        />
      </HStack>

      {/* ส่วนค้นหา */}
      <HStack space={2} alignItems="center">
        <View style={styles.searchSection}>
          <TextInput
            style={styles.input}
            placeholder="ค้นหาเสื้อผ้า"
            placeholderTextColor="#999"
            value={searchValue}
            onChangeText={onChangeSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity
            onPress={handleSearchSubmit}
            style={styles.searchIconButton}
            activeOpacity={0.6}
          >
            <Ionicons name="search-outline" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* ปุ่ม Filter */}
        {/* <TouchableOpacity
          onPress={handlePressFilter}
          style={styles.filterButton}
        >
          <Ionicons name="options-outline" size={24} color="#7c3aed" />
        </TouchableOpacity> */}
      </HStack>
    </Box>
  );
};

const styles = StyleSheet.create({
  searchSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 99,
    height: 45,
    paddingHorizontal: 10,
  },
  searchIconButton: {
    padding: 5,
    marginRight: 0,
    marginLeft: 3,
  },
  input: {
    flex: 1,
    height: "90%",
    color: "#000",
    fontSize: 13,
    paddingVertical: 0,
    paddingLeft: 10,
  },
  filterButton: {
    backgroundColor: "#fff",
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
  },
});

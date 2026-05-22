// app/(home)/search.tsx
import { searchProducts, SearchProduct, SearchParams } from "@/api/search";
import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Box,
  Center,
  HStack,
  Image,
  Pressable,
  Spinner,
  StatusBar,
  Text,
  VStack,
} from "native-base";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from "react-native";

const COLS = 2;
const GAP = 10;
const HORIZONTAL_PADDING = 16;
const screenWidth = Dimensions.get("window").width;
const cardWidth = (screenWidth - HORIZONTAL_PADDING * 2 - GAP * (COLS - 1)) / COLS;
const PAGE_SIZE = 20;

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category_id?: string }>();

  const [searchText, setSearchText] = useState(params.q || "");
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const offsetRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── โหลดครั้งแรก ───
  useEffect(() => {
    doSearch(true);
  }, []);

  // ─── Debounce search (สำหรับพิมพ์) ───
  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      doSearch(true);
    }, 500);
  };

  // ─── ค้นหา ───
  const doSearch = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }

      const result = await searchProducts({
        query: searchText.trim() || undefined,
        limit: PAGE_SIZE,
        offset: offsetRef.current,
      });

      if (reset) {
        setProducts(result.products);
      } else {
        setProducts((prev) => [...prev, ...result.products]);
      }

      setTotal(result.total);
      setHasMore(result.has_more);
      offsetRef.current += result.products.length;
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // ─── ฟังก์ชันสำหรับกดปุ่มค้นหา ───
  const handleSearchSubmit = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    doSearch(true);
  };

  // ─── Infinite scroll ───
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      doSearch(false);
    }
  }, [loadingMore, hasMore, searchText]);

  // ─── Pull to refresh ───
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    doSearch(true);
  }, [searchText]);

  const getImageUri = (item: SearchProduct) => {
    if (item.image_url) return item.image_url;
    if (item.image_id) return `${DOMAIN}/images/${item.image_id}`;
    return "https://via.placeholder.com/200";
  };

  // ─── Product Card ───
  const renderProduct = ({ item }: { item: SearchProduct }) => (
    <Pressable
      onPress={() => router.push(`/(home)/product-detail?id=${item.id}`)}
      style={{ width: cardWidth, marginBottom: GAP }}
    >
      <Box bg="white" rounded="lg" overflow="hidden" shadow={1}>
        <Image
          source={{ uri: getImageUri(item) }}
          alt={item.title}
          w="100%"
          h={cardWidth * 1.2}
          bg="gray.100"
          resizeMode="cover"
        />
        <VStack p={2} space={1}>
          <Text fontSize="xs" color="gray.800" numberOfLines={2} fontWeight="medium">
            {item.title}
          </Text>
          {item.store_name ? (
            <Text fontSize="2xs" color="gray.400" numberOfLines={1}>
              {item.store_name}
            </Text>
          ) : null}
          <HStack alignItems="center" justifyContent="space-between">
            <Text fontSize="sm" fontWeight="bold" color="violet.600">
              ฿{item.price.toLocaleString()}
            </Text>
            {item.rating > 0 ? (
              <HStack alignItems="center" space={0.5}>
                <Ionicons name="star" size={10} color="#f59e0b" />
                <Text fontSize="2xs" color="gray.500">
                  {item.rating.toFixed(1)}
                </Text>
              </HStack>
            ) : null}
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );

  // ─── Footer loader ───
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <Center py={4}>
        <ActivityIndicator size="small" color="#7c3aed" />
      </Center>
    );
  };

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      {/* Search Header */}
      <Box bg="violet.600" px={4} pb={3}>
        <HStack alignItems="center" space={3}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Box flex={1} bg="white" rounded="full" px={4} py={2}>
            <HStack alignItems="center" space={2}>
              {/* ทำให้ไอคอนค้นหากดได้ */}
              <TouchableOpacity 
                onPress={handleSearchSubmit}
                activeOpacity={0.6}
              >
                <Ionicons name="search" size={18} color="#9ca3af" />
              </TouchableOpacity>
              
              <TextInput
                placeholder="ค้นหาสินค้า..."
                value={searchText}
                onChangeText={handleSearchChange}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoFocus={!params.q}
                style={{ flex: 1, fontSize: 14, padding: 0 }}
              />
              
              {searchText ? (
                <Pressable
                  onPress={() => {
                    setSearchText("");
                    setTimeout(() => doSearch(true), 100);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </Pressable>
              ) : null}
            </HStack>
          </Box>
        </HStack>
      </Box>

      {/* แสดงจำนวนผลลัพธ์ */}
      {!loading && (
        <Box bg="white" px={4} py={2} borderBottomWidth={1} borderBottomColor="coolGray.200">
          <Text fontSize="sm" color="gray.600">
            {total > 0 ? `พบ ${total} รายการ` : 'ไม่พบสินค้า'}
          </Text>
        </Box>
      )}

      {/* Content */}
      {loading ? (
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
        </Center>
      ) : products.length === 0 ? (
        <Center flex={1}>
          <Ionicons name="search-outline" size={64} color="#d1d5db" />
          <Text mt={4} color="gray.500" fontSize="md">
            ไม่พบสินค้า
          </Text>
          {searchText ? (
            <Text fontSize="sm" color="gray.400" mt={1}>
              ลองค้นหาด้วยคำอื่น
            </Text>
          ) : null}
        </Center>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={COLS}
          columnWrapperStyle={{
            justifyContent: "space-between",
            paddingHorizontal: HORIZONTAL_PADDING,
          }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#7c3aed"]} />
          }
        />
      )}
    </Box>
  );
}
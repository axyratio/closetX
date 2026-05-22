// app/index.tsx
import {
  fetchHomeData,
  fetchHomeProducts,
  HomeBanner,
  HomeCategory,
  HomeProduct,
} from "@/api/home";
import { HomeBannerSlider } from "@/components/banner";
import { HomeCategoryList } from "@/components/category/category-list";
import { HomeNavbar } from "@/components/navbar";
import ProductCard from "@/components/product/card";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { DOMAIN } from "@/้host";
import { useRouter } from "expo-router";
import { Box, Spinner } from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchFn = useCallback(
    (skip: number, limit: number) => fetchHomeProducts(skip, limit),
    [],
  );

  const {
    data: products,
    loadingMore,
    refreshing,
    load,
    loadMore,
    refresh,
  } = usePaginatedList<HomeProduct>(fetchFn, 10);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await fetchHomeData();
        setBanners(data.banners);
        setCategories(data.categories);
        await load();
      } catch (e) {
        console.log("Home load error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSubmitSearch = () => {
    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      router.push({
        pathname: "/(home)/search",
        params: { q: trimmedSearch },
      } as any);
    } else {
      router.push("/(home)/search" as any);
    }
  };

  if (loading) {
    return (
      <Box flex={1} bg="#f7f4ff">
        <HomeNavbar
          searchValue={search}
          onChangeSearch={setSearch}
          onSubmitSearch={handleSubmitSearch}
        />
        <Box flex={1} alignItems="center" justifyContent="center">
          <Spinner color="#7c3aed" />
        </Box>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="#f7f4ff">
      <HomeNavbar
        searchValue={search}
        onChangeSearch={setSearch}
        onSubmitSearch={handleSubmitSearch}
      />
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: 16,
          marginTop: 16,
        }}
        renderItem={({ item }) => {
          const imageUrl = item.imageId
            ? `${DOMAIN}/images/stream/${item.imageId}`
            : item.imageUrl;
          return (
            <ProductCard
              productId={item.id}
              title={item.title}
              price={item.price}
              star={item.rating}
              imageUrl={imageUrl}
              route={`/(home)/product-detail?productId=${encodeURIComponent(item.id)}`}
            />
          );
        }}
        ListHeaderComponent={
          <View>
            <HomeBannerSlider banners={banners} />
            <HomeCategoryList categories={categories} />
          </View>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              const data = await fetchHomeData();
              setBanners(data.banners);
              setCategories(data.categories);
              await refresh();
            }}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#7c3aed" style={{ marginVertical: 16 }} />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
    </Box>
  );
}

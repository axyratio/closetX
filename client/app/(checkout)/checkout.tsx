// components/checkout/CheckoutScreen.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Box,
  Button,
  Divider,
  HStack,
  Image,
  Radio,
  ScrollView,
  Spinner,
  Text,
  VStack,
} from "native-base";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal as RNModal } from "react-native";
import { WebView } from "react-native-webview";

import { CartItem } from "@/api/cart";
import { checkoutCart } from "@/api/checkout";
import { useAddressStore } from "@/components/address/address-store";
import { SelectedAddressCard } from "@/components/address/select-address-card";
import { useCartStore } from "@/components/cart/cart-memo";
import { AppBarNoCheck } from "@/components/navbar";

// ✅ เพิ่ม (สำหรับ cancel reservation)
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";

type StoreGroup = {
  storeId: string;
  storeName: string;
  items: CartItem[];
  storeTotal: number;
};

// ✅ เพิ่ม helper แปลงเวลา
const formatMMSS = (ms: number) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// ✅ เพิ่ม helper cancel reservation (best-effort)
async function cancelReservationOrders(orderIds: string[]) {
  if (!orderIds.length) return;

  try {
    const token = await getToken();
    await Promise.all(
      orderIds.map(async (orderId) => {
        const res = await fetch(`${DOMAIN}/api/v1/checkout/cancel/${orderId}`, {
          method: "POST",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.log("cancelReservationOrders error:", res.status, text);
        }
      }),
    );
  } catch (e) {
    console.log("cancelReservationOrders exception:", e);
  }
}

// ✅ helper คำนวณราคาต่อชิ้น
function getUnitPrice(item: CartItem): number {
  if (typeof item.price_at_addition === "number" && item.price_at_addition > 0)
    return item.price_at_addition;
  if (item.quantity > 0 && typeof item.subtotal === "number")
    return item.subtotal / item.quantity;
  return 0;
}

// ✅ เรียก backend preview API ดึงค่าส่งจริง
async function fetchShippingPreview(payload: any): Promise<{
  shipping_fees: Record<string, number>;
  items_total: number;
  shipping_total: number;
  grand_total: number;
} | null> {
  try {
    const token = await getToken();
    const res = await fetch(`${DOMAIN}/api/v1/checkout/preview`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch (e) {
    console.log("fetchShippingPreview error:", e);
    return null;
  }
}

export const CheckoutScreen: React.FC = () => {
  const router = useRouter();

  const {
    cartId: cartIdParam,
    productId,
    variantId,
    quantity,
    storeId,
    storeName,
    unitPrice,
    productName,
    variantName,
    image_url,
  } = useLocalSearchParams<{
    cartId?: string;
    productId?: string;
    variantId?: string;
    quantity?: string;
    storeId?: string;
    storeName?: string;
    unitPrice?: string;
    productName?: string;
    variantName?: string;
    image_url?: string;
  }>();

  const isDirect = !!(productId && variantId); // มี product + variant = โหมด DIRECT

  const qty = useMemo(() => {
    const q = Number(quantity);
    return Number.isFinite(q) && q > 0 ? q : 1;
  }, [quantity]);

  const { addresses, selected, loading, fetchAll } = useAddressStore();
  const { cartId, cartItems, selectedIds, getSelectedTotal } = useCartStore();

  const [paymentMethod, setPaymentMethod] =
    useState<"STRIPE_CARD">("STRIPE_CARD");
  const [loadingPay, setLoadingPay] = useState(false);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);

  // ✅ state/refs สำหรับ timer + cancel
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);

  const orderIdsRef = useRef<string[]>([]);
  const shouldCancelRef = useRef<boolean>(false);
  const timeoutFiredRef = useRef<boolean>(false);

  // ✅ state สำหรับ shipping preview จาก backend
  const [shippingPreview, setShippingPreview] = useState<{
    shipping_fees: Record<string, number>;
    items_total: number;
    shipping_total: number;
    grand_total: number;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  // ✅ effect timer: เปิดเมื่อมี stripeUrl และ expiresAtMs
  useEffect(() => {
    if (!stripeUrl || !expiresAtMs) return;

    timeoutFiredRef.current = false;

    const tick = () => {
      const ms = expiresAtMs - Date.now();
      setRemainingMs(ms);

      if (ms <= 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;

        (async () => {
          try {
            shouldCancelRef.current = false;
            await cancelReservationOrders(orderIdsRef.current);
            await useCartStore.getState().backgroundSync();
          } catch (e) {
            console.log("timeout cancel error:", e);
          } finally {
            setStripeUrl(null);
            setExpiresAtMs(null);
            setRemainingMs(0);
            router.replace("/(checkout)/payment_timeout" as any);
          }
        })();
      }
    };

    tick();
    const id = setInterval(tick, 500);

    return () => clearInterval(id);
  }, [stripeUrl, expiresAtMs]);

  // ─────────────────────────────
  // 1) สินค้าที่เลือกจาก CART
  // ─────────────────────────────
  const selectedItems = useMemo(
    () => cartItems.filter((i) => selectedIds.has(i.cart_item_id)),
    [cartItems, selectedIds],
  );

  // ─────────────────────────────
  // 2) directStoreGroup: ใช้ params สร้าง CartItem เดียว
  // ─────────────────────────────
  const directStoreGroup: StoreGroup | null = useMemo(() => {
    if (
      !isDirect ||
      !storeId ||
      !storeName ||
      !unitPrice ||
      !productId ||
      !variantId
    ) {
      return null;
    }

    const price = Number(unitPrice);
    if (!Number.isFinite(price)) return null;

    const directItem: CartItem = {
      cart_item_id: `direct-${variantId}`,
      product_id: productId,
      variant_id: variantId,
      quantity: qty,
      subtotal: price * qty,
      price_at_addition: price,
      product_name: productName ?? "สินค้า (ไม่ระบุชื่อ)",
      variant_name: variantName ?? undefined,
      image_url: image_url ?? undefined,

      store: {
        store_id: storeId,
        store_name: storeName,
      },
    } as any;

    return {
      storeId,
      storeName,
      items: [directItem],
      storeTotal: price * qty,
    };
  }, [
    isDirect,
    storeId,
    storeName,
    unitPrice,
    qty,
    productId,
    variantId,
    productName,
    variantName,
    image_url,
  ]);

  // ─────────────────────────────
  // 3) group ตามร้าน
  // ─────────────────────────────
  const groupedStores = useMemo<StoreGroup[]>(() => {
    if (isDirect) {
      return directStoreGroup ? [directStoreGroup] : [];
    }

    const map = new Map<string, StoreGroup>();

    selectedItems.forEach((item) => {
      const sid = item.store.store_id;
      const sname = item.store.store_name;
      const subtotal = item.subtotal;

      const existing = map.get(sid);
      if (existing) {
        existing.items.push(item);
        existing.storeTotal += subtotal;
      } else {
        map.set(sid, {
          storeId: sid,
          storeName: sname,
          items: [item],
          storeTotal: subtotal,
        });
      }
    });

    return Array.from(map.values());
  }, [isDirect, directStoreGroup, selectedItems]);

  // ─────────────────────────────
  // ✅ เรียก preview เมื่อ groupedStores + selected address พร้อม
  // ─────────────────────────────
  useEffect(() => {
    if (!selected || groupedStores.length === 0) return;

    const doPreview = async () => {
      setLoadingPreview(true);
      try {
        let payload: any;

        if (isDirect && variantId) {
          payload = {
            checkout_type: "DIRECT",
            items: [{ variant_id: variantId, quantity: qty }],
            shipping_address_id: selected.ship_addr_id,
          };
        } else {
          const effectiveCartId = cartIdParam ?? cartId ?? undefined;
          if (!effectiveCartId || !selectedItems.length) {
            setLoadingPreview(false);
            return;
          }
          payload = {
            checkout_type: "CART",
            cart_id: effectiveCartId,
            selected_cart_item_ids: selectedItems.map((i) => i.cart_item_id),
            shipping_address_id: selected.ship_addr_id,
          };
        }

        const preview = await fetchShippingPreview(payload);
        if (preview) {
          setShippingPreview(preview);
        }
      } catch (e) {
        console.log("preview error:", e);
      } finally {
        setLoadingPreview(false);
      }
    };

    doPreview();
  }, [selected, groupedStores.length]);

  // ─────────────────────────────
  // 4) คำนวณยอดรวม — ✅ ใช้ค่าจาก backend preview
  // ─────────────────────────────
  const itemsTotal = isDirect
    ? (directStoreGroup?.storeTotal ?? 0)
    : getSelectedTotal();

  const shippingTotal = shippingPreview?.shipping_total ?? 0;
  const grandTotal = shippingPreview?.grand_total ?? itemsTotal;

  const handleChangeAddress = () => {
    router.push("/(address)/address-selected" as any);
  };

  const canPay = isDirect
    ? !!(selected && directStoreGroup)
    : !!(selected && selectedItems.length);

  // ─────────────────────────────
  // 5) กดชำระเงิน
  // ─────────────────────────────
  const handlePay = async () => {
    if (!selected) {
      alert("กรุณาเลือกที่อยู่จัดส่ง");
      return;
    }

    // DIRECT MODE
    if (isDirect) {
      if (!productId || !variantId) {
        alert("ข้อมูลสินค้าสำหรับซื้อเลยไม่ครบ");
        return;
      }

      setLoadingPay(true);
      try {
        const payload = {
          checkout_type: "DIRECT" as const,
          items: [
            {
              variant_id: variantId as string,
              quantity: qty,
            },
          ],
          shipping_address_id: selected.ship_addr_id,
        };

        console.log("direct payload", payload);
        const res = await checkoutCart(payload);

        orderIdsRef.current = (res as any)?.order_ids?.map(String) ?? [];
        const exp = (res as any)?.expires_at
          ? new Date((res as any).expires_at).getTime()
          : null;

        shouldCancelRef.current = true;
        setStripeUrl(res.stripe_checkout_url);

        if (exp) {
          setExpiresAtMs(exp);
          setRemainingMs(exp - Date.now());
        } else {
          setExpiresAtMs(null);
          setRemainingMs(0);
        }

        console.log(res);
      } catch (e) {
        console.log("direct checkout error:", e);
        alert("สินค้าหมดแล้ว");
      } finally {
        setLoadingPay(false);
      }

      return;
    }

    // CART MODE
    if (!selectedItems.length) {
      alert("กรุณาเลือกสินค้าในตะกร้า");
      return;
    }

    setLoadingPay(true);
    try {
      const effectiveCartId = cartIdParam ?? cartId ?? undefined;

      if (!effectiveCartId) {
        alert("ไม่พบ cart_id");
        return;
      }

      const payload = {
        checkout_type: "CART" as const,
        cart_id: effectiveCartId,
        selected_cart_item_ids: selectedItems.map((i) => i.cart_item_id),
        shipping_address_id: selected.ship_addr_id,
      };

      console.log("payload", payload);

      const res = await checkoutCart(payload);

      orderIdsRef.current = (res as any)?.order_ids?.map(String) ?? [];
      const exp = (res as any)?.expires_at
        ? new Date((res as any).expires_at).getTime()
        : null;

      shouldCancelRef.current = true;
      setStripeUrl(res.stripe_checkout_url);

      if (exp) {
        setExpiresAtMs(exp);
        setRemainingMs(exp - Date.now());
      } else {
        setExpiresAtMs(null);
        setRemainingMs(0);
      }
    } catch (e) {
      console.log("cart checkout error:", e);
      alert("ไม่สามารถสร้างการชำระเงินได้");
    } finally {
      setLoadingPay(false);
    }
  };

  // ✅ closeStripe ให้ cancel reservation ถ้า user ออกเอง
  const closeStripe = async () => {
    if (shouldCancelRef.current) {
      shouldCancelRef.current = false;
      await cancelReservationOrders(orderIdsRef.current);
      await useCartStore.getState().backgroundSync();
    }

    setStripeUrl(null);
    setExpiresAtMs(null);
    setRemainingMs(0);
  };

  return (
    <Box flex={1} bg="coolGray.50">
      <AppBarNoCheck title="ทำการสั่งซื้อ" />

      <ScrollView
        flex={1}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      >
        {/* 1) ที่อยู่จัดส่งของผู้ใช้ */}
        <Box mt={3}>
          <SelectedAddressCard
            address={selected}
            loading={loading && !addresses.length}
            onPressChange={handleChangeAddress}
          />
        </Box>

        {/* ──────────────────────────────────────────
            2) สินค้าที่สั่ง — เขียนตรงๆ ไม่ใช้ Component ของ cart
               ไม่มี checkbox / ปุ่ม +- / แก้ไข / ทั้งร้าน
        ────────────────────────────────────────── */}
        <Box mt={4}>
          {groupedStores.map((g) => (
            <Box
              key={g.storeId}
              mb={3}
              borderRadius="md"
              overflow="hidden"
              bg="white"
              shadow={1}
            >
              {/* header ร้าน — แค่ชื่อร้าน */}
              <HStack
                px={3}
                py={2.5}
                alignItems="center"
                borderBottomWidth={1}
                borderColor="coolGray.100"
              >
                <Ionicons name="storefront-outline" size={16} color="#6D28D9" />
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color="coolGray.800"
                  ml={2}
                >
                  {g.storeName}
                </Text>
              </HStack>

              {/* รายการสินค้า */}
              {g.items.map((item) => {
                const price = getUnitPrice(item);
                const subtotal =
                  typeof item.subtotal === "number" && item.subtotal > 0
                    ? item.subtotal
                    : price * item.quantity;
                const img = item.image_url || "";

                return (
                  <Box
                    key={item.cart_item_id}
                    px={3}
                    py={3}
                    borderBottomWidth={1}
                    borderColor="coolGray.50"
                  >
                    <HStack space={3} alignItems="flex-start">
                      {/* รูปสินค้า */}
                      <Box
                        width="64px"
                        height="64px"
                        bg="coolGray.100"
                        borderRadius={6}
                        alignItems="center"
                        justifyContent="center"
                        overflow="hidden"
                      >
                        {img.trim() !== "" ? (
                          <Image
                            source={{ uri: img }}
                            alt={item.product_name || "สินค้า"}
                            width="64px"
                            height="64px"
                            resizeMode="cover"
                          />
                        ) : (
                          <Text
                            fontSize="8px"
                            color="gray.500"
                            textAlign="center"
                          >
                            ไม่มีรูปภาพ
                          </Text>
                        )}
                      </Box>

                      {/* รายละเอียดสินค้า */}
                      <VStack flex={1} space={1}>
                        <Text
                          numberOfLines={2}
                          fontSize="sm"
                          fontWeight="medium"
                          color="coolGray.800"
                        >
                          {item.product_name || "สินค้า"}
                        </Text>

                        {item.variant_name ? (
                          <Text fontSize="xs" color="violet.600">
                            ตัวเลือก: {item.variant_name}
                          </Text>
                        ) : null}

                        <HStack
                          mt={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Text
                            fontSize="sm"
                            color="violet.600"
                            fontWeight="bold"
                          >
                            ฿{price.toFixed(2)}
                          </Text>

                          <Text fontSize="xs" color="coolGray.500">
                            x{item.quantity}
                          </Text>
                        </HStack>

                        {item.quantity > 1 && (
                          <Text
                            fontSize="xs"
                            color="coolGray.600"
                            textAlign="right"
                          >
                            รวม ฿{subtotal.toFixed(2)}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </Box>
                );
              })}

              {/* ✅ ค่าจัดส่งของร้านนี้ (จาก backend preview) */}
              <HStack
                px={3}
                py={2}
                justifyContent="space-between"
                alignItems="center"
                bg="coolGray.50"
              >
                <HStack space={1} alignItems="center">
                  <Ionicons name="car-outline" size={14} color="#6B7280" />
                  <Text fontSize="xs" color="coolGray.600">
                    ค่าจัดส่ง
                  </Text>
                  {loadingPreview && <Spinner size="sm" color="violet.400" />}
                </HStack>
                <Text fontSize="xs" fontWeight="semibold" color="coolGray.800">
                  {shippingPreview?.shipping_fees[g.storeId] != null
                    ? `฿${shippingPreview.shipping_fees[g.storeId].toFixed(2)}`
                    : loadingPreview
                      ? "กำลังคำนวณ..."
                      : "—"}
                </Text>
              </HStack>
            </Box>
          ))}
        </Box>

        {/* 3) วิธีชำระเงิน (radio จ่ายด้วยบัตรเครดิต) */}
        <Box mt={2} bg="white" borderRadius="md" p={3} shadow={1}>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            วิธีการชำระเงิน
          </Text>

          <Radio.Group
            name="paymentMethod"
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val as "STRIPE_CARD")}
          >
            <Radio
              value="STRIPE_CARD"
              colorScheme="violet"
              _icon={{ color: "white" }}
              _checked={{
                borderColor: "violet.600",
                bg: "violet.600",
              }}
              _pressed={{
                borderColor: "violet.700",
                bg: "violet.700",
              }}
            >
              <Text fontSize="sm" ml={2}>
                ชำระด้วยบัตรเครดิต / เดบิต
              </Text>
            </Radio>
          </Radio.Group>
        </Box>

        {/* 4) ข้อมูลการชำระเงิน — ✅ แสดงค่าส่งแยกต่อร้าน */}
        <Box mt={4} bg="white" borderRadius="md" p={3} shadow={1}>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            ข้อมูลการชำระเงิน
          </Text>

          {groupedStores.map((g) => (
            <HStack key={g.storeId} justifyContent="space-between" mb={1}>
              <Text fontSize="xs" color="coolGray.700">
                {g.storeName}
              </Text>
              <Text fontSize="xs" color="coolGray.800">
                ฿{g.storeTotal.toFixed(2)}
              </Text>
            </HStack>
          ))}

          <Divider my={2} />

          <HStack justifyContent="space-between" mb={1}>
            <Text fontSize="xs" color="coolGray.700">
              รวมการสั่งซื้อ
            </Text>
            <Text fontSize="xs" color="coolGray.800">
              ฿{itemsTotal.toFixed(2)}
            </Text>
          </HStack>

          {/* ✅ ค่าส่งแยกต่อร้าน */}
          {groupedStores.map((g) => (
            <HStack
              key={`ship-${g.storeId}`}
              justifyContent="space-between"
              mb={1}
            >
              <Text fontSize="xs" color="coolGray.500">
                ค่าจัดส่ง ({g.storeName})
              </Text>
              <Text fontSize="xs" color="coolGray.600">
                {shippingPreview?.shipping_fees[g.storeId] != null
                  ? `฿${shippingPreview.shipping_fees[g.storeId].toFixed(2)}`
                  : "—"}
              </Text>
            </HStack>
          ))}

          <HStack justifyContent="space-between" mb={1}>
            <Text fontSize="xs" color="coolGray.700">
              รวมค่าจัดส่ง
            </Text>
            <Text fontSize="xs" color="coolGray.800">
              ฿{shippingTotal.toFixed(2)}
            </Text>
          </HStack>

          <Divider my={2} />

          <HStack justifyContent="space-between">
            <Text fontSize="sm" fontWeight="semibold">
              ยอดชำระเงินทั้งหมด
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="violet.700">
              ฿{grandTotal.toFixed(2)}
            </Text>
          </HStack>
        </Box>
      </ScrollView>

      {/* 5) ปุ่มชำระสินค้าลอยข้างล่าง */}
      <Box
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        bg="white"
        borderTopWidth={1}
        borderColor="coolGray.200"
        px={4}
        py={3}
      >
        <HStack justifyContent="space-between" alignItems="center">
          <VStack>
            <Text fontSize="xs" color="coolGray.600">
              รวมยอดสั่งซื้อ
            </Text>
            <Text fontSize="md" fontWeight="semibold" color="violet.700">
              ฿{grandTotal.toFixed(2)}
            </Text>
          </VStack>

          <Button
            borderRadius="full"
            px={10}
            onPress={handlePay}
            isLoading={loadingPay}
            isDisabled={!canPay}
          >
            ชำระเงิน
          </Button>
        </HStack>
      </Box>

      {/* Modal + WebView สำหรับ Stripe Checkout */}
      <RNModal
        visible={!!stripeUrl}
        animationType="slide"
        onRequestClose={closeStripe}
      >
        <Box flex={1} bg="white">
          {/* แถบ timer */}
          <Box px={4} py={2} borderBottomWidth={1} borderColor="coolGray.200">
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="xs" color="coolGray.600">
                เวลาที่เหลือ
              </Text>
              <Text
                fontSize="sm"
                fontWeight="semibold"
                color={remainingMs <= 10_000 ? "red.600" : "coolGray.800"}
              >
                {expiresAtMs ? formatMMSS(remainingMs) : "--:--"}
              </Text>
              <Button size="sm" variant="ghost" onPress={closeStripe}>
                ออก
              </Button>
            </HStack>
          </Box>

          <AppBarNoCheck title="ชำระด้วยบัตร" onBackPress={closeStripe} />

          {stripeUrl ? (
            <WebView
              source={{ uri: stripeUrl }}
              onMessage={(event) => {
                const msg = event.nativeEvent.data;
                if (msg === "GO_HOME") {
                  closeStripe();
                  router.replace("/(tabs)");
                }
              }}
              onNavigationStateChange={(nav) => {
                const url = nav?.url || "";
                if (!url) return;

                // ถ้าสำเร็จ → ไม่ cancel
                if (url.includes("/payment/success")) {
                  shouldCancelRef.current = false;
                  const orderIds = orderIdsRef.current.join(",");
                  const paymentId = "";
                  setStripeUrl(null);
                  setExpiresAtMs(null);
                  setRemainingMs(0);
                  useCartStore.getState().backgroundSync();
                  router.replace({
                    pathname: "(checkout)/payment_success",
                    params: { order_ids: orderIds, payment_id: paymentId },
                  } as any);
                }

                // ถ้า cancel ใน Stripe
                if (url.includes("/payment/cancel")) {
                  (async () => {
                    try {
                      shouldCancelRef.current = false;

                      const sessionIdMatch = url.match(/session_id=([^&]+)/);
                      const sessionId = sessionIdMatch?.[1];

                      let declineCode: string | null = null;

                      if (sessionId) {
                        try {
                          const token = await getToken();
                          const res = await fetch(
                            `${DOMAIN}/api/payment/status-by-session/${sessionId}`,
                            { headers: { Authorization: `Bearer ${token}` } },
                          );
                          const json = await res.json();
                          if (json.status === "FAILED" || json.decline_code) {
                            declineCode =
                              json.decline_code || "generic_decline";
                          }
                        } catch (e) {
                          console.log("check payment status error:", e);
                        }
                      }

                      await cancelReservationOrders(orderIdsRef.current);
                      await useCartStore.getState().backgroundSync();

                      setStripeUrl(null);
                      setExpiresAtMs(null);
                      setRemainingMs(0);

                      if (declineCode) {
                        router.replace({
                          pathname: "/(checkout)/payment_failed",
                          params: { decline_code: declineCode },
                        } as any);
                      } else {
                        router.replace("/(checkout)/payment_timeout" as any);
                      }
                    } catch (e) {
                      setStripeUrl(null);
                      setExpiresAtMs(null);
                      setRemainingMs(0);
                      router.replace("/(checkout)/payment_timeout" as any);
                    }
                  })();
                }
              }}
            />
          ) : null}
        </Box>
      </RNModal>
    </Box>
  );
};

export default CheckoutScreen;

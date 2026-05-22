import { Ionicons } from "@expo/vector-icons";
import { RelativePathString, useRouter } from "expo-router";
import { Box, Center, HStack, Pressable, Text, VStack } from "native-base";
import React, { useState } from "react";
import { Image, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

type ProfileValue = {
  value: string;
  title: string;
  onChange?: (text: string) => void; // callback ส่งค่าไป parent
  error?: string;
  navigateTo?: RelativePathString; // optional: path ของหน้าที่ต้องการไป
};

export const FormProfile = ({ value, title, onChange, error, navigateTo }: ProfileValue) => {
  const [profileValue, setProfileValue] = useState(value);
  const router = useRouter();

  return (
    <VStack space={4} alignItems="center">
      <Center
        w="100%"
        bg="white"
        p={3}
        justifyContent="flex-start"
        alignItems="flex-start"
        borderRadius={0}
      >

        <Box style={{ width: "100%", gap: 8 }} >
          <Text fontWeight="normal">{title}</Text>
          <Pressable onPress={() => navigateTo && router.push(navigateTo)} style={{ width: "100%" }}>
            <Box borderWidth={1} borderColor="gray.300" borderRadius={4} >
              <TextInput
                placeholder={title}
                value={profileValue}
                onChangeText={(text) => {
                  setProfileValue(text);
                  onChange?.(text);
                }}
                style={{ width: "100%", opacity: 0.9 }}
              />
            </Box>
          </Pressable>
        </Box>


        {error && <Text fontSize={12} color="red.500">{error}</Text>}
      </Center>
    </VStack>
  );
};
import { Box, HStack, Text } from "native-base";
import React from "react";
import {
    TextInput
} from "react-native";

type StoreFormType = {
  value: string;
  title: string;
  error?: string;
  onChange: (text: string) => void;
  mark?: boolean; // true = จำเป็นต้องกรอก
};

export const StoreForm = ({
  value,
  title,
  error,
  onChange,
  mark = false,
}: StoreFormType) => {
  return (
    <Box w="100%" mb={4}>
      <HStack alignItems="center" mb={1}>
        <Text fontSize="md" fontWeight="medium">
          {title}
        </Text>
        {mark && (
          <Text color="red.500" ml={1}>
            *
          </Text>
        )}
      </HStack>

      <TextInput
        value={value}
        placeholder={title}
        onChangeText={onChange}
        // borderColor={error ? "red.500" : "gray.300"}
        // _focus={{ borderColor: "primary.500", bg: "white" }}
      />

      {error && (
        <Text color="red.500" fontSize="xs" mt={1}>
          {error}
        </Text>
      )}
    </Box>
  );
};

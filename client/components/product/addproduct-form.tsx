import { MaterialIcons } from "@expo/vector-icons";
import { RelativePathString, useRouter } from "expo-router";
import { HStack, Icon, Text } from "native-base";
import React, { useRef } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";

type UnifiedRowProps =
  | {
      type: "select";
      title: string;
      description: string;
      required?: boolean;
      route: string;
      navigationMethod?: "push" | "replace";
    }
  | {
      type: "number";
      title: string;
      value: string;
      onChangeText: (text: string) => void;
      required?: boolean;
    };

export function UnifiedRow(props: UnifiedRowProps) {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    if (props.type === "select") {
      if (props.navigationMethod === "push") {
        router.push(props.route as RelativePathString);
      } else {
        router.replace(props.route as RelativePathString);
      }
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <Pressable onPress={handlePress}>
      <HStack style={styles.row}>
        {/* LEFT SIDE */}
        <HStack style={styles.left}>
          <Text style={styles.title}>{props.title}</Text>
          {props.required && <Text style={styles.required}>*</Text>}
        </HStack>

        {/* RIGHT SIDE */}
        {props.type === "select" ? (
          <HStack alignItems="center" space={2}>
            <Text style={styles.desc}>{props.description}</Text>
            <Icon as={MaterialIcons} name="keyboard-arrow-right" size={5} color="#555" />
          </HStack>
        ) : (
          <TextInput
            ref={inputRef}
            value={props.value}
            onChangeText={props.onChangeText}
            keyboardType="numeric"
            style={styles.input}
            placeholder="0"
          />
        )}
      </HStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "white",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    fontSize: 16,
    color: "#000",
  },

  required: {
    fontSize: 16,
    color: "red",
    marginLeft: 4,
  },

  desc: {
    fontSize: 14,
    color: "#666",
  },

  input: {
    width: 130,
    textAlign: "right",
    fontSize: 16,
    padding: 0,
    margin: 0,
    color: "#000",
  },
});

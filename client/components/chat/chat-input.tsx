// components/chat/chat-input.tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onSendImage: (imageUri: string) => void;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  onSendImage,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handlePickImage = async () => {
    if (disabled) return;

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photos");
      return;
    }

    // ✅ Pick image - ไม่ crop, ไม่ลด quality (เก็บขนาดต้นฉบับ)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // ✅ ไม่ให้ crop
      quality: 0.7, // ✅ คุณภาพสูงสุด (1 = 100%)
    });

    if (!result.canceled && result.assets[0]) {
      onSendImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    if (disabled) return;

    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your camera");
      return;
    }

    // ✅ Take photo - ไม่ crop, ไม่ลด quality
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false, // ✅ ไม่ให้ crop
      quality: 0.7, // ✅ คุณภาพสูงสุด
    });

    if (!result.canceled && result.assets[0]) {
      onSendImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === "web") {
      handlePickImage();
    } else {
      Alert.alert("เลือกรูปภาพ", "คุณต้องการเลือกรูปจากที่ไหน?", [
        { text: "ถ่ายรูป", onPress: handleTakePhoto },
        { text: "เลือกจากแกลเลอรี", onPress: handlePickImage },
        { text: "ยกเลิก", style: "cancel" },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={showImageOptions}
        disabled={disabled}
      >
        <Ionicons
          name="image-outline"
          size={24}
          color={disabled ? "#ccc" : "#8b5cf6"}
        />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="พิมพ์ข้อความ..."
        placeholderTextColor="#999"
        multiline
        maxLength={1000}
        editable={!disabled}
        onSubmitEditing={handleSend}
      />

      <TouchableOpacity
        style={[
          styles.sendButton,
          (!message.trim() || disabled) && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={!message.trim() || disabled}
      >
        <Ionicons
          name="send"
          size={20}
          color={!message.trim() || disabled ? "#ccc" : "#fff"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#f0f0f0",
  },
});

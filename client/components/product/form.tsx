import { Ionicons } from "@expo/vector-icons";
import { Text } from "native-base";
import React from "react";
import {
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type AddProductFormProps = {
  type?: "text" | "textarea" | "image";
  label?: string;
  required?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  height?: number; // ใช้ตอน textarea
  onImagePick?: () => void;
  imageUri?: string | null;
};

export const AddProductForm = ({
  type = "text",
  label = "",
  required = false,
  value,
  onChangeText,
  placeholder,
  maxLength,
  height = 50,
  onImagePick,
  imageUri,
}: AddProductFormProps) => {
  return (
    <View style={styles.container}>
      {/* Label */}
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: "red" }}> *</Text>}
        </Text>
      )}

      {/* IMAGE FIELD */}
      {type === "image" && (
        <TouchableOpacity style={styles.imageBox} onPress={onImagePick}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="add" size={26} color="#a855f7" />
              <Text style={styles.imageText}>เพิ่มรูปสินค้า</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* TEXT FIELD */}
      {type === "text" && (
        <>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            maxLength={maxLength}
          />
          {maxLength && (
            <Text style={styles.counter}>
              {value?.length ?? 0}/{maxLength}
            </Text>
          )}
        </>
      )}

      {/* TEXTAREA FIELD */}
      {type === "textarea" && (
        <>
          <TextInput
            style={[styles.textarea, { height }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            maxLength={maxLength}
            multiline
            textAlignVertical="top"
          />
          {maxLength && (
            <Text style={styles.counter}>
              {value?.length ?? 0}/{maxLength}
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: "#4b5563",
    fontWeight: "500",
  },

  // IMAGE
  imageBox: {
    width: 110,
    height: 110,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#a855f7",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageText: {
    marginTop: 6,
    color: "#a855f7",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },

  // input
  textInput: {
    borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 6,
    fontSize: 15,
  },

  // textarea
  textarea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },

  counter: {
    textAlign: "right",
    color: "#9ca3af",
    marginTop: 3,
    fontSize: 12,
  },
});

type ImageFormProps = {
  label?: string;
  required?: boolean;
  images: string[];
  onAddImage: () => void; // เลือกหลายรูปได้
  onRemoveImage: (index: number) => void;
  onCropImage?: (uri: string, index: number) => void; // <— ใหม่
  max?: number;
};

export const FormImagesField = ({
  label,
  required = false,
  images,
  onAddImage,
  onRemoveImage,
  onCropImage,
  max = 5,
}: ImageFormProps) => {
  return (
    <View style={imageFormStyle.container}>
      {/* Label */}
      {label && (
        <Text style={imageFormStyle.label}>
          {label}
          {required && <Text style={{ color: "red" }}> *</Text>}
        </Text>
      )}

      <View style={imageFormStyle.gridContainer}>
        {/* แสดงรูปทั้งหมด */}
        {images.map((uri, index) => (
          <View key={index} style={imageFormStyle.imageWrapper}>
            {/* กดรูปเพื่อ crop */}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => onCropImage && onCropImage(uri, index)}
              activeOpacity={0.8}
            >
              <Image source={{ uri }} style={imageFormStyle.image} />
            </TouchableOpacity>

            {/* ปุ่มลบ */}
            <TouchableOpacity
              style={imageFormStyle.removeBtn}
              onPress={() => onRemoveImage(index)}
            >
              <Ionicons name="close-circle" size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        {/* ปุ่มเพิ่มรูป */}
        {images.length < max && (
          <TouchableOpacity style={imageFormStyle.addBox} onPress={onAddImage}>
            <Ionicons name="add" size={30} color="#a855f7" />
            <Text style={imageFormStyle.addText}>เพิ่มรูป</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const imageFormStyle = StyleSheet.create({
  container: { marginBottom: 20 },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
    color: "#4b5563",
  },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  addBox: {
    width: 100,
    height: 100,
    borderWidth: 1.5,
    borderRadius: 10,
    borderColor: "#a855f7",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  addText: {
    marginTop: 4,
    color: "#a855f7",
    fontSize: 13,
  },

  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 10,
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "white",
    borderRadius: 20,
  },
});

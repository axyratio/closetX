import React from "react";
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";

type Props = {
  uri: string;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
};

export default function PreviewModal({
  uri,
  visible,
  onClose,
  onEdit,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />

        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.text}>ปิด</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.editBtn]} onPress={onEdit}>
            <Text style={styles.text}>แก้ไข (Crop)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "80%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  btn: {
    padding: 12,
    backgroundColor: "#444",
    borderRadius: 10,
  },
  editBtn: {
    backgroundColor: "#ff3366",
  },
  text: {
    color: "#fff",
    fontSize: 16,
  },
});

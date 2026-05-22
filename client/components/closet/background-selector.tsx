import type { VTONBackground } from '@/api/closet';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Box, Pressable, Text } from 'native-base';
import React from 'react';
import { Image, ScrollView, Alert } from 'react-native';

interface BackgroundSelectorProps {
  backgrounds: VTONBackground[];
  selectedBackground: VTONBackground | null;
  onSelectBackground: (background: VTONBackground | null) => void;
  onAddBackground: (uri: string) => void;
  onDeleteBackground: (backgroundId: string) => void;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
  backgrounds,
  selectedBackground,
  onSelectBackground,
  onAddBackground,
  onDeleteBackground,
}) => {
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      // aspect: [3, 4], // ✅ ปรับสัดส่วนตอนเลือกรูปเป็น 3:4
      quality: 0.7
    });

    if (!result.canceled && result.assets[0]) {
      onAddBackground(result.assets[0].uri);
    }
  };

  const handleDelete = (bg: VTONBackground) => {
    Alert.alert('ยืนยันการลบ', 'คุณต้องการลบพื้นหลังนี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: () => onDeleteBackground(bg.background_id) },
    ]);
  };

  return (
    <Box flex={1}>
      <Text fontSize="sm" color="gray.600" mb={4}>พื้นหลัง</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Box flexDirection="row" flexWrap="wrap" mx="-1%">
          {/* Add Background Button */}
          <Pressable
            onPress={handlePickImage}
            width="31.3%"
            style={{ aspectRatio: 3 / 4 }} // ✅ ปรับเป็น 3:4 ให้เท่า Model
            bg="white"
            borderWidth={2}
            borderColor="gray.300"
            borderStyle="dashed"
            borderRadius="lg"
            justifyContent="center"
            alignItems="center"
            m="1%"
            mb={3}
          >
            <Ionicons name="add" size={32} color="#9CA3AF" />
          </Pressable>

          {/* Background Options */}
          {backgrounds.map((bg) => (
            <Box key={bg.background_id} width="31.3%" m="1%" mb={3} position="relative">
              <Pressable
                onPress={() => onSelectBackground(selectedBackground?.background_id === bg.background_id ? null : bg)}
                width="100%"
                style={{ aspectRatio: 3 / 4 }} // ✅ ปรับเป็น 3:4 ให้เท่า Model
                borderRadius="lg"
                overflow="hidden"
                borderWidth={2}
                borderColor={selectedBackground?.background_id === bg.background_id ? 'violet.600' : 'transparent'}
              >
                <Image
                  source={{ uri: bg.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </Pressable>

              <Pressable
                onPress={() => handleDelete(bg)}
                position="absolute"
                top={1}
                right={1}
                bg="red.500"
                borderRadius="full"
                p={1}
                zIndex={10}
              >
                <Ionicons name="close" size={12} color="white" />
              </Pressable>
            </Box>
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
};
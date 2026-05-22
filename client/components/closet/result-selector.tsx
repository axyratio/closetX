import type { VTONSession } from '@/api/closet';
import { Ionicons } from '@expo/vector-icons';
import { Box, Button, Center, Modal, Pressable, Text } from 'native-base';
import React, { useState } from 'react';
import { Alert, Image, ScrollView } from 'react-native';

interface ResultSelectorProps {
  sessions: VTONSession[];
  onStartTryOn?: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export const ResultSelector: React.FC<ResultSelectorProps> = ({
  sessions,
  onStartTryOn,
  onDeleteSession,
}) => {
  const [selectedSession, setSelectedSession] = useState<VTONSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImagePress = (session: VTONSession) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  const handleDelete = (session: VTONSession) => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบรูปผลลัพธ์นี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => {
            onDeleteSession?.(session.session_id);
          },
        },
      ]
    );
  };

  return (
    <Box flex={1}>
      <Text fontSize="md" fontWeight="bold" mb={4} color="gray.700">
        ประวัติการลองชุด ({sessions.length})
      </Text>

      {sessions.length === 0 ? (
        <Center flex={1}>
          <Ionicons name="images-outline" size={64} color="#D1D5DB" />
          <Text color="gray.400" mt={4} fontSize="md">
            ยังไม่มีประวัติการลองชุด
          </Text>
          <Text color="gray.400" fontSize="sm" mt={2} textAlign="center" px={8}>
            เริ่มต้นโดยเลือกโมเดลและชุดที่คุณต้องการ
          </Text>
          {onStartTryOn && (
            <Button mt={6} bg="violet.600" onPress={onStartTryOn}>
              เริ่มลองชุด
            </Button>
          )}
        </Center>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Box flexDirection="row" flexWrap="wrap" mx="-1%">
            {sessions.map((session) => (
              <Box
                key={session.session_id}
                width="31.3%"
                m="1%"
                mb={3}
                position="relative"
              >
                <Pressable onPress={() => handleImagePress(session)}>
                  <Box borderRadius="xl" overflow="hidden" bg="white" shadow={2}>
                    <Image
                      source={{ uri: session.result_image_url }}
                      style={{ width: "100%", aspectRatio: 3 / 4 }}
                      resizeMode="cover"
                    />
                    <Box p={2} bg="white">
                      <Text fontSize="2xs" color="gray.500" numberOfLines={1}>
                        {new Date(session.generated_at).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                    </Box>
                  </Box>
                </Pressable>

                {/* ✅ ปุ่มลบ */}
                <Pressable
                  onPress={() => handleDelete(session)}
                  position="absolute"
                  top={-5}
                  right={-5}
                  bg="white"
                  borderRadius="full"
                  p={1}
                  zIndex={10}
                  shadow={2}
                  _pressed={{ bg: 'gray.100' }}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </Pressable>
              </Box>
            ))}
          </Box>

          <Box height={20} />
        </ScrollView>
      )}

      {/* ✅ Modal สำหรับดูรูปแบบเต็ม */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="full">
        <Modal.Content maxWidth="100%" maxHeight="100%" bg="black">
          <Modal.CloseButton />
          <Modal.Body p={0} bg="black">
            <Box flex={1} justifyContent="center" alignItems="center" bg="black">
              {selectedSession && (
                <ScrollView
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Box width="100%" style={{ aspectRatio: 3 / 4 }} overflow="hidden" borderRadius="md">
                    <Image
                      source={{ uri: selectedSession.result_image_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </Box>
                  
                  <Box bg="rgba(0,0,0,0.7)" p={4} mt={4} borderRadius="lg" mx={4}>
                    <Text color="white" fontSize="sm" mb={2}>
                      <Text fontWeight="bold">วันที่:</Text>{' '}
                      {new Date(selectedSession.generated_at).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {selectedSession.model_used && (
                      <Text color="white" fontSize="sm">
                        <Text fontWeight="bold">Model:</Text> {selectedSession.model_used}
                      </Text>
                    )}
                  </Box>

                  {/* ✅ ปุ่มลบใน Modal */}
                  <Button
                    mt={4}
                    bg="red.500"
                    onPress={() => {
                      handleCloseModal();
                      handleDelete(selectedSession);
                    }}
                    leftIcon={<Ionicons name="trash-outline" size={20} color="white" />}
                  >
                    ลบรูปนี้
                  </Button>
                </ScrollView>
              )}
            </Box>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </Box>
  );
};
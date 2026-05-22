// api/chat.tsx - Cursor-based Pagination Client
import { getToken } from '@/utils/secure-store';
import { DOMAIN } from '@/้host';
import axios from 'axios';

const API_BASE = `${DOMAIN}/api/chat`;

// Interfaces
export interface ChatConversation {
  conversation_id: string;
  user_id: string;
  store_id: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  store_name: string | null;
  store_logo_path: string | null;
  user_username: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  messages: ChatMessage[];
  unread_count: number;
}

export interface ChatMessage {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image';
  image_path: string | null;
  is_read: boolean;
  created_at: string;
  sender_username: string | null;
  sender_first_name: string | null;
  sender_last_name: string | null;
}

// API Functions
export const chatAPI = {
  // Create or get conversation with a store
  createOrGetConversation: async (storeId: string): Promise<ChatConversation> => {
    const token = await getToken();
    const response = await axios.post(
      `${API_BASE}/conversations`,
      { store_id: storeId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Get all user's conversations
  getUserConversations: async (skip = 0, limit = 20): Promise<ChatConversation[]> => {
    const token = await getToken();
    const response = await axios.get(`${API_BASE}/conversations/user`, {
      params: { skip, limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Get store's conversations (for seller)
  getStoreConversations: async (
    storeId: string,
    skip = 0,
    limit = 20
  ): Promise<ChatConversation[]> => {
    const token = await getToken();
    const response = await axios.get(`${API_BASE}/conversations/store/${storeId}`, {
      params: { skip, limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // ✅ Get messages with cursor-based pagination
  getConversationMessages: async (
    conversationId: string,
    lastMessageId?: string,
    limit = 20
  ): Promise<ChatMessage[]> => {
    const token = await getToken();
    const params: any = { limit };
    
    // ✅ ส่ง last_message_id เมื่อโหลดเพิ่ม (load more)
    if (lastMessageId) {
      params.last_message_id = lastMessageId;
    }
    
    const response = await axios.get(
      `${API_BASE}/conversations/${conversationId}/messages`,
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Send image message
  sendImageMessage: async (
    conversationId: string,
    imageUri: string
  ): Promise<ChatMessage> => {
    const token = await getToken();
    const formData = new FormData();
    
    // @ts-ignore - React Native FormData supports this
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'chat_image.jpg',
    });

    const response = await axios.post(
      `${API_BASE}/conversations/${conversationId}/messages/image`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Mark conversation as read
  markAsRead: async (conversationId: string): Promise<void> => {
    const token = await getToken();
    await axios.post(
      `${API_BASE}/conversations/${conversationId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};
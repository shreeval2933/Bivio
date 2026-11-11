import { baseApi } from './baseApi';
import type { AppNotification, ChatRoom, ChatMessage } from '@/types';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<AppNotification[], void>({
      query: () => '/notifications',
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),

    markNotificationRead: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),

    markAllRead: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),

    getChatRooms: builder.query<ChatRoom[], void>({
      query: () => '/chat/rooms',
      providesTags: [{ type: 'Chat', id: 'ROOMS' }],
    }),

    getChatMessages: builder.query<ChatMessage[], string>({
      query: (roomId) => `/chat/rooms/${roomId}/messages`,
      providesTags: (_r, _e, roomId) => [{ type: 'Chat', id: roomId }],
    }),

    sendChatMessage: builder.mutation<ChatMessage, { roomId: string; body: string }>({
      query: ({ roomId, ...body }) => ({ url: `/chat/rooms/${roomId}/messages`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { roomId }) => [{ type: 'Chat', id: roomId }],
    }),

    markRoomRead: builder.mutation<{ ok: boolean }, string>({
      query: (roomId) => ({ url: `/chat/rooms/${roomId}/read`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'Chat', id: 'ROOMS' }],
    }),

    deleteNotifications: builder.mutation<{ ok: boolean }, { ids: string[] }>({
      query: (body) => ({ url: '/notifications/delete', method: 'POST', body }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllReadMutation,
  useGetChatRoomsQuery,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useMarkRoomReadMutation,
  useDeleteNotificationsMutation,
} = notificationsApi;

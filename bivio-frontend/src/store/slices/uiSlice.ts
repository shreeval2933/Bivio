import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarOpen: boolean;
  activeModal: string | null;
  activeChatRoomId: string | null;
  notificationDrawerOpen: boolean;
}

const initialState: UiState = {
  sidebarOpen: true,
  activeModal: null,
  activeChatRoomId: null,
  notificationDrawerOpen: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    setActiveChatRoom: (state, action: PayloadAction<string | null>) => {
      state.activeChatRoomId = action.payload;
    },
    toggleNotificationDrawer: (state) => {
      state.notificationDrawerOpen = !state.notificationDrawerOpen;
    },
  },
});

export const {
  toggleSidebar,
  openModal,
  closeModal,
  setActiveChatRoom,
  toggleNotificationDrawer,
} = uiSlice.actions;
export default uiSlice.reducer;

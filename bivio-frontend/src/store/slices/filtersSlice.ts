import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { JobType } from '@/types';

interface FiltersState {
  searchQuery: string;
  jobType: JobType | 'ALL';
  location: string;
  isRemote: boolean;
  minSalary?: number;
}

const initialState: FiltersState = {
  searchQuery: '',
  jobType: 'ALL',
  location: '',
  isRemote: false,
};

export const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setJobTypeFilter: (state, action: PayloadAction<JobType | 'ALL'>) => {
      state.jobType = action.payload;
    },
    setLocationFilter: (state, action: PayloadAction<string>) => {
      state.location = action.payload;
    },
    toggleRemoteFilter: (state) => {
      state.isRemote = !state.isRemote;
    },
    resetFilters: (state) => {
      state.searchQuery = '';
      state.jobType = 'ALL';
      state.location = '';
      state.isRemote = false;
    },
  },
});

export const {
  setSearchQuery,
  setJobTypeFilter,
  setLocationFilter,
  toggleRemoteFilter,
  resetFilters,
} = filtersSlice.actions;
export default filtersSlice.reducer;

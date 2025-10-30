import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: null,
  staff: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, staff } = action.payload;
      state.token = token;
      state.staff = staff;
      state.isAuthenticated = true;
    },
    login: (state, action) => {
      const { token, staff } = action.payload;
      state.token = token;
      state.staff = staff;
      state.isAuthenticated = true;
    },
    updateStaff: (state, action) => {
      state.staff = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.staff = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, login, updateStaff, logout } = authSlice.actions;

export const selectCurrentToken = (state) => state.auth.token;
export const selectCurrentStaff = (state) => state.auth.staff;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

export default authSlice.reducer;

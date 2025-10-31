import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  phone: null,
  customerId: null,
  waiverId: null,
  flowType: null,
  customerData: {
    first_name: '',
    last_name: '',
    email: '',
    dob: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Canada',
    cell_phone: '',
    home_phone: '',
    work_phone: '',
  },
  minors: [],
  signature: null,
  progress: {
    currentStep: 'INITIAL',
    isReturning: false,
    viewMode: false,
    createNewWaiver: false,
    viewCompleted: false,
    hasDataModifications: false,
  },
};

const waiverSessionSlice = createSlice({
  name: 'waiverSession',
  initialState,
  reducers: {
    setPhone: (state, action) => {
      state.phone = action.payload;
    },
    setCustomerId: (state, action) => {
      state.customerId = action.payload;
    },
    setWaiverId: (state, action) => {
      state.waiverId = action.payload;
    },
    setFlowType: (state, action) => {
      state.flowType = action.payload;
    },
    setCustomerData: (state, action) => {
      state.customerData = { ...state.customerData, ...action.payload };
    },
    setMinors: (state, action) => {
      state.minors = action.payload;
    },
    setSignature: (state, action) => {
      state.signature = action.payload;
    },
    setProgress: (state, action) => {
      state.progress = { ...state.progress, ...action.payload };
    },
    setCurrentStep: (state, action) => {
      state.progress.currentStep = action.payload;
    },
    setViewMode: (state, action) => {
      state.progress.viewMode = action.payload;
    },
    clearWaiverSession: () => initialState,
  },
});

export const {
  setPhone,
  setCustomerId,
  setWaiverId,
  setFlowType,
  setCustomerData,
  setMinors,
  setSignature,
  setProgress,
  setCurrentStep,
  setViewMode,
  clearWaiverSession,
} = waiverSessionSlice.actions;

export default waiverSessionSlice.reducer;
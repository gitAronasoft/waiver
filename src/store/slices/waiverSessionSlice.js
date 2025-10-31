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
  signature: {
    signatureImage: null,
    initials: '',
    date: '',
    fullName: '',
    consented: false,
    subscribed: false,
  },
  progress: {
    currentStep: 'INITIAL',
    isReturning: false,
    viewMode: false,
    createNewWaiver: false,
    viewCompleted: false,
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
    addMinor: (state, action) => {
      state.minors.push(action.payload);
    },
    updateMinor: (state, action) => {
      const { index, data } = action.payload;
      if (state.minors[index]) {
        state.minors[index] = { ...state.minors[index], ...data };
      }
    },
    removeMinor: (state, action) => {
      state.minors.splice(action.payload, 1);
    },
    setSignature: (state, action) => {
      state.signature = { ...state.signature, ...action.payload };
    },
    setSignatureImage: (state, action) => {
      state.signature.signatureImage = action.payload;
    },
    setInitials: (state, action) => {
      state.signature.initials = action.payload;
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
    initializeFromExistingCustomer: (state, action) => {
      const { customer, minors } = action.payload;
      state.customerData = customer;
      state.minors = minors || [];
      state.progress.isReturning = true;
    },
  },
});

export const {
  setPhone,
  setCustomerId,
  setWaiverId,
  setFlowType,
  setCustomerData,
  setMinors,
  addMinor,
  updateMinor,
  removeMinor,
  setSignature,
  setSignatureImage,
  setInitials,
  setProgress,
  setCurrentStep,
  setViewMode,
  clearWaiverSession,
  initializeFromExistingCustomer,
} = waiverSessionSlice.actions;

export default waiverSessionSlice.reducer;
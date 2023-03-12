const { createSlice, current } = require("@reduxjs/toolkit");

const initialState = Object.freeze({
  account: {
    uid: null,
    username: "",
    googleEmail: "",
  },
  auth: {
    accessToken: null,
    refreshToken: null,
  },
});

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    setAccount: (state, action) => {
      state.account = { ...current(state).account, ...action.payload };
    },
    setAuth: (state, action) => {
      state.auth = { ...current(state).auth, ...action.payload };
    },
    removeAccount: (state, action) => {
      state.account = initialState.account;
    },
    removeAuth: (state, action) => {
      state.auth = initialState.auth;
    },
  },
});

export const { setAuth, removeAuth, setAccount, removeAccount } = accountSlice.actions;
export const accountAuthSlice = (state) => state.account.auth;
export const accountInfoSlice = (state) => state.account.account;

export default accountSlice.reducer;

import React from "react";
import ReactDOM from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import persistStore from "redux-persist/es/persistStore";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import MainRouter from "routers/MainRouter";
import AxiosMiddleware from "middlewares/axios.middleware";
import rootReducer from "store/rootReducer";
import reportWebVitals from "./reportWebVitals";

// Import styles
import "styles/reset.scss";
import "styles/index.scss";
import Toast from "molecules/Toast";

const store = configureStore({
  reducer: rootReducer,
  middleware: (defaultMiddleware) => defaultMiddleware({ serializableCheck: false }),
});

const persistor = persistStore(store);
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <MainRouter />
      <AxiosMiddleware />
      <Toast.Toaster />
    </PersistGate>
  </Provider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

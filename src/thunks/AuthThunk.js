import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { composeReqUrl, getAppServerEndpoint } from "./ThunkUtil";

const APP_SERVER_ENDPOINT = getAppServerEndpoint();

export const pingTest = createAsyncThunk("ping", async () => {
  const url = composeReqUrl(APP_SERVER_ENDPOINT, "/ping");
  const result = await axios.get(url);
  return result.data;
});

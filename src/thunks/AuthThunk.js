import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import PackageJson from "../../package.json";
import { composeReqUrl } from "./ThunkUtil";

const APP_SERVER_ENDPOINT = PackageJson.config.app_server_endpoint;

export const pingTest = createAsyncThunk("ping", async () => {
  const url = composeReqUrl(APP_SERVER_ENDPOINT, "/ping");
  const result = await axios.get(url);
  return result.data;
});

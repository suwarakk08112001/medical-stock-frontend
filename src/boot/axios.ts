import axios, { type AxiosInstance } from "axios";
import type { App } from "vue";

declare module "vue" {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3007/api/v1",
});
// const api = axios.create({
//     baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/dashboard-google-sheets/api/v1',
//   });

export default ({ app }: { app: App }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
};

export { api };

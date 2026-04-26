import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://michaeledelstone.com",
  build: {
    inlineStylesheets: "never"
  },
  devToolbar: {
    enabled: false
  }
});

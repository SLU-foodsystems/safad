import { createApp } from "vue";
import App from "@/components/App/App.vue";
import PrimeVue from "primevue/config";
import "./styles/main.scss";

const app = createApp(App)

app.use(PrimeVue, {
    unstyled: true
});

app.mount("#app");

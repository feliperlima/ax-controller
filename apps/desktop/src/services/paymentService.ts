export {
  apiCreatePixPayment,
  apiCheckPixStatus,
  type PixCreateResponse,
  type PixStatusResponse,
} from "../lib/pixPaymentApi";

export const PIX_CREATE_PATH = (import.meta.env.VITE_PIX_CREATE_PATH ?? "/api/payment/create-pix.php").trim();
export const PIX_STATUS_PATH = (import.meta.env.VITE_PIX_STATUS_PATH ?? "/api/payment/status.php").trim();

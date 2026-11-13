export { default as SignatureVerifyPage } from "./SignatureVerifyPage";

/** Đường dẫn công khai của trang kiểm tra chữ ký. */
export const VERIFY_PATH = "/verify";
export const isVerifyPath = (pathname) =>
  pathname === VERIFY_PATH || pathname.startsWith(`${VERIFY_PATH}/`);

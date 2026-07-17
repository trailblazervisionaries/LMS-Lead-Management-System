import axios from "axios";

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === "string") {
      return responseData;
    }
    if (responseData && typeof responseData === "object" && "message" in responseData) {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
    }
    if (responseData && typeof responseData === "object" && "detail" in responseData) {
      const detail = (responseData as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        return detail;
      }
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as { msg?: string; loc?: unknown[] };
        const loc = Array.isArray(first.loc) ? first.loc.join(" → ") : "";
        return loc ? `${loc}: ${first.msg ?? "Validation error"}` : (first.msg ?? "Validation error");
      }
    }
  }

  return fallbackMessage;
}

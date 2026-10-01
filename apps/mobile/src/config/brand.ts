import logo from "../../assets/icon.png";
import { officialWordmark } from "./official-wordmark";

/** Tenant-replaceable brand defaults. Keep company identity out of operational screens. */
export const brand = {
  productName: "AMAROK ONE",
  fieldAppName: "ניהול עבודות שטח",
  logo,
  wordmark: officialWordmark,
} as const;

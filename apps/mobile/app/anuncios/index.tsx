import { Redirect } from "expo-router";

/** Lista principal de anúncios fica na tab (menu Anúncios). */
export default function AdsIndexRedirect() {
  return <Redirect href="/produtos" />;
}

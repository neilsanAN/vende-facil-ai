import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { colors } from "@vendefacil/ui-tokens";

/** Redireciona rotas antigas para a tela full-screen em /planos. */
export default function PlansRedirect() {
  useEffect(() => {
    router.replace("/planos");
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}

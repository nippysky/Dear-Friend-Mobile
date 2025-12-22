/* eslint-disable import/no-duplicates */
import "react-native-gesture-handler";
import "react-native-reanimated";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { queryClient } from "../src/lib/queryClient";
import { ThemeProvider } from "../src/theme/ThemeProvider";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

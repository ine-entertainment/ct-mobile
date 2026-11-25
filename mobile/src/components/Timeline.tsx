import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { OrderTimelineStep } from "../types";
import { colors, font, text } from "../theme";

export function Timeline({ steps }: { steps: OrderTimelineStep[] }) {
  return (
    <View style={styles.wrap}>
      {steps.map((step, index) => {
        const done = step.state === "done";
        const current = step.state === "current";
        return (
          <View key={`${step.label}-${index}`} style={styles.row}>
            <View style={styles.dotColumn}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  current && styles.dotCurrent,
                ]}
              />
              {index < steps.length - 1 ? (
                <View style={[styles.line, done && styles.lineDone]} />
              ) : null}
            </View>
            <View style={styles.content}>
              <Text style={[styles.label, current && styles.labelCurrent]}>{step.label}</Text>
              <Text style={styles.time}>{step.time}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 2 },
  row: { flexDirection: "row", gap: 12 },
  dotColumn: { width: 12, alignItems: "center" },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
    marginTop: 3,
  },
  dotDone: { backgroundColor: colors.green, borderColor: colors.green },
  dotCurrent: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
    shadowColor: colors.coral,
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  line: { width: 1, flex: 1, minHeight: 26, backgroundColor: colors.line, marginVertical: 3 },
  lineDone: { backgroundColor: colors.green },
  content: { flex: 1, paddingBottom: 16 },
  label: {
    fontFamily: font.medium,
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.ink2,
  },
  labelCurrent: { color: colors.coral2 },
  time: { ...text.tiny, marginTop: 3, fontSize: 9.5 },
});

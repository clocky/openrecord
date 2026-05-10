import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { getActiveAlerts, dismissAlert, type Alert } from "@/lib/storage/database";

type Props = {
  onDoAlert: (prompt: string) => void;
};

export function AlertsCard({ onDoAlert }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await getActiveAlerts();
    setAlerts(rows);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (alerts.length === 0) return null;

  async function handleIgnore(id: string) {
    await dismissAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function handleDo(alert: Alert) {
    onDoAlert(alert.action_prompt);
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.header}
        accessibilityLabel="Toggle alerts list"
        testID="alerts-toggle"
      >
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{alerts.length}</Text>
          </View>
          <Text style={styles.headerTitle}>
            {alerts.length === 1 ? "1 thing to review" : `${alerts.length} things to review`}
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.list}>
          {alerts.map((a) => (
            <View key={a.id} style={styles.item}>
              <Text style={styles.itemTitle}>{a.title}</Text>
              <Text style={styles.itemDesc}>{a.description}</Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => handleDo(a)}
                  style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
                  testID={`alert-do-${a.id}`}
                >
                  <Text style={styles.btnPrimaryText}>Do</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleIgnore(a.id)}
                  style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.btnPressed]}
                  testID={`alert-ignore-${a.id}`}
                >
                  <Text style={styles.btnSecondaryText}>Ignore</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  chevron: {
    fontSize: 16,
    color: "#666",
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: "#555",
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.6,
  },
  btnPrimary: {
    backgroundColor: "#007AFF",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  btnSecondary: {
    backgroundColor: "#f1f1f1",
  },
  btnSecondaryText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
});

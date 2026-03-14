import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

// ── Constants ─────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

// ── Types ─────────────────────────────────────────────────────
interface RawMessage {
  id:        string;
  sender:    string;
  content:   string;
  aiSummary: string;
  status:    "pending";
}

type HandledStatus = "approved" | "rejected";

interface PendingMessage extends RawMessage {
  /** Animated value controlling opacity + scale (exit animation) */
  anim: Animated.Value;
}

interface HandledMessage extends RawMessage {
  handledStatus: HandledStatus;
  /** Animated value controlling entry (fade + slide from top) */
  enterAnim: Animated.Value;
}

// ── Colour palette ────────────────────────────────────────────
const C = {
  bg:      "#F8F9FC",
  card:    "#FFFFFF",
  border:  "#E5E7EB",
  accent:  "#6366F1",
  purple:  "#8B5CF6",
  green:   "#10B981",
  red:     "#EF4444",
  text1:   "#111827",
  text2:   "#6B7280",
  text3:   "#9CA3AF",
} as const;

// ── Animated message card (pending) ───────────────────────────
function PendingCard({
  msg,
  onApprove,
  onReject,
}: {
  msg:       PendingMessage;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
}) {
  function handleApprove() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.timing(msg.anim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => onApprove(msg.id));
  }

  function handleReject() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.timing(msg.anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(
      () => onReject(msg.id)
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity:   msg.anim,
          transform: [
            {
              scale: msg.anim.interpolate({
                inputRange:  [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        },
      ]}
    >
      {/* Accent left border */}
      <View style={styles.cardAccentBar} />

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>
              {msg.sender.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.senderName}>{msg.sender}</Text>
          <Text style={styles.cardContent} numberOfLines={2}>
            {msg.content}
          </Text>
        </View>

        {/* Status pill */}
        <View style={styles.pendingPill}>
          <Text style={styles.pendingPillText}>pending</Text>
        </View>
      </View>

      {/* AI Summary */}
      <View style={styles.aiSummaryBox}>
        <View style={styles.aiSummaryHeader}>
          <Ionicons name="hardware-chip-outline" size={12} color="#818CF8" />
          <Text style={styles.aiSummaryLabel}>AI Summary</Text>
        </View>
        <Text style={styles.aiSummaryText}>{msg.aiSummary}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [styles.btnBase, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleApprove}
        >
          <LinearGradient
            colors={["#059669", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Ionicons name="checkmark" size={14} color="#fff" />
            <Text style={styles.btnText}>Approve</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnBase, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleReject}
        >
          <LinearGradient
            colors={["#DC2626", "#EF4444"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Ionicons name="close" size={14} color="#fff" />
            <Text style={styles.btnText}>Reject</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Handled card ──────────────────────────────────────────────
function HandledCard({ msg }: { msg: HandledMessage }) {
  const approved = msg.handledStatus === "approved";

  // Animate in on mount
  useEffect(() => {
    Animated.spring(msg.enterAnim, {
      toValue: 1,
      tension: 70,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [msg.enterAnim]);

  return (
    <Animated.View
      style={[
        styles.handledCard,
        {
          opacity:   msg.enterAnim,
          transform: [
            {
              translateY: msg.enterAnim.interpolate({
                inputRange:  [0, 1],
                outputRange: [-16, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.handledLeft}>
        {/* Badge */}
        <View
          style={[
            styles.handledBadge,
            { backgroundColor: approved ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" },
          ]}
        >
          <Ionicons
            name={approved ? "checkmark-circle" : "close-circle"}
            size={14}
            color={approved ? C.green : C.red}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.handledSender}>{msg.sender}</Text>
          <Text style={styles.handledContent} numberOfLines={1}>
            {msg.content}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.handledStatusLabel,
          { color: approved ? C.green : C.red },
        ]}
      >
        {approved ? "Approved" : "Rejected"}
      </Text>
    </Animated.View>
  );
}

// ── Summary skeleton (pulsing row shown while Grok generates) ─
function SummarySkeleton() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.aiSummaryBox}>
      <View style={styles.aiSummaryHeader}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <Ionicons name="hardware-chip-outline" size={12} color="#818CF8" />
        </Animated.View>
        <Text style={styles.aiSummaryLabel}>AI Summary</Text>
      </View>
      {/* Pulsing placeholder text */}
      <Animated.Text
        style={[
          styles.aiSummaryText,
          { fontStyle: "italic", color: "#475569", opacity: pulseAnim },
        ]}
      >
        Generating summary…
      </Animated.Text>
    </View>
  );
}

// ── Full skeleton card shown during initial fetch ─────────────
function SkeletonCard() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const SkeletonBar = ({ w, h = 12 }: { w: number | string; h?: number }) => (
    <Animated.View
      style={{
        width:         w as number,
        height:        h,
        borderRadius:  h / 2,
        backgroundColor: "rgba(255,255,255,0.07)",
        opacity:       pulseAnim,
        marginBottom:  6,
      }}
    />
  );

  return (
    <View style={[styles.card, { marginBottom: 14 }]}>
      <View style={styles.cardAccentBar} />

      {/* Header row */}
      <View style={[styles.cardHeader, { marginBottom: 12 }]}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: "rgba(99,102,241,0.12)", justifyContent: "center", alignItems: "center" },
          ]}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBar w="55%" h={13} />
          <SkeletonBar w="80%" h={11} />
        </View>
      </View>

      {/* Summary skeleton */}
      <SummarySkeleton />
    </View>
  );
}

// ── Empty-state checkmark animation ──────────────────────────
function AllCaughtUp() {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.emptyWrap, { opacity }]}>
      <Animated.View
        style={[
          styles.emptyIconWrap,
          { transform: [{ scale }] },
        ]}
      >
        <LinearGradient
          colors={["#059669", "#10B981"]}
          style={styles.emptyIconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="checkmark" size={40} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.emptyTitle}>All caught up!</Text>
      <Text style={styles.emptySubtitle}>
        No more pending messages to review.
      </Text>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function HomeScreen() {
  const [pending, setPending]   = useState<PendingMessage[]>([]);
  const [handled, setHandled]   = useState<HandledMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);

  // ── Fetch messages ────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/messages`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RawMessage[];
      setPending(
        data.map((m) => ({ ...m, anim: new Animated.Value(1) }))
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // ── Approve ───────────────────────────────────────────────
  function handleApprove(id: string) {
    const msg = pending.find((m) => m.id === id);
    if (!msg) return;
    setPending((p) => p.filter((m) => m.id !== id));
    setHandled((h) => [
      { ...msg, handledStatus: "approved", enterAnim: new Animated.Value(0) },
      ...h,
    ]);
  }

  // ── Reject ────────────────────────────────────────────────
  function handleReject(id: string) {
    setPending((p) => p.filter((m) => m.id !== id));
  }

  const allDone = !loading && !error && pending.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          {/* Logo icon */}
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            style={styles.logoIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="flash" size={18} color="#fff" />
          </LinearGradient>

          <View>
            {/* App name with gradient */}
            <Text style={styles.appName}>NovaMind AI</Text>
            <Text style={styles.appSubtitle}>Message Review Center</Text>
          </View>
        </View>

        {/* ── Divider ────────────────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Loading — skeleton cards while Grok generates ── */}
        {loading && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Pending (…)</Text>
            </View>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        )}

        {/* ── Error ──────────────────────────────────────── */}
        {error && !loading && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color="#FCA5A5" />
            <Text style={styles.errorText}>Failed to load: {error}</Text>
          </View>
        )}

        {/* ── Pending section ────────────────────────────── */}
        {!loading && !error && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>
                Pending ({pending.length})
              </Text>
            </View>

            {allDone ? (
              <AllCaughtUp />
            ) : (
              pending.map((msg) => (
                <PendingCard
                  key={msg.id}
                  msg={msg}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </>
        )}

        {/* ── Handled section ────────────────────────────── */}
        {handled.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 28 }]}>
              <Ionicons name="checkmark-done" size={14} color={C.green} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: C.green }]}>
                Handled ({handled.length})
              </Text>
            </View>

            {handled.map((msg) => (
              <HandledCard key={msg.id} msg={msg} />
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: "100%",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text1,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: C.text3,
    marginTop: 1,
    letterSpacing: 0.2,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 24,
    opacity: 1,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    marginRight: 8,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text2,
    letterSpacing: 0.3,
  },

  // Pending card
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: C.accent,
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingLeft: 10,
  },
  avatarWrap: {
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  senderName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text1,
    marginBottom: 2,
  },
  cardContent: {
    fontSize: 12,
    color: C.text2,
    lineHeight: 17,
  },
  pendingPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#FFFBEB",
  },
  pendingPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // AI summary
  aiSummaryBox: {
    marginTop: 12,
    marginLeft: 10,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  aiSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  aiSummaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366F1",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  aiSummaryText: {
    fontSize: 12,
    color: C.text2,
    lineHeight: 17,
    fontStyle: "italic",
  },

  // Action buttons
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingLeft: 10,
  },
  btnBase: {
    flex: 1,
    borderRadius: 11,
    overflow: "hidden",
  },
  btnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  // Handled card
  handledCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  handledLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  handledBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  handledSender: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text1,
    marginBottom: 1,
  },
  handledContent: {
    fontSize: 11,
    color: C.text3,
    maxWidth: SCREEN_W * 0.5,
  },
  handledStatusLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIconWrap: {
    marginBottom: 20,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text1,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.text3,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 19,
  },

  // States
  centered: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    color: C.text3,
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#EF4444",
    marginBottom: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    flex: 1,
  },
});

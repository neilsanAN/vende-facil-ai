import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function clampFuture(date: Date) {
  const now = new Date();
  return date.getTime() < now.getTime() ? new Date(now.getTime() + 60 * 60 * 1000) : date;
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatScheduleBr(date: Date) {
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const dayMonth = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const prettyWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return {
    headline: `${prettyWeekday}, ${dayMonth}`,
    time,
    compact: `${dayMonth} · ${time}`,
  };
}

type Props = {
  value: Date | null;
  onChange: (next: Date) => void;
};

export function ScheduleCalendarField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const initial = value || clampFuture(new Date(Date.now() + 60 * 60 * 1000));
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [draft, setDraft] = useState(initial);

  const cells = useMemo(() => monthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const today = startOfDay(new Date());
  const formatted = value ? formatScheduleBr(value) : null;
  const draftLabel = formatScheduleBr(draft);

  function openPicker() {
    const next = value || clampFuture(new Date(Date.now() + 60 * 60 * 1000));
    setDraft(next);
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
    setOpen(true);
  }

  function pickDay(day: Date) {
    if (startOfDay(day).getTime() < today.getTime()) return;
    const next = new Date(day);
    next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
    setDraft(clampFuture(next));
  }

  function shiftMonth(delta: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function setHour(hour: number) {
    const next = new Date(draft);
    next.setHours(hour, draft.getMinutes(), 0, 0);
    setDraft(clampFuture(next));
  }

  function setMinute(minute: number) {
    const next = new Date(draft);
    next.setMinutes(minute, 0, 0);
    setDraft(clampFuture(next));
  }

  function confirm() {
    const next = clampFuture(draft);
    onChange(next);
    setOpen(false);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const monthTitle = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <>
      <Pressable
        onPress={openPicker}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="calendar" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "700", letterSpacing: 0.2 }}>
              DATA E HORA (HORÁRIO DE BRASÍLIA)
            </Text>
            <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700", marginTop: 4 }}>
              {formatted ? formatted.headline : "Escolher data e horário"}
            </Text>
            {formatted ? (
              <Text style={{ color: colors.primary, fontSize: fonts.title, fontWeight: "700", marginTop: 2 }}>{formatted.time}</Text>
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", marginTop: 2 }}>
                Toque para abrir o calendário
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(15,12,30,0.45)", justifyContent: "flex-end" }}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingHorizontal: 16,
              paddingBottom: 28,
              maxHeight: "92%",
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: "#D8DBE6" }} />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ color: colors.text, fontSize: fonts.display, fontWeight: "700" }}>Agendar publicação</Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={10}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <View
              style={{
                borderRadius: 14,
                backgroundColor: colors.primarySoft,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 14,
              }}
            >
              <Text style={{ color: colors.primary, fontSize: fonts.caption, fontWeight: "700" }}>SELECIONADO</Text>
              <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700", marginTop: 4 }}>{draftLabel.headline}</Text>
              <Text style={{ color: colors.primary, fontSize: fonts.hero, fontWeight: "700", marginTop: 2 }}>{draftLabel.time}</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Pressable
                onPress={() => shiftMonth(-1)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>
              <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700", textTransform: "capitalize" }}>{monthTitle}</Text>
              <Pressable
                onPress={() => shiftMonth(1)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={{ flex: 1, textAlign: "center", color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "700" }}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
              {cells.map((day, index) => {
                if (!day) {
                  return <View key={`empty-${index}`} style={{ width: "14.28%", aspectRatio: 1 }} />;
                }
                const disabled = startOfDay(day).getTime() < today.getTime();
                const selected = sameDay(day, draft);
                const isToday = sameDay(day, today);
                return (
                  <Pressable
                    key={day.toISOString()}
                    disabled={disabled}
                    onPress={() => pickDay(day)}
                    style={{ width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 }}
                  >
                    <View
                      style={{
                        width: "100%",
                        aspectRatio: 1,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: selected ? colors.primary : isToday ? colors.primarySoft : "transparent",
                        opacity: disabled ? 0.35 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? "#fff" : colors.text,
                          fontSize: fonts.body,
                          fontWeight: selected || isToday ? "700" : "600",
                        }}
                      >
                        {day.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700", marginBottom: 8 }}>Horário</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "700", marginBottom: 6 }}>Hora</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {hours.map((hour) => {
                    const active = draft.getHours() === hour;
                    return (
                      <Pressable
                        key={hour}
                        onPress={() => setHour(hour)}
                        style={{
                          minWidth: 44,
                          height: 40,
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: active ? colors.primary : colors.background,
                          borderWidth: 1,
                          borderColor: active ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{ color: active ? "#fff" : colors.text, fontSize: fonts.body, fontWeight: "700" }}>
                          {String(hour).padStart(2, "0")}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
            <View style={{ marginBottom: 18 }}>
              <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "700", marginBottom: 6 }}>Minuto</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {minutes.map((minute) => {
                  const active = draft.getMinutes() === minute;
                  return (
                    <Pressable
                      key={minute}
                      onPress={() => setMinute(minute)}
                      style={{
                        minWidth: 44,
                        height: 40,
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active ? colors.primary : colors.background,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ color: active ? "#fff" : colors.text, fontSize: fonts.body, fontWeight: "700" }}>
                        {String(minute).padStart(2, "0")}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <Pressable
              onPress={confirm}
              style={{
                height: control.buttonHeight,
                borderRadius: control.radiusButton,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: control.buttonFontSize, fontWeight: "700" }}>Confirmar agendamento</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

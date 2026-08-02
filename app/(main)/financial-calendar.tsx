import { colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { useCurrency } from "@/context/CurrencyContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FinancialCalendarScreen() {
    const router = useRouter();
    const { formatAmount } = useCurrency();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState<any>(null);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    useEffect(() => {
        fetchCalendar();
    }, [monthStr]);

    const fetchCalendar = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/calendar?month=${monthStr}`);
            if (data) setCalendarData(data);
        } catch {
            console.error('Failed to fetch calendar');
        } finally {
            setLoading(false);
        }
    };

    const goToPrevMonth = () => {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() - 1);
        setCurrentDate(d);
        setSelectedDay(null);
    };

    const goToNextMonth = () => {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() + 1);
        setCurrentDate(d);
        setSelectedDay(null);
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

    const renderCalendarGrid = () => {
        const cells = [];
        const summary = calendarData?.summary || {};

        // Empty cells for days before month starts
        for (let i = 0; i < firstDayOfWeek; i++) {
            cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const daySummary = summary[day];
            const isSelected = selectedDay === day;
            const isToday = day === new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear();
            const hasEvents = !!daySummary;

            cells.push(
                <TouchableOpacity
                    key={day}
                    style={[styles.dayCell, isSelected && styles.selectedDay, isToday && styles.todayCell]}
                    onPress={() => setSelectedDay(day === selectedDay ? null : day)}
                >
                    <Text style={[styles.dayNumber, isSelected && styles.selectedDayText, isToday && styles.todayText]}>
                        {day}
                    </Text>
                    {hasEvents && (
                        <View style={styles.dotRow}>
                            {daySummary.expenses > 0 && <View style={[styles.dot, { backgroundColor: colors.danger }]} />}
                            {daySummary.income > 0 && <View style={[styles.dot, { backgroundColor: colors.success }]} />}
                            {daySummary.billsDue > 0 && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
                        </View>
                    )}
                </TouchableOpacity>
            );
        }

        return cells;
    };

    const renderDayEvents = () => {
        if (!selectedDay || !calendarData?.events?.[selectedDay]) return null;

        const events = calendarData.events[selectedDay];

        return (
            <View style={styles.eventsContainer}>
                <Text style={styles.eventsTitle}>
                    {new Date(year, month - 1, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </Text>
                {events.map((event: any, i: number) => (
                    <View key={i} style={styles.eventCard}>
                        <View style={[styles.eventIndicator, {
                            backgroundColor: event.type === 'bill' ? colors.accent
                                : event.type === 'goal_deadline' ? colors.primary
                                : event.subtype === 'income' ? colors.success : colors.danger
                        }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            <Text style={styles.eventType}>
                                {event.type === 'bill' ? (event.isPaid ? 'Bill (Paid)' : 'Bill (Due)')
                                    : event.type === 'goal_deadline' ? 'Goal Deadline'
                                    : event.subtype === 'income' ? 'Income' : 'Expense'}
                            </Text>
                        </View>
                        <Text style={[styles.eventAmount, {
                            color: event.subtype === 'income' ? colors.success : colors.text
                        }]}>
                            {formatAmount(event.amount)}
                        </Text>
                    </View>
                ))}
            </View>
        );
    };

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Financial Calendar</Text>
                </View>

                {/* Month Navigation */}
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.monthName}>{monthName}</Text>
                    <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
                        <Ionicons name="chevron-forward" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.danger }]} /><Text style={styles.legendText}>Expense</Text></View>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>Income</Text></View>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.accent }]} /><Text style={styles.legendText}>Bill</Text></View>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <>
                            {/* Day of week headers */}
                            <View style={styles.weekHeader}>
                                {DAYS_OF_WEEK.map(d => (
                                    <Text key={d} style={styles.weekDay}>{d}</Text>
                                ))}
                            </View>

                            {/* Calendar grid */}
                            <View style={styles.calendarGrid}>
                                {renderCalendarGrid()}
                            </View>

                            {/* Day events */}
                            {renderDayEvents()}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },

    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
    navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
    monthName: { color: colors.text, fontSize: 18, fontWeight: '700' },

    legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendText: { color: colors.textMuted, fontSize: 11 },

    content: { padding: 16, paddingBottom: 40 },

    weekHeader: { flexDirection: 'row', marginBottom: 8 },
    weekDay: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12, fontWeight: '600' },

    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
    dayNumber: { color: colors.text, fontSize: 14, fontWeight: '500' },
    selectedDay: { backgroundColor: colors.primary, borderRadius: 20 },
    selectedDayText: { color: 'white', fontWeight: '700' },
    todayCell: { borderWidth: 1, borderColor: colors.primary, borderRadius: 20 },
    todayText: { color: colors.primary, fontWeight: '700' },
    dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },

    eventsContainer: { marginTop: 20, backgroundColor: colors.glass, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    eventsTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
    eventCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    eventIndicator: { width: 4, height: 32, borderRadius: 2, marginRight: 12 },
    eventTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
    eventType: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    eventAmount: { fontSize: 14, fontWeight: '600' },
});

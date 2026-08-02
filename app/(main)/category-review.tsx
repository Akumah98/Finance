import { colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { localCache } from "@/lib/localCache";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

interface Suggestion {
    _id: string;
    type: string;
    amount: number;
    note: string;
    category: string;
    suggestedCategory: string;
    suggestedNewCategory: string | null;
    date: string;
}

export default function CategoryReviewScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { formatAmount } = useCurrency();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchSuggestions();
    }, []);

    const fetchSuggestions = async () => {
        try {
            const { data } = await api.get('/transactions/suggestions');
            if (data) setSuggestions(data);
        } catch {
            console.error('Failed to fetch suggestions');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchSuggestions();
    };

    const invalidateTransactionCache = async () => {
        const txCacheKey = `transactions_${user?.id || user?._id}`;
        await localCache.invalidate(txCacheKey);
    };

    const handleAccept = async (id: string, useNew: boolean) => {
        setProcessing(id);
        try {
            const { data } = await api.post('/transactions/suggestions/accept', {
                transactionIds: [id],
                useNew
            });
            if (data) {
                setSuggestions(prev => prev.filter(s => s._id !== id));
                await invalidateTransactionCache();
            }
        } catch {
            Alert.alert('Error', 'Failed to accept suggestion');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessing(id);
        try {
            await api.post('/transactions/suggestions/reject', { transactionIds: [id] });
            setSuggestions(prev => prev.filter(s => s._id !== id));
        } catch {
            Alert.alert('Error', 'Failed to reject suggestion');
        } finally {
            setProcessing(null);
        }
    };

    const handleAcceptAll = (useNew: boolean) => {
        Alert.alert(
            'Accept All',
            useNew
                ? 'Accept all new category suggestions? New categories will be created.'
                : 'Accept all existing category suggestions?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept All', onPress: async () => {
                        setProcessing('all');
                        try {
                            const { data } = await api.post('/transactions/suggestions/accept', {
                                all: true,
                                useNew
                            });
                            if (data) {
                                setSuggestions([]);
                                await invalidateTransactionCache();
                                Alert.alert('Done', `Updated ${data.updated} transactions.${data.newCategories?.length > 0 ? ` New categories: ${data.newCategories.join(', ')}` : ''}`);
                            }
                        } catch {
                            Alert.alert('Error', 'Failed to accept suggestions');
                        } finally {
                            setProcessing(null);
                        }
                    }
                }
            ]
        );
    };

    const handleRejectAll = () => {
        Alert.alert('Reject All', 'Dismiss all suggestions?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject All', style: 'destructive', onPress: async () => {
                    setProcessing('all');
                    try {
                        await api.post('/transactions/suggestions/reject', { all: true });
                        setSuggestions([]);
                    } catch {
                        Alert.alert('Error', 'Failed to reject suggestions');
                    } finally {
                        setProcessing(null);
                    }
                }
            }
        ]);
    };

    const renderItem = useCallback(({ item }: { item: Suggestion }) => {
        const isProcessing = processing === item._id;
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.noteText} numberOfLines={2}>{item.note}</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.amountText}>{formatAmount(item.amount)}</Text>
                            <Text style={styles.dateText}>
                                {new Date(item.date).toLocaleDateString()}
                            </Text>
                            <View style={[styles.typeBadge, item.type === 'income' ? styles.incomeBadge : styles.expenseBadge]}>
                                <Text style={styles.typeText}>{item.type}</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleReject(item._id)}
                        disabled={!!processing}
                    >
                        <Ionicons name="close" size={18} color={colors.danger} />
                    </TouchableOpacity>
                </View>

                <View style={styles.suggestionRow}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryLabel}>Current</Text>
                        <Text style={styles.categoryName}>{item.category}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                    <View style={[styles.categoryBadge, styles.suggestedBadge]}>
                        <Text style={styles.categoryLabel}>Suggested</Text>
                        <Text style={styles.suggestedName}>{item.suggestedCategory}</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAccept(item._id, false)}
                        disabled={!!processing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={16} color="white" />
                                <Text style={styles.acceptBtnText}>Use {item.suggestedCategory}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {item.suggestedNewCategory && (
                        <TouchableOpacity
                            style={styles.newCategoryBtn}
                            onPress={() => handleAccept(item._id, true)}
                            disabled={!!processing}
                        >
                            <Ionicons name="add" size={16} color="white" />
                            <Text style={styles.acceptBtnText}>Create {item.suggestedNewCategory}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }, [processing, formatAmount]);

    if (loading) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Category Suggestions</Text>
                    {suggestions.length > 0 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{suggestions.length}</Text>
                        </View>
                    )}
                </View>

                {suggestions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-circle-outline" size={64} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>All caught up!</Text>
                        <Text style={styles.emptySubtitle}>
                            No category suggestions right now. AI checks your transactions every few hours.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.infoText}>
                            AI analyzed your transactions and suggests better categories
                        </Text>

                        <FlatList
                            data={suggestions}
                            renderItem={renderItem}
                            keyExtractor={item => item._id}
                            contentContainerStyle={styles.list}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={colors.primary}
                                />
                            }
                        />

                        <View style={styles.bottomBar}>
                            <TouchableOpacity
                                style={styles.acceptAllBtn}
                                onPress={() => handleAcceptAll(false)}
                                disabled={!!processing}
                            >
                                <Text style={styles.acceptAllText}>Accept All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.rejectAllBtn}
                                onPress={handleRejectAll}
                                disabled={!!processing}
                            >
                                <Text style={styles.rejectAllText}>Reject All</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerTitle: { color: colors.text, fontSize: 22, fontWeight: '700', flex: 1 },
    countBadge: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    countText: { color: 'white', fontSize: 14, fontWeight: '700' },

    infoText: { color: colors.textMuted, fontSize: 14, paddingHorizontal: 20, marginBottom: 12 },

    list: { padding: 20, paddingBottom: 100 },

    card: { backgroundColor: colors.glass, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    noteText: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    amountText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
    dateText: { color: colors.textMuted, fontSize: 12 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    expenseBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
    incomeBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
    typeText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
    rejectBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.15)', justifyContent: 'center', alignItems: 'center' },

    suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10 },
    categoryBadge: { flex: 1 },
    suggestedBadge: { alignItems: 'flex-end' },
    categoryLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
    categoryName: { color: colors.textSecondary, fontSize: 14 },
    suggestedName: { color: colors.accent, fontSize: 14, fontWeight: '600' },

    actionRow: { flexDirection: 'row', gap: 8 },
    acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10 },
    newCategoryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.success, paddingVertical: 10, borderRadius: 10 },
    acceptBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, gap: 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
    acceptAllBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    acceptAllText: { color: 'white', fontSize: 16, fontWeight: '700' },
    rejectAllBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    rejectAllText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
    emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    emptySubtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

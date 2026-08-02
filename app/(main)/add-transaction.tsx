import { colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { localCache } from "@/lib/localCache";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { formatAmount as formatInputAmount, parseAmount } from "@/utils/inputValidation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";



export default function AddTransactionScreen() {
    const router = useRouter();
    const { id, initialType, initialAmount, initialCategory, initialDate, initialNote, deleteGoalId } = useLocalSearchParams();
    const isEditing = !!id;
    const { isOffline, addToQueue } = useOffline();

    const [type, setType] = useState<'expense' | 'income'>((initialType as 'expense' | 'income') || 'expense');
    const [amount, setAmount] = useState(initialAmount ? formatInputAmount(initialAmount as string) : '');
    const [note, setNote] = useState((initialNote as string) || '');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    // category will be set after fetching categories to match the name

    const [date, setDate] = useState(initialDate ? new Date(initialDate as string) : new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const { user, token } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [categories, setCategories] = useState<any[]>([]);
    const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);

    // Voice Input State
    const [isParsingVoice, setIsParsingVoice] = useState(false);

    // Bulk Mode State
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [batchTransactions, setBatchTransactions] = useState<any[]>([]);

    // Force single mode when editing
    useEffect(() => {
        if (isEditing) {
            setMode('single');
        }
    }, [isEditing]);

    // Sync state with params when they change (e.g. navigating from "Edit")
    useEffect(() => {
        if (initialType) setType(initialType as 'expense' | 'income');
        if (initialAmount) setAmount(formatInputAmount(initialAmount as string));
        if (initialDate) setDate(new Date(initialDate as string));
        if (initialNote) setNote(initialNote as string);
    }, [id, initialType, initialAmount, initialDate, initialNote]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categoriesCacheKey = `categories_${user?.id || user?._id || 'guest'}`;
                const cached = await localCache.get<any[]>(categoriesCacheKey);
                if (cached) setCategories(cached);

                const { data } = await api.get('/categories');
                if (data) {
                    setCategories(data);
                    await localCache.set(categoriesCacheKey, data);
                }
            } catch (error) {
                console.error('Failed to fetch categories');
            }
        };

        if (user) fetchCategories();
    }, [user]);

    // Set selected category once categories are loaded and if initialCategory corresponds
    useEffect(() => {
        if (initialCategory && categories.length > 0) {
            const cat = categories.find((c: any) => c.name === initialCategory && c.type === (initialType || 'expense'));
            if (cat) setSelectedCategory(cat._id || cat.id);
        }
    }, [categories, initialCategory, initialType]);

    const handleVoiceInput = () => {
        if (Platform.OS === 'ios') {
            Alert.prompt(
                'Voice Input',
                'Describe your transaction (e.g. "I spent 2000 on lunch at campus")',
                async (transcript) => {
                    if (!transcript || !transcript.trim()) return;
                    await parseVoiceTranscript(transcript);
                },
                'plain-text'
            );
        } else {
            // On Android, parse whatever is currently in the note field
            if (note.trim().length >= 3) {
                parseVoiceTranscript(note);
            } else {
                Alert.alert('Voice Input', 'Type or dictate your transaction in the note field (e.g. "spent 2000 on lunch"), then tap the mic button to auto-fill.');
            }
        }
    };

    const parseVoiceTranscript = async (transcript: string) => {
        setIsParsingVoice(true);
        try {
            const { data } = await api.post('/voice/parse', { transcript });
            if (data) {
                if (data.type) setType(data.type);
                if (data.amount) setAmount(formatInputAmount(String(data.amount)));
                if (data.note) setNote(data.note);
                if (data.date) setDate(new Date(data.date));

                // Try to match category
                if (data.category && categories.length > 0) {
                    const cat = categories.find((c: any) => c.name === data.category && c.type === data.type);
                    if (cat) setSelectedCategory(cat._id || cat.id);
                }
            }
        } catch {
            Alert.alert('Error', 'Could not parse your input. Try again with clearer phrasing.');
        } finally {
            setIsParsingVoice(false);
        }
    };

    const handleSave = async () => {
        if (!amount || !selectedCategory || !note.trim()) {
            Alert.alert('Missing Fields', 'Please enter an amount, select a category, and add a note.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isOffline) {
                if (isEditing) {
                    Alert.alert('Offline Limit', 'You cannot edit transactions while offline.');
                    setIsSubmitting(false);
                    return;
                }

                await addToQueue('ADD_TRANSACTION', {
                    userId: user.id || user._id,
                    type,
                    amount: parseFloat(amount),
                    category: categories.find(c => (c._id || c.id) === selectedCategory)?.name || 'Other',
                    date,
                    note
                });

                Alert.alert('Saved Offline', 'Transaction has been saved locally and will sync when you are online.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAmount('');
                            setNote('');
                            setSelectedCategory(null);
                            setDate(new Date());
                            // Use replace to avoid stacking screens if coming from dashboard
                            router.replace('/(main)/transactions');
                        }
                    }
                ]);
            } else {
                const payload = {
                    type,
                    amount: parseFloat(parseAmount(amount)),
                    category: categories.find(c => (c._id || c.id) === selectedCategory)?.name || 'Other',
                    date,
                    note
                };

                const { data, error } = isEditing
                    ? await api.put(`/transactions/${id}`, payload)
                    : await api.post('/transactions', payload);

                if (error) {
                    throw new Error(error || 'Failed to save transaction');
                }

                // Check if we need to delete a savings goal (used logic)
                if (deleteGoalId) {
                    await api.delete(`/savings-goals/${deleteGoalId}`);
                }

                // Update transactions cache with new/updated data
                const txCacheKey = `transactions_${user?.id || user?._id}`;
                const cachedTransactions = await localCache.get<any[]>(txCacheKey);
                if (cachedTransactions && data) {
                    if (isEditing) {
                        const updated = cachedTransactions.map(t =>
                            (t._id || t.id) === id ? data : t
                        );
                        await localCache.set(txCacheKey, updated);
                    } else {
                        await localCache.set(txCacheKey, [data, ...cachedTransactions]);
                    }
                } else {
                    await localCache.invalidatePrefix('transactions_');
                }
                await localCache.invalidatePrefix('insights_');
                await localCache.invalidatePrefix('healthscore_');

                Alert.alert('Success', `Transaction ${isEditing ? 'updated' : 'saved'} successfully${deleteGoalId ? ' and Goal deleted' : ''}`, [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Reset params to clear form
                            setAmount('');
                            setNote('');
                            setSelectedCategory(null);
                            setDate(new Date());
                            router.replace('/(main)/transactions');
                        }
                    }
                ]);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setIsSubmitting(true);
                    try {
                        const { error: delError } = await api.delete(`/transactions/${id}`);
                        if (!delError) {
                            Alert.alert('Deleted', 'Transaction deleted successfully', [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        router.replace('/(main)/transactions');
                                    }
                                }
                            ]);
                        } else {
                            throw new Error('Failed to delete');
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete transaction');
                    } finally {
                        setIsSubmitting(false);
                    }
                }
            }
        ]);
    };

    const addToBatch = () => {
        if (!amount || !selectedCategory || !note.trim()) {
            Alert.alert('Missing Fields', 'Please enter an amount, select a category, and add a note.');
            return;
        }

        const categoryName = categories.find(c => (c._id || c.id) === selectedCategory)?.name || 'Other';

        const newTransaction = {
            userId: user.id || user._id,
            type,
            amount: parseFloat(parseAmount(amount)),
            category: categoryName,
            date, // Use the global date
            note
        };

        setBatchTransactions([...batchTransactions, newTransaction]);

        // Reset inputs for next entry
        setAmount('');
        setNote('');
        // Keep category? Maybe better to clear.
        setSelectedCategory(null);
    };

    const removeFromBatch = (index: number) => {
        const newBatch = [...batchTransactions];
        newBatch.splice(index, 1);
        setBatchTransactions(newBatch);
    };

    const saveBatch = async () => {
        if (batchTransactions.length === 0) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await api.post('/transactions/bulk', batchTransactions);

            if (error) {
                throw new Error(error || 'Failed to save transactions');
            }

            Alert.alert('Success', `${batchTransactions.length} transactions saved successfully`, [
                {
                    text: 'OK',
                    onPress: () => {
                        setBatchTransactions([]);
                        router.replace('/(main)/transactions');
                    }
                }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onChangeDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        if (Platform.OS !== 'ios') {
            setShowDatePicker(false);
        }
        setDate(currentDate);
    };

    const formatDate = (date: Date) => {
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return `Today, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const categoriesList = categories.filter(cat => cat.type === type);

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={[colors.bg, '#0F172A']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditing ? 'Edit Transaction' : 'New Transaction'}</Text>
                    {isEditing ? (
                        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                            <Ionicons name="trash-outline" size={24} color={colors.danger} />
                        </TouchableOpacity>
                    ) : (
                        !isEditing && (
                            <TouchableOpacity
                                onPress={() => setMode(mode === 'single' ? 'bulk' : 'single')}
                                style={{ padding: 8 }}
                            >
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                    {mode === 'single' ? 'Bulk Mode' : 'Single'}
                                </Text>
                            </TouchableOpacity>
                        )
                    )}
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                        {mode === 'bulk' && (
                            <View>
                                {/* Date Picker for Bulk (Global) */}
                                <View style={[styles.section, { marginBottom: 10 }]}>
                                    <Text style={styles.sectionTitle}>Date (Applies to all)</Text>
                                    <TouchableOpacity style={styles.inputRow} onPress={() => setShowDatePicker(!showDatePicker)}>
                                        <Ionicons name="calendar" size={20} color={colors.textMuted} />
                                        <Text style={styles.inputText}>{formatDate(date)}</Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <View style={Platform.OS === 'ios' ? styles.iosDatePickerContainer : undefined}>
                                            <DateTimePicker
                                                testID="dateTimePicker"
                                                value={date}
                                                mode="date"
                                                is24Hour={true}
                                                onChange={onChangeDate}
                                                display={Platform.OS === 'ios' ? "inline" : "default"}
                                                themeVariant="dark"
                                            />
                                            {Platform.OS === 'ios' && (
                                                <TouchableOpacity
                                                    style={styles.dateDoneBtn}
                                                    onPress={() => setShowDatePicker(false)}
                                                >
                                                    <Text style={styles.dateDoneText}>Done</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {/* Staged Transactions List */}
                                {batchTransactions.length > 0 && (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={[styles.sectionTitle, { marginHorizontal: 20 }]}>Staged ({batchTransactions.length})</Text>
                                        {batchTransactions.map((item, index) => (
                                            <View key={index} style={[styles.batchItem, { borderLeftColor: item.type === 'expense' ? colors.danger : colors.success }]}>
                                                <MaterialCommunityIcons
                                                    name={categories.find(c => c.name === item.category)?.icon || 'shape' as any}
                                                    size={20}
                                                    color={colors.text}
                                                />
                                                <View style={styles.batchItemContent}>
                                                    <Text style={styles.batchItemTitle}>{item.category}</Text>
                                                    <Text style={styles.batchItemSub}>{item.note || 'No note'}</Text>
                                                </View>
                                                <Text style={[styles.batchItemAmount, { color: item.type === 'expense' ? colors.danger : colors.success }]}>
                                                    {item.type === 'income' ? '+' : ''}{item.amount}
                                                </Text>
                                                <TouchableOpacity onPress={() => removeFromBatch(index)} style={styles.batchDeleteBtn}>
                                                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                <Text style={[styles.sectionTitle, { marginHorizontal: 20 }]}>Add New Entry</Text>
                            </View>
                        )}

                        {/* Type Toggle */}
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, type === 'expense' && styles.toggleBtnActive, { backgroundColor: type === 'expense' ? colors.danger : 'transparent' }]}
                                onPress={() => setType('expense')}
                            >
                                <Text style={[styles.toggleText, type === 'expense' && { color: 'white' }]}>Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, type === 'income' && styles.toggleBtnActive, { backgroundColor: type === 'income' ? colors.success : 'transparent' }]}
                                onPress={() => setType('income')}
                            >
                                <Text style={[styles.toggleText, type === 'income' && { color: 'white' }]}>Income</Text>
                            </TouchableOpacity>
                        </View>



                        {/* Category Grid */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Category</Text>
                            <View style={styles.categoryGrid}>
                                {categoriesList.map(cat => (
                                    <TouchableOpacity
                                        key={cat._id || cat.id}
                                        style={[
                                            styles.categoryItem,
                                            selectedCategory === (cat._id || cat.id) && { backgroundColor: type === 'expense' ? colors.danger + '20' : colors.success + '20', borderColor: type === 'expense' ? colors.danger : colors.success }
                                        ]}
                                        onPress={() => setSelectedCategory(cat._id || cat.id)}
                                    >
                                        <MaterialCommunityIcons
                                            name={cat.icon as any || 'shape'}
                                            size={24}
                                            color={selectedCategory === (cat._id || cat.id) ? (type === 'expense' ? colors.danger : colors.success) : colors.textMuted}
                                        />
                                        <Text style={[
                                            styles.categoryName,
                                            selectedCategory === (cat._id || cat.id) && { color: type === 'expense' ? colors.danger : colors.success }
                                        ]}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Details</Text>

                            <View style={styles.inputRow}>
                                <Ionicons name="pricetag-outline" size={20} color={colors.textMuted} />
                                <TextInput
                                    placeholder="Amount"
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.textInput}
                                    value={amount}
                                    onChangeText={(text) => {
                                        setAmount(formatInputAmount(text));
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>

                            {mode === 'single' && (
                                <View>
                                    <TouchableOpacity style={styles.inputRow} onPress={() => setShowDatePicker(!showDatePicker)}>
                                        <Ionicons name="calendar" size={20} color={colors.textMuted} />
                                        <Text style={styles.inputText}>{formatDate(date)}</Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <View style={Platform.OS === 'ios' ? styles.iosDatePickerContainer : undefined}>
                                            <DateTimePicker
                                                testID="dateTimePicker"
                                                value={date}
                                                mode="date"
                                                is24Hour={true}
                                                onChange={onChangeDate}
                                                display={Platform.OS === 'ios' ? "inline" : "default"}
                                                themeVariant="dark"
                                            />
                                            {Platform.OS === 'ios' && (
                                                <TouchableOpacity
                                                    style={styles.dateDoneBtn}
                                                    onPress={() => setShowDatePicker(false)}
                                                >
                                                    <Text style={styles.dateDoneText}>Done</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}
                            <View style={styles.inputRow}>
                                <Ionicons name="create-outline" size={20} color={colors.textMuted} />
                                <TextInput
                                    placeholder="Add a note (required)"
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.textInput}
                                    value={note}
                                    onChangeText={setNote}
                                    onBlur={async () => {
                                        if (note.length >= 3 && !selectedCategory && !isEditing) {
                                            try {
                                                const { data } = await api.post('/transactions/suggest-category', { note });
                                                if (data?.category) {
                                                    const cat = categories.find(c => c.name === data.category && c.type === type);
                                                    if (cat) {
                                                        setSuggestedCategory(data.category);
                                                        setSelectedCategory(cat._id || cat.id);
                                                    }
                                                }
                                            } catch {}
                                        }
                                    }}
                                />
                                <TouchableOpacity
                                    onPress={handleVoiceInput}
                                    style={[styles.voiceBtn, isParsingVoice && styles.voiceBtnActive]}
                                    disabled={isParsingVoice}
                                >
                                    {isParsingVoice ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <Ionicons name="mic" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {suggestedCategory && selectedCategory && (
                                <Text style={{ color: colors.accent, fontSize: 12, marginLeft: 28, marginTop: 4 }}>
                                    Auto-suggested: {suggestedCategory}
                                </Text>
                            )}
                        </View>



                        {/* Submit Button */}
                        {/* Submit Button */}
                        {/* Buttons Container */}
                        <View style={mode === 'bulk' && batchTransactions.length > 0 ? styles.buttonsRow : undefined}>
                            {/* Submit / Add to Batch Button */}
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (mode === 'bulk' && batchTransactions.length > 0) && styles.submitButtonBulk
                                ]}
                                activeOpacity={0.8}
                                onPress={mode === 'bulk' ? addToBatch : handleSave}
                                disabled={isSubmitting}
                            >
                                <LinearGradient
                                    colors={type === 'expense' ? [colors.danger, '#B91C1C'] : [colors.success, '#059669']}
                                    style={styles.submitGradient}
                                >
                                    <Text style={styles.submitText}>
                                        {isSubmitting ? (isEditing ? 'Updating...' : 'Saving...') : (
                                            mode === 'bulk' ? 'Add' : (isEditing ? 'Update Transaction' : 'Save Transaction')
                                        )}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Save Batch Button (Only in Bulk Mode and if items exist) */}
                            {mode === 'bulk' && batchTransactions.length > 0 && (
                                <TouchableOpacity
                                    style={styles.saveAllButton}
                                    activeOpacity={0.8}
                                    onPress={saveBatch}
                                    disabled={isSubmitting}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, '#4F46E5']}
                                        style={styles.saveAllGradient}
                                    >
                                        <Text style={styles.saveAllText}>Save All ({batchTransactions.length})</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </SafeAreaProvider >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },

    toggleContainer: { flexDirection: 'row', backgroundColor: colors.glass, margin: 20, padding: 4, borderRadius: 16 },
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    toggleBtnActive: {},
    toggleText: { color: colors.textMuted, fontWeight: '600' },

    amountDisplay: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
    currencySymbol: { fontSize: 32, fontWeight: '600', marginRight: 4 },
    amountText: { fontSize: 48, fontWeight: '700' },

    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitle: { color: colors.textSecondary, marginBottom: 12, fontWeight: '600' },

    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    categoryItem: {
        width: '23%',
        aspectRatio: 1,
        backgroundColor: colors.glass,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryName: { color: colors.textMuted, fontSize: 10, marginTop: 4, marginBottom: 12, fontWeight: '500', textAlign: 'center' },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.glass,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        gap: 12
    },
    inputText: { color: colors.text, fontSize: 16 },
    textInput: { flex: 1, color: colors.text, fontSize: 16 },
    voiceBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(139, 92, 246, 0.15)', justifyContent: 'center', alignItems: 'center' },
    voiceBtnActive: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },

    keypad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 20 },
    key: { width: '33.33%', height: 60, justifyContent: 'center', alignItems: 'center' },
    keyText: { color: colors.text, fontSize: 24, fontWeight: '600' },

    buttonsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
    submitButton: { marginHorizontal: 20, borderRadius: 28, overflow: 'hidden', height: 56 }, // Original style
    submitButtonBulk: { flex: 1, marginHorizontal: 0 }, // Modified when in row
    submitGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    submitText: { color: 'white', fontSize: 18, fontWeight: '700' },



    iosDatePickerContainer: { backgroundColor: colors.glass, borderRadius: 16, marginBottom: 12, padding: 10, overflow: 'hidden' },
    dateDoneBtn: { alignItems: 'center', padding: 12, backgroundColor: colors.primary, borderRadius: 12, marginTop: 8 },
    dateDoneText: { color: 'white', fontWeight: '700', fontSize: 16 },
    deleteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },

    batchItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.glass, borderRadius: 12, marginBottom: 8, marginHorizontal: 20, borderLeftWidth: 3 },
    batchItemContent: { flex: 1, marginLeft: 12 },
    batchItemTitle: { color: colors.text, fontWeight: '600', fontSize: 14 },
    batchItemSub: { color: colors.textMuted, fontSize: 12 },
    batchItemAmount: { fontWeight: '700', fontSize: 14 },
    batchDeleteBtn: { padding: 8 },

    saveAllButton: { flex: 1, borderRadius: 28, overflow: 'hidden', height: 56 }, // Radius 28, Height 56 to match
    saveAllGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveAllText: { color: 'white', fontSize: 16, fontWeight: '700' },
});

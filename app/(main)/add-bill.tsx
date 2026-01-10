import { colors } from "@/constants/colors";
import { API_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useOffline } from "@/context/OfflineContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function AddBillScreen() {
    const router = useRouter();
    const { user, token } = useAuth();
    const { currency } = useCurrency();
    const { isOffline, addToQueue } = useOffline();
    const { id, initialName, initialAmount, initialFrequency, initialDate, initialCategory } = useLocalSearchParams();
    const isEditing = !!id;

    const [name, setName] = useState((initialName as string) || '');
    const [amount, setAmount] = useState((initialAmount as string) || '');
    const [frequency, setFrequency] = useState((initialFrequency as string) || 'Monthly');
    const [date, setDate] = useState(initialDate ? new Date(initialDate as string) : new Date());
    const [reason, setReason] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(`${API_URL}/categories/${user.id || user._id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (response.ok) {
                    setCategories(data);
                    if (initialCategory) {
                        const cat = data.find((c: any) => c.name === initialCategory && c.type === 'expense');
                        if (cat) setSelectedCategory(cat._id || cat.id);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch categories');
            }
        };
        if (user) fetchCategories();
    }, [user, initialCategory]);

    const handleSave = async () => {
        if (!name || !amount || !selectedCategory) {
            Alert.alert('Missing Fields', 'Please fill in all fields (Name, Amount, Category).');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isOffline) {
                if (isEditing) {
                    Alert.alert('Offline Limit', 'You cannot edit bills while offline.');
                    setIsSubmitting(false);
                    return;
                }

                await addToQueue('ADD_BILL', {
                    userId: user.id || user._id,
                    name,
                    amount: parseFloat(amount),
                    frequency,
                    dueDate: date,
                    category: categories.find(c => (c._id || c.id) === selectedCategory)?.name || 'Other',
                    autoPay: false,
                    reason: undefined
                });

                Alert.alert('Saved Offline', 'Bill has been saved locally and will sync when you are online.', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                const url = isEditing ? `${API_URL}/bills/${id}` : `${API_URL}/bills`;
                const method = isEditing ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userId: user.id || user._id,
                        name,
                        amount: parseFloat(amount),
                        frequency,
                        dueDate: date,
                        category: categories.find(c => (c._id || c.id) === selectedCategory)?.name || 'Other',
                        autoPay: false,
                        reason: isEditing ? reason : undefined
                    }),
                });

                if (response.ok) {
                    Alert.alert('Success', `Bill ${isEditing ? 'updated' : 'added'} successfully`, [
                        { text: 'OK', onPress: () => router.back() }
                    ]);
                } else {
                    throw new Error('Failed to save bill');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Could not save bill');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/bills/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: deleteReason }),
            });
            if (response.ok) {
                Alert.alert('Deleted', 'Bill deleted successfully', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to delete bill');
        } finally {
            setIsSubmitting(false);
            setShowDeleteModal(false);
        }
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const onChangeDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        if (Platform.OS !== 'ios') setShowDatePicker(false);
        setDate(currentDate);
    };

    const expenseCategories = categories.filter(c => c.type === 'expense');

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={[colors.bg, '#0F172A']}
                    style={StyleSheet.absoluteFill}
                />

                <Modal
                    visible={showDeleteModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={20} style={styles.modalContainer}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Delete Bill</Text>
                                <Text style={styles.modalText}>Are you sure you want to delete this bill?</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Reason for deletion (optional)"
                                    placeholderTextColor={colors.textMuted}
                                    value={deleteReason}
                                    onChangeText={setDeleteReason}
                                />
                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowDeleteModal(false)}>
                                        <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalBtnDelete} onPress={confirmDelete}>
                                        <Text style={styles.modalBtnTextDelete}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BlurView>
                    </View>
                </Modal>

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditing ? 'Edit Bill' : 'Add Recurring Bill'}</Text>
                    {isEditing ? (
                        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                            <Ionicons name="trash-outline" size={24} color={colors.danger} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bill Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Netflix, Rent"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Amount</Text>
                            <View style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text style={{ color: colors.textMuted, marginRight: 8 }}>{currency.symbol}</Text>
                                <TextInput
                                    style={{ flex: 1, color: colors.text, fontSize: 16 }}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textMuted}
                                    value={amount}
                                    onChangeText={(text) => {
                                        if (/^\d*\.?\d*$/.test(text)) setAmount(text);
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                {expenseCategories.map(cat => (
                                    <TouchableOpacity
                                        key={cat._id || cat.id}
                                        style={[
                                            styles.catBtn,
                                            selectedCategory === (cat._id || cat.id) && styles.catBtnActive
                                        ]}
                                        onPress={() => setSelectedCategory(cat._id || cat.id)}
                                    >
                                        <MaterialCommunityIcons
                                            name={cat.icon || 'shape'}
                                            size={16}
                                            color={selectedCategory === (cat._id || cat.id) ? 'white' : colors.textMuted}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={[styles.catText, selectedCategory === (cat._id || cat.id) && { color: 'white' }]}>
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {isEditing && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Reason for Change</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Why are you editing this?"
                                    placeholderTextColor={colors.textMuted}
                                    value={reason}
                                    onChangeText={setReason}
                                />
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Frequency</Text>
                            <View style={styles.freqContainer}>
                                {['Weekly', 'Monthly', 'Yearly'].map(freq => (
                                    <TouchableOpacity
                                        key={freq}
                                        style={[styles.freqBtn, frequency === freq && styles.freqBtnActive]}
                                        onPress={() => setFrequency(freq)}
                                    >
                                        <Text style={[styles.freqText, frequency === freq && { color: 'white' }]}>{freq}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Due Date</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(!showDatePicker)}>
                                <Text style={{ color: colors.text }}>
                                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <View style={Platform.OS === 'ios' ? styles.iosDatePickerContainer : undefined}>
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? "inline" : "default"}
                                        onChange={onChangeDate}
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

                        <View style={{ flex: 1 }} />

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSubmitting}>
                            <LinearGradient
                                colors={[colors.gradient1, colors.primary]}
                                style={styles.saveGradient}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.saveText}>{isEditing ? 'Update Bill' : 'Save Bill'}</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    content: { padding: 20, flexGrow: 1 },

    inputGroup: { marginBottom: 24 },
    label: { color: colors.textSecondary, marginBottom: 8, fontWeight: '500' },
    input: { backgroundColor: colors.glass, borderRadius: 16, padding: 16, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border },

    freqContainer: { flexDirection: 'row', gap: 10 },
    freqBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.glass, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    freqBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    freqText: { color: colors.textMuted, fontWeight: '600' },

    catBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border },
    catBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catText: { color: colors.textMuted, fontWeight: '600' },

    iosDatePickerContainer: { backgroundColor: colors.glass, borderRadius: 16, marginTop: 12, padding: 10, overflow: 'hidden' },
    dateDoneBtn: { alignItems: 'center', padding: 12, backgroundColor: colors.primary, borderRadius: 12, marginTop: 8 },
    dateDoneText: { color: 'white', fontWeight: '700', fontSize: 16 },

    saveButton: { borderRadius: 28, overflow: 'hidden', height: 56, marginTop: 20 },
    saveGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveText: { color: 'white', fontSize: 18, fontWeight: '700' },
    deleteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.danger + '50' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContainer: { borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 400 },
    modalContent: { backgroundColor: colors.glass, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
    modalText: { color: colors.textSecondary, marginBottom: 16 },
    modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, color: colors.text, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtnCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.glass, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    modalBtnDelete: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center' },
    modalBtnTextCancel: { color: colors.text, fontWeight: '600' },
    modalBtnTextDelete: { color: 'white', fontWeight: '700' },
});

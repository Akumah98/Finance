import { colors } from "@/constants/colors";
import { API_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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
    View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function AddGoalScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const isEditing = !!params.id;

    const [name, setName] = useState(params.name as string || '');
    const [target, setTarget] = useState(params.targetAmount ? String(params.targetAmount) : '');
    const [icon, setIcon] = useState(params.icon as string || 'star');
    const [date, setDate] = useState(params.deadline ? new Date(params.deadline as string) : new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleSave = async () => {
        if (!name || !target) {
            Alert.alert('Missing Fields', 'Please fill in the goal name and target amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            const url = isEditing ? `${API_URL}/savings-goals/${params.id}` : `${API_URL}/savings-goals`;
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id || user._id,
                    name,
                    targetAmount: parseFloat(target),
                    deadline: date,
                    icon,
                    color: colors.accent // Default color for now
                }),
            });

            if (response.ok) {
                Alert.alert('Success', `Savings goal ${isEditing ? 'updated' : 'created'}!`, [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                throw new Error('Failed to save goal');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not save savings goal');
        } finally {
            setIsSubmitting(false);
        }
    };

    const icons = ['star', 'car', 'home', 'airplane', 'school', 'gift', 'laptop'];

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={[colors.bg, '#0F172A']}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditing ? 'Edit Savings Goal' : 'New Savings Goal'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>

                        {/* Icon Picker */}
                        <View style={styles.iconPicker}>
                            <View style={styles.iconPreview}>
                                <MaterialCommunityIcons name={icon as any} size={40} color={colors.accent} />
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
                                {icons.map(i => (
                                    <TouchableOpacity key={i} onPress={() => setIcon(i)} style={[styles.iconOption, icon === i && styles.iconOptionActive]}>
                                        <MaterialCommunityIcons name={i as any} size={24} color={icon === i ? colors.bg : colors.text} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Goal Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. New Laptop, Vacation"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Target Amount</Text>
                            <View style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text style={{ color: colors.textMuted, marginRight: 8 }}>$</Text>
                                <TextInput
                                    style={{ flex: 1, color: colors.text, fontSize: 16 }}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textMuted}
                                    value={target}
                                    onChangeText={(text) => {
                                        if (/^\d*\.?\d*$/.test(text)) setTarget(text);
                                    }}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Target Date (Optional)</Text>
                            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(!showDatePicker)}>
                                <Text style={{ color: colors.text }}>{formatDate(date)}</Text>
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

                        <View style={{ flex: 1 }} />

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSubmitting}>
                            <LinearGradient
                                colors={[colors.accent, '#D97706']}
                                style={styles.saveGradient}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color={colors.bg} />
                                ) : (
                                    <Text style={styles.saveText}>{isEditing ? 'Update Goal' : 'Create Goal'}</Text>
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

    iconPicker: { alignItems: 'center', marginBottom: 32 },
    iconPreview: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.accent },
    iconOption: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
    iconOptionActive: { backgroundColor: colors.accent },

    inputGroup: { marginBottom: 24 },
    label: { color: colors.textSecondary, marginBottom: 8, fontWeight: '500' },
    input: { backgroundColor: colors.glass, borderRadius: 16, padding: 16, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border },

    saveButton: { borderRadius: 28, overflow: 'hidden', height: 56, marginTop: 20 },
    saveGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveText: { color: colors.bg, fontSize: 18, fontWeight: '700' },

    iosDatePickerContainer: { backgroundColor: colors.glass, borderRadius: 16, marginBottom: 12, padding: 10, overflow: 'hidden', marginTop: 12 },
    dateDoneBtn: { alignItems: 'center', padding: 12, backgroundColor: colors.accent, borderRadius: 12, marginTop: 8 },
    dateDoneText: { color: colors.bg, fontWeight: '700', fontSize: 16 }
});

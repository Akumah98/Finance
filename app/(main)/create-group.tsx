import { colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function CreateGroupScreen() {
    const router = useRouter();
    const [name, setName] = useState('');

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Group</Text>
                    <View style={{ width: 40 }} />
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Group Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Summer Trip, Home Expenses"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Add Members (Optional)</Text>
                            <View style={styles.addMemberRow}>
                                <TouchableOpacity style={styles.addMemberBtn}>
                                    <Ionicons name="person-add" size={20} color={colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.addMemberText}>Invite from Contacts</Text>
                            </View>
                        </View>

                        <View style={{ flex: 1 }} />

                        <TouchableOpacity style={styles.saveButton} onPress={() => router.back()}>
                            <LinearGradient
                                colors={[colors.gradient1, colors.primary]}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveText}>Create Group</Text>
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

    inputGroup: { marginBottom: 32 },
    label: { color: colors.textSecondary, marginBottom: 12, fontWeight: '600' },
    input: { backgroundColor: colors.glass, borderRadius: 16, padding: 16, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border },

    addMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    addMemberBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    addMemberText: { color: colors.textMuted, fontSize: 14 },

    saveButton: { borderRadius: 28, overflow: 'hidden', height: 56, marginTop: 20 },
    saveGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveText: { color: 'white', fontSize: 18, fontWeight: '700' },
});

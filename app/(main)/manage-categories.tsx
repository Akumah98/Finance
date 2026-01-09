import { colors } from "@/constants/colors";
import { API_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function ManageCategoriesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [categories, setCategories] = useState<any[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<'expense' | 'income'>('expense');

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_URL}/categories/${user.id || user._id}`);
            const data = await response.json();
            if (response.ok) {
                setCategories(data);
            }
        } catch (error) {
            console.log('Failed to fetch categories');
        }
    };

    useEffect(() => {
        if (user) fetchCategories();
    }, [user]);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const response = await fetch(`${API_URL}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id || user._id,
                    name: newCategoryName,
                    type: newCategoryType,
                    icon: 'shape', // Default icon
                    color: newCategoryType === 'expense' ? '#EF4444' : '#10B981' // Default colors
                })
            });

            if (response.ok) {
                setNewCategoryName('');
                setModalVisible(false);
                fetchCategories();
            } else {
                Alert.alert('Error', 'Failed to add category');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to add category');
        }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        Alert.alert('Delete Category', `Are you sure you want to delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
                        fetchCategories();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete category');
                    }
                }
            }
        ]);
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Manage Categories</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {categories.length === 0 ? (
                        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 20 }}>No custom categories found.</Text>
                    ) : (
                        categories.map((cat, index) => (
                            <View key={cat._id || cat.id} style={styles.item}>
                                <View style={[styles.iconContainer, { backgroundColor: (cat.color || '#3B82F6') + '20' }]}>
                                    <MaterialCommunityIcons name={cat.icon as any || 'shape'} size={24} color={cat.color || '#3B82F6'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name}>{cat.name}</Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 12, textTransform: 'capitalize' }}>{cat.type}</Text>
                                </View>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteCategory(cat._id || cat.id, cat.name)}>
                                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </ScrollView>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>New Category</Text>

                            <TextInput
                                placeholder="Category Name"
                                placeholderTextColor={colors.textMuted}
                                style={styles.input}
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                            />

                            <View style={styles.typeToggle}>
                                <TouchableOpacity
                                    style={[styles.typeBtn, newCategoryType === 'expense' && styles.typeBtnActive]}
                                    onPress={() => setNewCategoryType('expense')}
                                >
                                    <Text style={[styles.typeText, newCategoryType === 'expense' && { color: 'white' }]}>Expense</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeBtn, newCategoryType === 'income' && styles.typeBtnActive]}
                                    onPress={() => setNewCategoryType('income')}
                                >
                                    <Text style={[styles.typeText, newCategoryType === 'income' && { color: 'white' }]}>Income</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleAddCategory}>
                                    <Text style={styles.saveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
    addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    content: { padding: 20 },

    item: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.glass, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    name: { color: colors.text, fontSize: 16, fontWeight: '600' },
    actionBtn: { padding: 8 },

    modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#1E293B', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: colors.glass, color: 'white', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },

    typeToggle: { flexDirection: 'row', marginBottom: 24, gap: 12 },
    typeBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.textMuted, alignItems: 'center' },
    typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeText: { color: colors.textMuted, fontWeight: '600' },

    modalButtons: { flexDirection: 'row', gap: 16 },
    cancelBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: colors.glass, alignItems: 'center' },
    cancelText: { color: colors.textMuted, fontWeight: '600' },
    saveBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center' },
    saveText: { color: 'white', fontWeight: '700' },
});

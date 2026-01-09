import { colors } from "@/constants/colors";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const mockGroups = [
    { id: '1', name: 'Trip to Bali', members: 4, owe: 0, owed: 150 },
    { id: '2', name: 'House Expenses', members: 3, owe: 45, owed: 0 },
    { id: '3', name: 'Friday Dinner', members: 5, owe: 0, owed: 0 },
];

export default function GroupsScreen() {
    const router = useRouter();

    const renderGroup = ({ item }: { item: any }) => (
        <Link href={{ pathname: '/(main)/group-detail', params: { id: item.id } }} asChild>
            <TouchableOpacity style={styles.card} activeOpacity={0.8}>
                <View style={styles.iconBox}>
                    <FontAwesome5 name="users" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{item.name}</Text>
                    <Text style={styles.members}>{item.members} members</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    {item.owed > 0 && <Text style={{ color: colors.success, fontWeight: '700' }}>Get ${item.owed}</Text>}
                    {item.owe > 0 && <Text style={{ color: colors.danger, fontWeight: '700' }}>Owe ${item.owe}</Text>}
                    {item.owed === 0 && item.owe === 0 && <Text style={{ color: colors.textMuted }}>Settled</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
        </Link>
    );

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Group Wallets</Text>
                    <Link href="/(main)/create-group" asChild>
                        <TouchableOpacity style={styles.addButton}>
                            <Ionicons name="add" size={24} color="white" />
                        </TouchableOpacity>
                    </Link>
                </View>

                <FlatList
                    data={mockGroups}
                    keyExtractor={item => item.id}
                    renderItem={renderGroup}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <View style={styles.summaryContainer}>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryLabel}>You owe</Text>
                                <Text style={[styles.summaryValue, { color: colors.danger }]}>$45.00</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryLabel}>You are owed</Text>
                                <Text style={[styles.summaryValue, { color: colors.success }]}>$150.00</Text>
                            </View>
                        </View>
                    }
                />

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
    list: { padding: 20 },

    summaryContainer: { flexDirection: 'row', backgroundColor: colors.glass, padding: 20, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
    summaryBox: { flex: 1, alignItems: 'center' },
    summaryLabel: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
    summaryValue: { fontSize: 20, fontWeight: '800' },
    divider: { width: 1, backgroundColor: colors.border },

    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    groupName: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
    members: { color: colors.textMuted, fontSize: 12 },
});

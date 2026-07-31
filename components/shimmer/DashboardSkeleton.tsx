import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShimmerBlock } from './ShimmerBlock';

export const DashboardSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Header / Balance Card Skeleton */}
            <View style={styles.card}>
                <ShimmerBlock width={120} height={16} borderRadius={4} style={styles.mb12} />
                <ShimmerBlock width={200} height={36} borderRadius={8} style={styles.mb20} />
                <View style={styles.rowBetween}>
                    <ShimmerBlock width={100} height={20} borderRadius={6} />
                    <ShimmerBlock width={80} height={20} borderRadius={6} />
                </View>
            </View>

            {/* Quick Actions Row Skeleton */}
            <View style={styles.actionsRow}>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.actionItem}>
                        <ShimmerBlock width={54} height={54} borderRadius={27} style={styles.mb8} />
                        <ShimmerBlock width={40} height={12} borderRadius={4} />
                    </View>
                ))}
            </View>

            {/* Health Score Banner Skeleton */}
            <View style={styles.banner}>
                <ShimmerBlock width={50} height={50} borderRadius={25} />
                <View style={styles.bannerText}>
                    <ShimmerBlock width={140} height={16} borderRadius={4} style={styles.mb8} />
                    <ShimmerBlock width={200} height={12} borderRadius={4} />
                </View>
            </View>

            {/* Savings Goals Section Skeleton */}
            <View style={styles.sectionHeader}>
                <ShimmerBlock width={120} height={18} borderRadius={4} />
                <ShimmerBlock width={60} height={14} borderRadius={4} />
            </View>
            <View style={styles.goalsRow}>
                <View style={styles.goalCard}>
                    <ShimmerBlock width={40} height={40} borderRadius={20} style={styles.mb12} />
                    <ShimmerBlock width={100} height={14} borderRadius={4} style={styles.mb8} />
                    <ShimmerBlock width={80} height={18} borderRadius={4} />
                </View>
                <View style={styles.goalCard}>
                    <ShimmerBlock width={40} height={40} borderRadius={20} style={styles.mb12} />
                    <ShimmerBlock width={100} height={14} borderRadius={4} style={styles.mb8} />
                    <ShimmerBlock width={80} height={18} borderRadius={4} />
                </View>
            </View>

            {/* Recent Activity List Skeleton */}
            <View style={styles.sectionHeader}>
                <ShimmerBlock width={140} height={18} borderRadius={4} />
                <ShimmerBlock width={50} height={14} borderRadius={4} />
            </View>
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.txRow}>
                    <ShimmerBlock width={44} height={44} borderRadius={14} />
                    <View style={styles.txDetails}>
                        <ShimmerBlock width={130} height={16} borderRadius={4} style={styles.mb6} />
                        <ShimmerBlock width={90} height={12} borderRadius={4} />
                    </View>
                    <ShimmerBlock width={70} height={18} borderRadius={6} />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    mb6: {
        marginBottom: 6,
    },
    mb8: {
        marginBottom: 8,
    },
    mb12: {
        marginBottom: 12,
    },
    mb20: {
        marginBottom: 20,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    actionItem: {
        alignItems: 'center',
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    bannerText: {
        marginLeft: 16,
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    goalsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    goalCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
    },
    txDetails: {
        marginLeft: 12,
        flex: 1,
    },
});

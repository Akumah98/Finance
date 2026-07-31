import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShimmerBlock } from './ShimmerBlock';

export const BillsSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Overview Card Skeleton */}
            <View style={styles.card}>
                <ShimmerBlock width={120} height={14} borderRadius={4} style={styles.mb8} />
                <ShimmerBlock width={180} height={32} borderRadius={8} style={styles.mb16} />
                <ShimmerBlock width={140} height={14} borderRadius={4} />
            </View>

            {/* Tab Selector Skeleton */}
            <View style={styles.tabsRow}>
                <ShimmerBlock width={100} height={36} borderRadius={18} />
                <ShimmerBlock width={100} height={36} borderRadius={18} />
            </View>

            {/* Bill List Items Skeleton */}
            {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.billRow}>
                    <ShimmerBlock width={44} height={44} borderRadius={14} />
                    <View style={styles.billDetails}>
                        <ShimmerBlock width={130} height={16} borderRadius={4} style={styles.mb6} />
                        <ShimmerBlock width={90} height={12} borderRadius={4} />
                    </View>
                    <View style={styles.billAmountCol}>
                        <ShimmerBlock width={70} height={16} borderRadius={4} style={styles.mb6} />
                        <ShimmerBlock width={50} height={12} borderRadius={4} />
                    </View>
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
    mb6: {
        marginBottom: 6,
    },
    mb8: {
        marginBottom: 8,
    },
    mb16: {
        marginBottom: 16,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    tabsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    billRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
    },
    billDetails: {
        marginLeft: 12,
        flex: 1,
    },
    billAmountCol: {
        alignItems: 'flex-end',
    },
});

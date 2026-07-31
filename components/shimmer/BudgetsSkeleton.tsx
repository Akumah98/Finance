import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShimmerBlock } from './ShimmerBlock';

export const BudgetsSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Overview Budget Card Skeleton */}
            <View style={styles.card}>
                <ShimmerBlock width={140} height={14} borderRadius={4} style={styles.mb8} />
                <ShimmerBlock width={200} height={32} borderRadius={8} style={styles.mb16} />
                <ShimmerBlock width="100%" height={8} borderRadius={4} style={styles.mb8} />
                <View style={styles.rowBetween}>
                    <ShimmerBlock width={80} height={12} borderRadius={4} />
                    <ShimmerBlock width={80} height={12} borderRadius={4} />
                </View>
            </View>

            {/* Budget List Items Skeleton */}
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.budgetItem}>
                    <View style={styles.itemHeader}>
                        <ShimmerBlock width={40} height={40} borderRadius={12} />
                        <View style={styles.itemDetails}>
                            <ShimmerBlock width={120} height={16} borderRadius={4} style={styles.mb6} />
                            <ShimmerBlock width={80} height={12} borderRadius={4} />
                        </View>
                        <ShimmerBlock width={70} height={18} borderRadius={4} />
                    </View>
                    <ShimmerBlock width="100%" height={6} borderRadius={3} style={styles.mt12} />
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
    mt12: {
        marginTop: 12,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    budgetItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemDetails: {
        marginLeft: 12,
        flex: 1,
    },
});

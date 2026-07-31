import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShimmerBlock } from './ShimmerBlock';

export const MoneyPlanSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Income Header Skeleton */}
            <View style={styles.inputCard}>
                <ShimmerBlock width={140} height={14} borderRadius={4} style={styles.mb8} />
                <ShimmerBlock width="100%" height={48} borderRadius={12} />
            </View>

            {/* Rule 50/30/20 Cards Skeleton */}
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.planCard}>
                    <View style={styles.planHeader}>
                        <ShimmerBlock width={100} height={18} borderRadius={4} />
                        <ShimmerBlock width={60} height={18} borderRadius={4} />
                    </View>
                    <ShimmerBlock width="100%" height={8} borderRadius={4} style={styles.my12} />
                    <ShimmerBlock width={140} height={14} borderRadius={4} />
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
    mb8: {
        marginBottom: 8,
    },
    my12: {
        marginVertical: 12,
    },
    inputCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 18,
        padding: 18,
        marginBottom: 20,
    },
    planCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});

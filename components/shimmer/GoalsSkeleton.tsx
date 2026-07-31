import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ShimmerBlock } from './ShimmerBlock';

export const GoalsSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Header Hero Card Skeleton */}
            <View style={styles.heroCard}>
                <ShimmerBlock width={140} height={14} borderRadius={4} style={styles.mb8} />
                <ShimmerBlock width={190} height={30} borderRadius={6} style={styles.mb16} />
                <ShimmerBlock width="100%" height={8} borderRadius={4} />
            </View>

            {/* Goal Cards Skeleton */}
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <ShimmerBlock width={44} height={44} borderRadius={22} />
                        <View style={styles.goalTitleCol}>
                            <ShimmerBlock width={130} height={16} borderRadius={4} style={styles.mb6} />
                            <ShimmerBlock width={90} height={12} borderRadius={4} />
                        </View>
                        <ShimmerBlock width={50} height={20} borderRadius={10} />
                    </View>

                    <ShimmerBlock width="100%" height={8} borderRadius={4} style={styles.my14} />

                    <View style={styles.rowBetween}>
                        <ShimmerBlock width={90} height={14} borderRadius={4} />
                        <ShimmerBlock width={90} height={14} borderRadius={4} />
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
    my14: {
        marginVertical: 14,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    goalCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
    },
    goalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    goalTitleCol: {
        marginLeft: 14,
        flex: 1,
    },
});

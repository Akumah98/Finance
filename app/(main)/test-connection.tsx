import { api, API_URL } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TestConnection() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
    const [message, setMessage] = useState<string>('');

    const checkConnection = async () => {
        setStatus('loading');
        try {
            const data = await api.get('/api/health');
            if (data.status === 'ok') {
                setStatus('connected');
                setMessage(data.message);
            } else {
                setStatus('error');
                setMessage('Invalid response from server');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'Failed to connect to backend');
            console.log(err);
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Backend Connection' }} />

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    {status === 'loading' && <ActivityIndicator size="large" color="#4CAF50" />}
                    {status === 'connected' && <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />}
                    {status === 'error' && <Ionicons name="alert-circle" size={80} color="#F44336" />}
                </View>

                <Text style={styles.title}>
                    {status === 'loading' && 'Checking Connection...'}
                    {status === 'connected' && 'Connected!'}
                    {status === 'error' && 'Connection Failed'}
                </Text>

                <Text style={styles.message}>
                    {message}
                </Text>

                <Text style={styles.url}>
                    Server URL: {API_URL}
                </Text>

                <TouchableOpacity style={styles.button} onPress={checkConnection}>
                    <Text style={styles.buttonText}>Retry Connection</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => router.back()}>
                    <Text style={styles.secondaryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
    },
    url: {
        fontSize: 12,
        color: '#999',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
        maxWidth: 250,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ccc',
        marginTop: 10,
    },
    secondaryButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});

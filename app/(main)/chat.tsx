
import { colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const ChatBubble = React.memo(({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
        <View style={[styles.bubbleContainer, isUser ? styles.rightBubble : styles.leftBubble]}>
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
                <Text style={styles.messageText}>{item.text}</Text>
                <Text style={styles.timeText}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );
});

export default function ChatScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user]);

    const fetchHistory = async () => {
        try {
            const { data, error } = await api.get('/chat');
            if (data) {
                setMessages(data);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }
        } catch (error) {
            console.error('Failed to fetch chat history', error);
        }
    };

    const handleClearChat = () => {
        Alert.alert('Clear Chat', 'Delete all messages?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear', style: 'destructive', onPress: async () => {
                    setIsClearing(true);
                    try {
                        await api.delete('/chat');
                        setMessages([]);
                    } catch {
                        Alert.alert('Error', 'Failed to clear chat');
                    } finally {
                        setIsClearing(false);
                    }
                }
            }
        ]);
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg = { _id: Date.now().toString(), text: inputText, role: 'user', createdAt: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            const { data: aiMsg, error } = await api.post('/chat', { text: userMsg.text });
            if (aiMsg) {
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error) {
            console.error('Failed to send message');
        } finally {
            setIsLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const renderItem = useCallback(
        ({ item }: { item: any }) => <ChatBubble item={item} />,
        []
    );

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={[colors.bg, '#0F172A']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Glitch Assistant</Text>
                        <View style={styles.onlineBadge}>
                            <View style={styles.searchDot} />
                            <Text style={styles.onlineText}>Online</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleClearChat} style={styles.backButton} disabled={isClearing}>
                        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    removeClippedSubviews
                    maxToRenderPerBatch={10}
                    initialNumToRender={20}
                    windowSize={10}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyTitle}>Glitch Assistant</Text>
                            <Text style={styles.emptySubtitle}>
                                Ask me anything about your finances — spending habits, budget tips, savings advice, or what to do with this month's income.
                            </Text>
                        </View>
                    }
                />

                {/* Input Area */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                >
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Ask about your finances..."
                            placeholderTextColor={colors.textMuted}
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Ionicons name="send" size={20} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, justifyContent: 'space-between' },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { alignItems: 'center' },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    searchDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, marginRight: 6 },
    onlineText: { color: colors.textMuted, fontSize: 12 },

    listContent: { padding: 20, paddingBottom: 100 },
    bubbleContainer: { flexDirection: 'row', marginBottom: 16, width: '100%' },
    rightBubble: { justifyContent: 'flex-end' },
    leftBubble: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '80%', padding: 16, borderRadius: 20 },
    userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: 'rgba(255,255,255,0.1)', borderBottomLeftRadius: 4 },
    messageText: { color: colors.text, fontSize: 16, lineHeight: 22 },
    timeText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },

    inputContainer: { flexDirection: 'row', padding: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, color: colors.text, fontSize: 16, marginRight: 12 },
    sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80, gap: 12 },
    emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
    emptySubtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

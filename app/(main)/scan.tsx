import { colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Button, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function ScanScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                if (photo?.uri) {
                    setCapturedImage(photo.uri);
                }
            } catch (error) {
                console.log("Error taking picture:", error);
            }
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
    };

    const handleUsePhoto = () => {
        if (capturedImage) {
            router.push({
                pathname: "/(main)/add-transaction",
                params: { receiptUri: capturedImage }
            });
        }
    };

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ textAlign: 'center', color: 'white', marginBottom: 20 }}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    if (capturedImage) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
                    </View>
                    <View style={styles.previewControls}>
                        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                            <Text style={styles.retakeText}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.useBtn} onPress={handleUsePhoto}>
                            <Text style={styles.useText}>Use Photo</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                {/* Camera View */}
                <View style={styles.cameraContainer}>
                    <CameraView style={styles.camera} facing="back" ref={cameraRef} />

                    {/* Camera Overlay */}
                    <View style={styles.overlayContainer} pointerEvents="none">
                        <View style={styles.overlayCorner} />
                        <View style={[styles.overlayCorner, { top: 40, right: 40, transform: [{ rotate: '90deg' }] }]} />
                        <View style={[styles.overlayCorner, { bottom: 140, left: 40, transform: [{ rotate: '-90deg' }] }]} />
                        <View style={[styles.overlayCorner, { bottom: 140, right: 40, transform: [{ rotate: '180deg' }] }]} />

                        <Text style={styles.instruction}>Align receipt within frame</Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.ctrlBtn} onPress={() => router.back()}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.captureBtn} activeOpacity={0.7} onPress={takePicture}>
                        <View style={styles.captureInner} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.ctrlBtn}>
                        <Ionicons name="flash-off" size={24} color="white" />
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    cameraContainer: { flex: 1, position: 'relative' },
    camera: { flex: 1 },
    overlayContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    overlayCorner: { position: 'absolute', top: 40, left: 40, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: colors.primary, borderRadius: 4 },
    instruction: { color: 'white', marginTop: 300, fontSize: 16, fontWeight: '600', opacity: 0.8 },

    controls: { height: 120, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20 },
    ctrlBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
    captureInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'black', backgroundColor: 'white' },

    previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    previewImage: { width: '100%', height: '80%', borderRadius: 16 },
    previewControls: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, width: '100%' },
    retakeBtn: { padding: 16, backgroundColor: '#333', borderRadius: 12, flex: 1, marginRight: 10, alignItems: 'center' },
    retakeText: { color: 'white', fontWeight: '600', fontSize: 16 },
    useBtn: { padding: 16, backgroundColor: colors.primary, borderRadius: 12, flex: 1, marginLeft: 10, alignItems: 'center' },
    useText: { color: 'white', fontWeight: '600', fontSize: 16 },
});

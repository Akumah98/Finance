import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Saves a CSV text string to a local file and opens the native OS download/share dialog.
 * Works seamlessly on Android, iOS, and Web.
 */
export async function downloadCsvFile(filename: string, csvContent: string): Promise<boolean> {
    try {
        if (Platform.OS === 'web') {
            // Web browser download implementation
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return true;
        } else {
            // Native Mobile (Android & iOS) file save and share implementation
            const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory || FileSystem.bundleDirectory;
            if (!directory) {
                throw new Error('Local file system directory is unavailable');
            }

            const cleanDir = directory.endsWith('/') ? directory : `${directory}/`;
            const fileUri = `${cleanDir}${filename}`;

            // Write CSV content to local device file system
            await FileSystem.writeAsStringAsync(fileUri, csvContent, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            // Check if native system sharing/download dialog is available
            const isSharingAvailable = await Sharing.isAvailableAsync();

            if (isSharingAvailable) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: `Save ${filename}`,
                    UTI: 'public.comma-separated-values-text',
                });
                return true;
            } else {
                Alert.alert('File Saved', `CSV file saved locally at:\n${fileUri}`);
                return true;
            }
        }
    } catch (error: any) {
        console.error('Failed to export CSV file:', error);
        Alert.alert('Export Failed', error.message || 'Could not save file to device');
        return false;
    }
}

import * as ImagePicker from 'expo-image-picker';

/**
 * Picks a cover from the photo library. Covers are square (the project list shows a square thumbnail), so the
 * system editor opens with a square frame the user can zoom and move. Returns the cropped file's temporary URI,
 * or undefined when the user cancels.
 */
export async function pickCover(): Promise<string | undefined> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  return result.canceled ? undefined : result.assets[0].uri;
}

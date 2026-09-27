import 'dart:convert';
import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';

class PickedImage {
  PickedImage(this.bytes, this.dataUrl);
  final Uint8List bytes;
  final String dataUrl;
}

Future<PickedImage?> pickProfileImage() async {
  final file = await ImagePicker().pickImage(
    source: ImageSource.gallery,
    maxWidth: 600,
    maxHeight: 600,
    imageQuality: 85,
  );
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  final name = file.name.toLowerCase();
  final mime = file.mimeType ??
      (name.endsWith('.png')
          ? 'image/png'
          : name.endsWith('.webp')
              ? 'image/webp'
              : name.endsWith('.gif')
                  ? 'image/gif'
                  : 'image/jpeg');
  return PickedImage(bytes, 'data:$mime;base64,${base64Encode(bytes)}');
}

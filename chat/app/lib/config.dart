import 'package:flutter/foundation.dart';

class AppConfig {
  static const _envUrl = String.fromEnvironment('API_URL');

  static String get apiUrl {
    if (_envUrl.isNotEmpty) return _envUrl;
    if (kIsWeb) return Uri.base.origin;
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:4000';
    }
    return 'http://localhost:4000';
  }

  static String? mediaUrl(String? path) {
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http')) return path;
    return '$apiUrl$path';
  }
}

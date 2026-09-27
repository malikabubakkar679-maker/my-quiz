import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../config.dart';
import '../theme.dart';

class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.name,
    this.url,
    this.bytes,
    this.size = 48,
    this.online = false,
    this.showStatus = false,
  });

  final String name;
  final String? url;
  final Uint8List? bytes;
  final double size;
  final bool online;
  final bool showStatus;

  @override
  Widget build(BuildContext context) {
    final resolved = AppConfig.mediaUrl(url);
    final ImageProvider? image = bytes != null
        ? MemoryImage(bytes!)
        : resolved != null
            ? NetworkImage(resolved)
            : null;
    final initials = name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppColors.gradient,
              image: image == null ? null : DecorationImage(image: image, fit: BoxFit.cover),
            ),
            alignment: Alignment.center,
            child: image == null
                ? Text(
                    initials,
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: size * 0.4,
                    ),
                  )
                : null,
          ),
          if (showStatus)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: size * 0.28,
                height: size * 0.28,
                decoration: BoxDecoration(
                  color: online ? AppColors.online : AppColors.textMuted,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.background, width: size * 0.05),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

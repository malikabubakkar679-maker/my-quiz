import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/avatar.dart';
import '../widgets/gradient_button.dart';
import '../widgets/image_pick.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late final _me = context.read<AppState>().me!;
  late final _displayName = TextEditingController(text: _me.displayName);
  late final _bio = TextEditingController(text: _me.bio);
  PickedImage? _avatar;
  bool _saving = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await context.read<AppState>().updateProfile(
            displayName: _displayName.text.trim(),
            bio: _bio.text.trim(),
            avatarDataUrl: _avatar?.dataUrl,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : 'Could not update profile')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _displayName.dispose();
    _bio.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: GestureDetector(
                  onTap: () async {
                    final picked = await pickProfileImage();
                    if (picked != null) setState(() => _avatar = picked);
                  },
                  child: Stack(
                    children: [
                      UserAvatar(
                        name: _me.displayName,
                        url: _me.avatarUrl,
                        bytes: _avatar?.bytes,
                        size: 120,
                      ),
                      Positioned(
                        right: 4,
                        bottom: 4,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            gradient: AppColors.gradient,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.background, width: 3),
                          ),
                          child: const Icon(Icons.camera_alt_rounded, size: 18, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text('@${_me.username}',
                    style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(height: 28),
              TextField(
                controller: _displayName,
                decoration: const InputDecoration(
                  labelText: 'Display name',
                  prefixIcon: Icon(Icons.badge_outlined),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _bio,
                maxLines: 4,
                maxLength: 160,
                decoration: const InputDecoration(labelText: 'Bio', alignLabelWithHint: true),
              ),
              const SizedBox(height: 24),
              GradientButton(label: 'Save changes', loading: _saving, onPressed: _save),
            ],
          ),
        ),
      ),
    );
  }
}

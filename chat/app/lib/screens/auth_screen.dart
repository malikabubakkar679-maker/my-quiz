import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/avatar.dart';
import '../widgets/gradient_button.dart';
import '../widgets/image_pick.dart';
import 'home_screen.dart';
import 'routes.dart';

final _usernamePattern = RegExp(r'^[a-z0-9_.]{3,20}$');

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _signUp = false;

  void _goHome() {
    Navigator.of(context).pushAndRemoveUntil(fadeRoute(const HomeScreen()), (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        gradient: AppColors.gradient,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(Icons.forum_rounded, color: Colors.white, size: 32),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    _signUp ? 'Create your profile' : 'Welcome back',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _signUp
                        ? 'Choose a username, photo and bio to get started'
                        : 'Log in with your username to keep chatting',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 15),
                  ),
                  const SizedBox(height: 28),
                  _ModeSwitch(
                    signUp: _signUp,
                    onChanged: (v) => setState(() => _signUp = v),
                  ),
                  const SizedBox(height: 24),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _signUp
                        ? _SignUpForm(key: const ValueKey('signup'), onDone: _goHome)
                        : _LoginForm(key: const ValueKey('login'), onDone: _goHome),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ModeSwitch extends StatelessWidget {
  const _ModeSwitch({required this.signUp, required this.onChanged});
  final bool signUp;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget tab(String label, bool value) {
      final active = signUp == value;
      return Expanded(
        child: GestureDetector(
          onTap: () => onChanged(value),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: active ? AppColors.gradient : null,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: active ? Colors.white : AppColors.textMuted,
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [tab('Log In', false), tab('Sign Up', true)]),
    );
  }
}

void _showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(error is ApiException ? error.message : 'Something went wrong')),
  );
}

class _LoginForm extends StatefulWidget {
  const _LoginForm({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  State<_LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<_LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _obscure = true;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await context.read<AppState>().login(_username.text.trim().toLowerCase(), _password.text);
      widget.onDone();
    } catch (e) {
      if (mounted) _showError(context, e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _username,
            textInputAction: TextInputAction.next,
            autocorrect: false,
            decoration: const InputDecoration(
              hintText: 'Username',
              prefixIcon: Icon(Icons.alternate_email_rounded),
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Username is required' : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _password,
            obscureText: _obscure,
            onFieldSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              hintText: 'Password',
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              suffixIcon: IconButton(
                icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
            validator: (v) => (v == null || v.isEmpty) ? 'Password is required' : null,
          ),
          const SizedBox(height: 28),
          GradientButton(label: 'Log In', loading: _loading, onPressed: _submit),
        ],
      ),
    );
  }
}

class _SignUpForm extends StatefulWidget {
  const _SignUpForm({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  State<_SignUpForm> createState() => _SignUpFormState();
}

class _SignUpFormState extends State<_SignUpForm> {
  final _formKey = GlobalKey<FormState>();
  final _username = TextEditingController();
  final _displayName = TextEditingController();
  final _bio = TextEditingController();
  final _password = TextEditingController();
  PickedImage? _avatar;
  bool _loading = false;
  bool _obscure = true;
  bool? _available;
  Timer? _debounce;

  void _onUsernameChanged(String value) {
    _debounce?.cancel();
    final username = value.trim().toLowerCase();
    if (!_usernamePattern.hasMatch(username)) {
      setState(() => _available = null);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () async {
      try {
        final ok = await context.read<AppState>().api.usernameAvailable(username);
        if (mounted && _username.text.trim().toLowerCase() == username) {
          setState(() => _available = ok);
        }
      } catch (_) {}
    });
  }

  Future<void> _pickAvatar() async {
    final picked = await pickProfileImage();
    if (picked != null) setState(() => _avatar = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final username = _username.text.trim().toLowerCase();
      await context.read<AppState>().register(
            username: username,
            password: _password.text,
            displayName: _displayName.text.trim().isEmpty ? username : _displayName.text.trim(),
            bio: _bio.text.trim(),
            avatarDataUrl: _avatar?.dataUrl,
          );
      widget.onDone();
    } catch (e) {
      if (mounted) _showError(context, e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _username.dispose();
    _displayName.dispose();
    _bio.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final name = _displayName.text.isNotEmpty ? _displayName.text : _username.text;
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: GestureDetector(
              onTap: _pickAvatar,
              child: Stack(
                children: [
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(shape: BoxShape.circle, gradient: AppColors.gradient),
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.background),
                      child: _avatar == null
                          ? Container(
                              width: 104,
                              height: 104,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.surfaceHigh,
                              ),
                              child: const Icon(Icons.person_rounded, size: 56, color: AppColors.textMuted),
                            )
                          : UserAvatar(name: name, bytes: _avatar!.bytes, size: 104),
                    ),
                  ),
                  Positioned(
                    right: 2,
                    bottom: 2,
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        gradient: AppColors.gradient,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.background, width: 3),
                      ),
                      child: const Icon(Icons.camera_alt_rounded, size: 16, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: _pickAvatar,
              child: Text(_avatar == null ? 'Add profile photo' : 'Change photo'),
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _username,
            autocorrect: false,
            textInputAction: TextInputAction.next,
            onChanged: _onUsernameChanged,
            decoration: InputDecoration(
              hintText: 'Username *',
              prefixIcon: const Icon(Icons.alternate_email_rounded),
              suffixIcon: _available == null
                  ? null
                  : Icon(
                      _available! ? Icons.check_circle_rounded : Icons.cancel_rounded,
                      color: _available! ? AppColors.online : AppColors.danger,
                    ),
              helperText: _available == false ? null : 'Letters, numbers, _ and . (3-20 chars)',
              helperStyle: const TextStyle(color: AppColors.textMuted),
              errorText: _available == false ? 'Username is already taken' : null,
            ),
            validator: (v) {
              final value = (v ?? '').trim().toLowerCase();
              if (value.isEmpty) return 'Username is required';
              if (!_usernamePattern.hasMatch(value)) {
                return 'Use 3-20 letters, numbers, _ or .';
              }
              return null;
            },
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _displayName,
            textInputAction: TextInputAction.next,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              hintText: 'Display name',
              prefixIcon: Icon(Icons.badge_outlined),
            ),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _bio,
            maxLines: 3,
            maxLength: 160,
            decoration: const InputDecoration(
              hintText: 'Bio — tell people about yourself',
              prefixIcon: Padding(
                padding: EdgeInsets.only(bottom: 44),
                child: Icon(Icons.edit_note_rounded),
              ),
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _password,
            obscureText: _obscure,
            onFieldSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              hintText: 'Password *',
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              suffixIcon: IconButton(
                icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
            validator: (v) => (v ?? '').length < 6 ? 'Password must be at least 6 characters' : null,
          ),
          const SizedBox(height: 28),
          GradientButton(label: 'Create Account', loading: _loading, onPressed: _submit),
        ],
      ),
    );
  }
}

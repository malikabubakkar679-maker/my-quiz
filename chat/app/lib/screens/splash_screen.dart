import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/app_state.dart';
import '../theme.dart';
import 'auth_screen.dart';
import 'home_screen.dart';
import 'onboarding_screen.dart';
import 'routes.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..forward();

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final state = context.read<AppState>();
    await Future.wait([
      state.init(),
      Future<void>.delayed(const Duration(milliseconds: 2200)),
    ]);
    if (!mounted) return;
    final Widget next = !state.onboardingDone
        ? const OnboardingScreen()
        : state.isLoggedIn
            ? const HomeScreen()
            : const AuthScreen();
    Navigator.of(context).pushReplacement(fadeRoute(next));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scale = CurvedAnimation(parent: _controller, curve: Curves.elasticOut);
    final fade = CurvedAnimation(parent: _controller, curve: const Interval(0.3, 1, curve: Curves.easeIn));
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.2),
            radius: 1.1,
            colors: [Color(0xFF1B1840), AppColors.background],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ScaleTransition(
                scale: scale,
                child: Container(
                  width: 112,
                  height: 112,
                  decoration: BoxDecoration(
                    gradient: AppColors.gradient,
                    borderRadius: BorderRadius.circular(34),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.5),
                        blurRadius: 40,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.forum_rounded, color: Colors.white, size: 56),
                ),
              ),
              const SizedBox(height: 28),
              FadeTransition(
                opacity: fade,
                child: const Column(
                  children: [
                    Text(
                      'NightChat',
                      style: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Conversations after dark',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 15),
                    ),
                    SizedBox(height: 48),
                    SizedBox(
                      width: 26,
                      height: 26,
                      child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.primary),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

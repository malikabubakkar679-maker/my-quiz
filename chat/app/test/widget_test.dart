import 'package:flutter_test/flutter_test.dart';
import 'package:nightchat/main.dart';
import 'package:nightchat/state/app_state.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('splash leads to onboarding on first launch', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(
      ChangeNotifierProvider(create: (_) => AppState(), child: const NightChatApp()),
    );
    expect(find.text('NightChat'), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Chat in real time'), findsOneWidget);
    expect(find.text('Next'), findsOneWidget);
  });
}

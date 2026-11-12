import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:fakegrab_mobile/main.dart';

void main() {
  testWidgets('FakeGrab login screen renders', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionProvider.overrideWith((ref) => SessionController()..logout()),
        ],
        child: const FakeGrabApp(),
      ),
    );

    expect(find.text('Secure access'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
